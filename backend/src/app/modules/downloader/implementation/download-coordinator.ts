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

export class DownloadCoordinator<T> implements DownloadCoordinatorInterface {
  private isRunning = false;
  private isPaused = false;

  constructor(
    private readonly options: DownloaderOptions<T>,
    private readonly ranges: Ranges,
    private readonly workerManager: WorkerManager,
    private readonly fileManager: FileManager,
    private readonly networkManager: NetworkManager,
    private readonly progressTracker: ProgressTracker
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Download already in progress');
    }

    this.isRunning = true;
    this.isPaused = false;
    this.progressTracker.setStartTime(new Date());

    const fileHandle = await this.fileManager.openFileForWriting();
    try {
      while (this.isRunning && !this.isComplete()) {
        if (this.isPaused) break;

        await this.handleNetworkStatus();
        await this.manageWorkers(fileHandle);
        await waitFor({ sec: 0.1 });
      }

      if (this.isRunning && this.isComplete()) {
        await this.options.completedCallback?.(this);
      }
    } catch (error) {
      if (error instanceof Error) {
        await this.options.errorCallback?.(this, error);
      }
      throw error;
    } finally {
      await fileHandle.close();
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

      this.downloadRange(range, fileHandle, worker.id)
        .then(() => {
          this.ranges.markAs(range.start, range.end, FragmentStatus.finished);
          this.workerManager.removeWorker(worker.id);
        })
        .catch((error) => {
          this.ranges.markAs(range.start, range.end, FragmentStatus.pending);
          this.workerManager.removeWorker(worker.id);
          console.error(`Worker ${worker.id} failed:`, error);
        });
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

    if (this.progressTracker.shouldUpdateProgress() && this.options.progressCallback) {
      const progress = this.progressTracker.getProgress(this.ranges, this.workerManager.getWorkerStats());
      this.options.progressCallback(
        this,
        progress,
        this.progressTracker.getBytesSinceLastProgress()
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
    return this.options.sourceObject;
  }

  get saveAs(): string {
    return this.options.saveAs;
  }

  get url(): string {
    return this.options.url;
  }

  getProgress(): DownloadProgress {
    return this.progressTracker.getProgress(this.ranges, this.workerManager.getWorkerStats());
  }
}
