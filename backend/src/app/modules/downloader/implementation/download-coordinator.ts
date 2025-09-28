import { Fragment, Ranges } from './ranges';
import { FragmentStatus } from '../dtos';
import { DownloadCoordinatorInterface, DownloaderOptions, DownloadProgress } from './downloader.interface'
import { WorkerManager } from './worker-manager';
import { FileManager } from './file-manager';
import { NetworkManager } from './network-manager';
import { ProgressTracker } from './progress-tracker';
import { waitFor } from '../../../helpers/promises.helper';
import { AxiosError } from 'axios';
import { FileHandle } from 'fs/promises';
import { EventEmitter2 } from 'eventemitter2';
import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  DownloadEventType,
  DownloadStartedEvent,
  DownloadProgressEvent,
  DownloadCompletedEvent,
  DownloadErrorEvent,
  WorkerStartedEvent,
  WorkerCompletedEvent,
  WorkerFailedEvent
} from '../events/download.events';
import { NetworkError, WorkerError, ValidationError } from '../errors/download.errors';

export class DownloadCoordinator<T> extends EventEmitter2 implements DownloadCoordinatorInterface {
  private readonly instanceId: string = uuidv4();
  private readonly logger: Logger;
  private options?: DownloaderOptions<T>;
  private ranges?: Ranges;
  private isRunning = false;
  private isPaused = false;
  private readonly activePromises = new Set<Promise<void>>();
  private startTime?: Date;
  private disposed = false;

  constructor(
    private readonly workerManager: WorkerManager,
    private readonly fileManager: FileManager,
    private readonly networkManager: NetworkManager,
    private readonly progressTracker: ProgressTracker
  ) {
    super();
    this.logger = new Logger(`DownloadCoordinator:${this.instanceId.substring(0, 8)}`);
  }

  /**
   * Configure the coordinator with download options and ranges
   */
  configure(options: DownloaderOptions<T>, ranges: Ranges): void {
    if (this.disposed) {
      throw new Error('Cannot configure disposed DownloadCoordinator');
    }

    this.options = options;
    this.ranges = ranges;
    this.logger.log(`Configured downloader instance for ${options.url}`);
  }

  async start(): Promise<void> {
    if (!this.options || !this.ranges) {
      throw new Error('DownloadCoordinator not configured. Call configure() first.');
    }
    if (this.disposed) {
      throw new ValidationError('Cannot start disposed downloader', 'state', 'disposed', this.instanceId);
    }
    if (this.isRunning) {
      throw new ValidationError('Download already in progress', 'state', 'running', this.instanceId);
    }

    this.isRunning = true;
    this.isPaused = false;
    this.startTime = new Date();
    this.progressTracker.setStartTime(this.startTime);

    this.logger.log(`Starting download: ${this.options.url} -> ${this.options.saveAs}`);
    this.emitEvent(DownloadEventType.STARTED, {
      instanceId: this.instanceId,
      url: this.options.url,
      saveAs: this.options.saveAs,
      totalBytes: this.options.fileSize,
      workersCount: this.options.workersCount ?? 2,
      timestamp: this.startTime
    } as DownloadStartedEvent);

    const fileHandle = await this.fileManager.openFileForWriting();
    try {
      while (this.isRunning && !this.isComplete()) {
        if (this.isPaused) break;

        await this.handleNetworkStatus();
        await this.manageWorkers(fileHandle);

        // Event-driven approach: wait for worker events instead of polling
        if (this.activePromises.size > 0) {
          await Promise.race(this.activePromises);
        } else {
          // Only poll if no workers are active
          await waitFor({ sec: 0.5 });
        }
      }

      if (this.isRunning && this.isComplete()) {
        const duration = Date.now() - this.startTime!.getTime();
        const totalBytes = this.getTotalBytes();
        const averageSpeed = totalBytes / (duration / 1000);

        this.logger.log(`Download completed: ${this.options.url} (${totalBytes} bytes in ${duration}ms)`);

        this.emitEvent(DownloadEventType.COMPLETED, {
          instanceId: this.instanceId,
          url: this.options.url,
          saveAs: this.options.saveAs,
          totalBytes,
          duration,
          averageSpeed,
          timestamp: new Date()
        } as DownloadCompletedEvent);

        await this.options.completedCallback?.(this);
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      this.logger.error(`Download failed: ${errorObj.message}`, errorObj.stack);

      this.emitEvent(DownloadEventType.ERROR, {
        instanceId: this.instanceId,
        error: errorObj,
        errorType: this.getErrorType(errorObj),
        retryable: this.isRetryableError(errorObj),
        timestamp: new Date()
      } as DownloadErrorEvent);

      await this.options.errorCallback?.(this, errorObj);
      throw errorObj;
    } finally {
      await fileHandle.close();
      await this.cleanup();
    }
  }

  private async handleNetworkStatus(): Promise<void> {
    if (this.workerManager.activeWorkers.size > 0) {
      if (this.shouldRestartWorkers()) {
        await this.workerManager.restart();
        this.ranges.changeAll(FragmentStatus.reserved, FragmentStatus.pending);
      }
    } else if (!await this.networkManager.checkConnectivity()) {
      await waitFor({ sec: 5 });
    }
  }

  private async manageWorkers(fileHandle: FileHandle): Promise<void> {
    const maxWorkers = this.options.workersCount ?? 2;

    while (this.workerManager.activeWorkers.size < maxWorkers) {
      const range = this.ranges.findSequenceOfAtLeast(this.options.chunkSize ?? 1024 * 1024 * 10, FragmentStatus.pending);
      if (!range) break;

      const worker = this.workerManager.createWorker();
      this.ranges.markAs(range.start, range.end, FragmentStatus.reserved);

      this.logger.debug(`Worker ${worker.id} starting range ${range.start}-${range.end}`);

      this.emitEvent(DownloadEventType.WORKER_STARTED, {
        instanceId: this.instanceId,
        workerId: worker.id,
        range: { start: range.start, end: range.end },
        timestamp: new Date()
      } as WorkerStartedEvent);

      // Create promise and add to active set for proper cleanup
      const downloadPromise = this.downloadRange(range, fileHandle, worker.id)
        .then(() => {
          const workerStats = this.workerManager.getWorker(worker.id);
          const duration = workerStats ? Date.now() - workerStats.startTime : 0;
          const averageSpeed = workerStats ? workerStats.bytesDownloaded / (duration / 1000) : 0;

          this.ranges.markAs(range.start, range.end, FragmentStatus.finished);
          this.workerManager.removeWorker(worker.id);

          this.logger.debug(`Worker ${worker.id} completed range ${range.start}-${range.end}`);

          this.emitEvent(DownloadEventType.WORKER_COMPLETED, {
            instanceId: this.instanceId,
            workerId: worker.id,
            bytesDownloaded: workerStats?.bytesDownloaded || 0,
            duration,
            averageSpeed,
            timestamp: new Date()
          } as WorkerCompletedEvent);
        })
        .catch((error) => {
          const errorObj = error instanceof Error ? error : new Error(String(error));

          this.ranges.markAs(range.start, range.end, FragmentStatus.pending);
          this.workerManager.removeWorker(worker.id);

          this.logger.warn(`Worker ${worker.id} failed: ${errorObj.message}`);

          this.emitEvent(DownloadEventType.WORKER_FAILED, {
            instanceId: this.instanceId,
            workerId: worker.id,
            error: errorObj,
            retryCount: this.workerManager.getWorker(worker.id)?.retryCount || 0,
            willRetry: this.isRetryableError(errorObj),
            timestamp: new Date()
          } as WorkerFailedEvent);

          this.options.errorCallback?.(this, new WorkerError(
            `Worker ${worker.id} failed: ${errorObj.message}`,
            worker.id,
            0,
            this.instanceId,
            errorObj
          ));
        })
        .finally(() => {
          // Clean up promise from active set
          this.activePromises.delete(downloadPromise);
        });

      this.activePromises.add(downloadPromise);
    }
  }

  private async downloadRange(range: Fragment, fileHandle: FileHandle, workerId: string): Promise<void> {
    const worker = this.workerManager.getWorker(workerId);
    if (!worker) throw new Error(`Worker ${workerId} not found`);

    while (this.isRunning && !this.isPaused) {
      try {
        await this.networkManager.downloadRange(
          range,
          this.options.url,
          fileHandle,
          this.workerManager.signal,
          (bytes: number) => this.handleProgress(bytes, workerId)
        );
        return;
      } catch (error) {
        // Handle abort errors - don't retry, just throw to remove worker
        if (error instanceof AxiosError && error.code === 'ERR_CANCELED') {
          throw error;
        }
        
        if (!this.isRunning || this.isPaused) throw error;

        worker.retryCount++;
        if (worker.retryCount > (this.options.maxRetries ?? 10)) {
          throw new Error(`Max retries (${this.options.maxRetries ?? 10}) exceeded for range ${range.start}-${range.end}`);
        }

        const isNetworkError = error instanceof AxiosError &&
          (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED' ||
            error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND');

        if (isNetworkError) {
          while (this.isRunning && !this.isPaused) {
            if (await this.networkManager.checkConnectivity()) break;
            await waitFor({ sec: 5 });
          }
        }

        const retryDelay = this.networkManager.calculateRetryDelay(
          worker.retryCount,
          this.options.initialRetryDelay ?? 1000,
          this.options.maxRetryDelay ?? 30000
        );
        worker.nextRetryTime = Date.now() + retryDelay;
        await waitFor({ sec: retryDelay / 1000 });
      }
    }
  }

  private handleProgress(bytes: number, workerId: string): void {
    this.workerManager.updateWorkerStats(workerId, bytes);
    this.progressTracker.update(bytes);

    if (this.progressTracker.shouldUpdateProgress()) {
      const progress = this.progressTracker.getProgress(this.ranges, this.workerManager.getWorkerStats());
      const bytesSinceLastUpdate = this.progressTracker.getBytesSinceLastProgress();

      // Emit progress event
      this.emitEvent(DownloadEventType.PROGRESS, {
        ...progress,
        instanceId: this.instanceId,
        bytesSinceLastUpdate
      } as DownloadProgressEvent);

      // Call callback for backward compatibility
      this.options.progressCallback?.(
        this,
        progress,
        bytesSinceLastUpdate
      );
    }
  }

  private shouldRestartWorkers(): boolean {
    return this.options.autoRestartCallback?.(this) ?? false;
  }

  private isComplete(): boolean {
    return this.ranges.count(FragmentStatus.finished) === this.getTotalBytes();
  }

  private getTotalBytes(): number {
    return this.ranges.count(FragmentStatus.finished) +
      this.ranges.count(FragmentStatus.pending) +
      this.ranges.count(FragmentStatus.reserved);
  }

  async pause(): Promise<Ranges> {
    this.isPaused = true;
    await this.workerManager.restart();
    this.progressTracker.resetSpeedTracker();

    if (this.options.progressCallback) {
      await this.options.progressCallback(
        this,
        this.progressTracker.getProgress(this.ranges, this.workerManager.getWorkerStats()),
        this.progressTracker.getBytesSinceLastProgress()
      );
    }

    return this.ranges;
  }

  async cancel(): Promise<void> {
    this.isRunning = false;
    await this.workerManager.restart();
    this.progressTracker.resetSpeedTracker();

    if (this.options.progressCallback) {
      await this.options.progressCallback(
        this,
        this.progressTracker.getProgress(this.ranges, this.workerManager.getWorkerStats()),
        this.progressTracker.getBytesSinceLastProgress()
      );
    }
  }

  get sourceObject(): T {
    if (!this.options) throw new Error('DownloadCoordinator not configured');
    return this.options.sourceObject;
  }

  get saveAs(): string {
    if (!this.options) throw new Error('DownloadCoordinator not configured');
    return this.options.saveAs;
  }

  get url(): string {
    if (!this.options) throw new Error('DownloadCoordinator not configured');
    return this.options.url;
  }

  getProgress(): DownloadProgress {
    if (!this.ranges) throw new Error('DownloadCoordinator not configured');
    return this.progressTracker.getProgress(this.ranges, this.workerManager.getWorkerStats());
  }

  /**
   * Emit events (will be forwarded globally by the factory)
   */
  private emitEvent(eventType: string, data: any): void {
    // Emit on instance - factory will handle global forwarding
    this.emit(eventType, data);
  }

  /**
   * Determine error type for categorization
   */
  private getErrorType(error: Error): 'network' | 'filesystem' | 'validation' | 'unknown' {
    if (error instanceof NetworkError) return 'network';
    if (error instanceof ValidationError) return 'validation';
    if (error instanceof AxiosError) return 'network';
    if (error.message.includes('ENOENT') || error.message.includes('EACCES')) return 'filesystem';
    return 'unknown';
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    if (error instanceof NetworkError) return error.retryable;
    if (error instanceof ValidationError) return false;
    if (error instanceof AxiosError) {
      return error.code === 'ECONNRESET' ||
             error.code === 'ECONNABORTED' ||
             error.code === 'ETIMEDOUT' ||
             error.code === 'ENOTFOUND';
    }
    return false;
  }

  /**
   * Clean up resources when download completes or fails
   */
  private async cleanup(): Promise<void> {
    // Wait for all active promises to complete
    if (this.activePromises.size > 0) {
      this.logger.debug(`Waiting for ${this.activePromises.size} active workers to complete`);
      await Promise.allSettled(this.activePromises);
    }
    this.activePromises.clear();
  }

  /**
   * Dispose of this coordinator instance
   */
  async dispose(): Promise<void> {
    if (this.disposed) return;

    this.logger.log('Disposing downloader instance');
    this.isRunning = false;
    this.disposed = true;

    await this.workerManager.restart();
    await this.cleanup();

    this.removeAllListeners();
  }

  get id(): string {
    return this.instanceId;
  }
}
