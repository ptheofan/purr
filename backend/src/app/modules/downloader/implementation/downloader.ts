import axios, { AxiosError } from 'axios';
import { createWriteStream } from 'fs';
import { open } from 'fs/promises';
import { Fragment, Ranges } from './ranges'
import { SpeedTracker } from '../../../stats';
import { FragmentStatus } from '../dtos'
import { DownloaderOptions, DownloadProgress } from './downloader.interface'
import { waitFor } from '../../../helpers/promises.helper'
import * as path from 'path';
import fsp from 'node:fs/promises';

// Used internally by the implementation to track workers performance
// Do not move to the interface, it's only for internal use by this
// specific implementation
interface WorkerStats {
  id: string;
  bytesDownloaded: number;
  startTime: number;
  lastUpdate: number;
  speed: number;
  retryCount: number;
  nextRetryTime?: number;
}

export class Downloader<T> {
  private static workerCounter = 0;
  private bytesSinceLastProgress = 0;
  private ranges: Ranges;
  private speedTracker: SpeedTracker;
  private workerSpeedTrackers = new Map<string, SpeedTracker>();
  private isDownloading = false;
  private isPaused = false;
  private activeWorkers = new Map<string, WorkerStats>();
  private abortController = new AbortController();
  private workersRestartedAt?: Date;
  private startedAt?: Date;
  private lastProgressUpdate = Date.now();

  constructor(private readonly options: DownloaderOptions<T>) {
    // Set defaults
    this.options.chunkSize = options.chunkSize || 1024 * 1024 * 10; // 10MB
    this.options.workersCount = options.workersCount || 2;
    this.options.minSpeedThreshold = options.minSpeedThreshold || 1024 * 10; // 10KB/s
    this.options.speedCheckInterval = options.speedCheckInterval || 10000; // 10s
    this.options.speedCheckDuration = options.speedCheckDuration || 5000; // 5s
    this.options.maxRetries = options.maxRetries ?? 10;
    this.options.initialRetryDelay = options.initialRetryDelay ?? 1000;
    this.options.maxRetryDelay = options.maxRetryDelay ?? 30000;
    this.options.networkCheckUrl = options.networkCheckUrl ?? 'https://1.1.1.1';

    // Initialize speed tracker with initial bytes if resuming
    const downloadedBytes = options.initialRanges?.count(FragmentStatus.finished) || 0;
    this.speedTracker = new SpeedTracker(downloadedBytes, true);

    // Initialize ranges if provided (for resume)
    if (options.initialRanges) {
      this.ranges = options.initialRanges;
      // Ensure no ranges are left in 'reserved' state
      this.ranges.changeAll(FragmentStatus.reserved, FragmentStatus.pending);
    }
  }

  async start(): Promise<void> {
    if (this.isDownloading) {
      throw new Error('Download already in progress');
    }

    // Only query file size if we don't have ranges yet (fresh start)
    if (!this.ranges) {
      const size = this.options.fileSize || await this.getFileSize();
      this.ranges = new Ranges(size);
    }

    // For fresh downloads, initialize the target file
    if (!this.options.initialRanges) {
      const totalBytes = this.getTotalBytes();
      if (!totalBytes) {
        throw new Error('Cannot start download: file size is unknown');
      }

      await this.initializeSaveAsFileTarget(totalBytes);
    }

    this.isDownloading = true;
    this.isPaused = false;
    this.startedAt = new Date();

    const fileHandle = await open(this.options.saveAs, 'r+');
    try {
      while (this.isDownloading && !this.isComplete()) {
        if (this.isPaused) {
          break;
        }

        // Only check for restarts if we have active downloads
        if (this.activeWorkers.size > 0) {
          if (this.shouldRestartWorkers()) {
            await this.restartWorkers();
            continue;
          }
        } else {
          // No active workers, might be due to network issues
          // Check network before starting new workers
          if (!(await this.checkNetworkConnectivity())) {
            await waitFor({ sec: 5 });
            continue;
          }
        }

        while (this.activeWorkers.size < this.options.workersCount!) {
          const range = this.ranges.findSequenceOfAtLeast(
            this.options.chunkSize!,
            FragmentStatus.pending
          );

          if (!range) break;

          const workerId = Downloader.generateWorkerId();
          this.ranges.markAs(range.start, range.end, FragmentStatus.reserved);

          const workerStats: WorkerStats = {
            id: workerId,
            bytesDownloaded: 0,
            startTime: Date.now(),
            lastUpdate: Date.now(),
            speed: 0,
            retryCount: 0
          };
          this.activeWorkers.set(workerId, workerStats);

          this.downloadRange(range, fileHandle, workerId)
            .then(() => {
              this.ranges.markAs(range.start, range.end, FragmentStatus.finished);
              this.activeWorkers.delete(workerId);
            })
            .catch((error) => {
              console.error(`Worker ${ workerId } failed:`, error);
              this.ranges.markAs(range.start, range.end, FragmentStatus.pending);
              this.activeWorkers.delete(workerId);
            });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (this.isDownloading && this.isComplete()) {
        await this.handleCompletion();
      }
    } catch(error) {
      await this.handleError(error);
      throw error;  // Re-throw after handling
    } finally {
      await fileHandle.close();
    }
  }

  private async waitForWorkersToStop(): Promise<void> {
    const workerIds = Array.from(this.activeWorkers.keys());
    await Promise.all(
      workerIds.map(id =>
        new Promise<void>(resolve => {
          const checkWorker = () => {
            if (!this.activeWorkers.has(id)) {
              resolve();
            } else {
              setTimeout(checkWorker, 100);
            }
          };
          checkWorker();
        })
      )
    );
  }

  private async restartWorkers(): Promise<void> {
    // Signal workers to stop
    this.abortController.abort();

    // Wait for all current workers to finish their cleanup
    await this.waitForWorkersToStop();

    // Now that we're sure all workers have stopped, reset everything
    this.abortController = new AbortController();
    this.workersRestartedAt = new Date();

    // Reset speed trackers
    this.speedTracker.resume();
    this.workerSpeedTrackers.clear();

    // Only now it's safe to mark reserved ranges as pending
    for (const range of this.ranges.ranges) {
      if (range.status === FragmentStatus.reserved) {
        this.ranges.markAs(range.start, range.end, FragmentStatus.pending);
      }
    }
  }

  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      await axios.head(this.options.networkCheckUrl!, {
        ...this.options.axiosConfig,
        timeout: this.options.axiosConfig?.timeout || 5000
      });
      return true;
    } catch {
      return false;
    }
  }

  private calculateRetryDelay(retryCount: number): number {
    const delay = Math.min(
      this.options.initialRetryDelay! * Math.pow(2, retryCount),
      this.options.maxRetryDelay!
    );
    // Add some jitter to prevent all workers from retrying at exactly the same time
    return delay + Math.random() * 1000;
  }

  private async downloadRange(range: Fragment, fileHandle: any, workerId: string): Promise<void> {
    const workerStats = this.activeWorkers.get(workerId)!;

    while (this.isDownloading && !this.isPaused) {
      try {
        const response = await axios({
          ...this.options.axiosConfig,
          method: 'GET',
          url: this.options.url,
          responseType: 'stream',
          headers: {
            ...(this.options.axiosConfig?.headers || {}),
            Range: `bytes=${range.start}-${range.end}`
          },
          signal: this.abortController.signal,
          timeout: this.options.axiosConfig?.timeout || 30000
        });

        const writeStream = createWriteStream(null, {
          fd: fileHandle.fd,
          start: range.start,
          autoClose: false
        });

        await new Promise<void>((resolve, reject) => {
          let bytesWritten = 0;
          let lastSpeedUpdate = Date.now();
          let bytesForSpeed = 0;

          response.data.on('data', (chunk: Buffer) => {
            bytesWritten += chunk.length;
            bytesForSpeed += chunk.length;

            workerStats.bytesDownloaded += chunk.length;
            workerStats.retryCount = 0; // Reset retry count on successful data

            const now = Date.now();
            if (now - lastSpeedUpdate >= 1000) {
              workerStats.speed = bytesForSpeed;
              workerStats.lastUpdate = now;
              bytesForSpeed = 0;
              lastSpeedUpdate = now;
            }

            this.updateProgress(chunk.length, workerId);
          });

          response.data.pipe(writeStream);

          writeStream.on('finish', () => {
            if (bytesWritten === range.end - range.start + 1) {
              resolve();
            } else {
              reject(new Error(`Range size mismatch: expected ${range.end - range.start + 1}, got ${bytesWritten}`));
            }
          });

          writeStream.on('error', reject);
          response.data.on('error', reject);
        });

        // If we get here, download was successful
        return;

      } catch (error) {
        if (!this.isDownloading || this.isPaused) {
          throw error; // Don't retry if we're stopping/pausing
        }

        workerStats.retryCount++;

        if (workerStats.retryCount > this.options.maxRetries!) {
          throw new Error(`Max retries (${this.options.maxRetries}) exceeded for range ${range.start}-${range.end}`);
        }

        // Check if it's a network error
        const isNetworkError = error instanceof AxiosError &&
          (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED' ||
            error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND');

        if (isNetworkError) {
          // Wait for network to be back before retrying
          while (this.isDownloading && !this.isPaused) {
            if (await this.checkNetworkConnectivity()) {
              break;
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }

        // Calculate and wait retry delay
        const retryDelay = this.calculateRetryDelay(workerStats.retryCount);
        workerStats.nextRetryTime = Date.now() + retryDelay;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  private updateProgress(newBytes: number, workerId?: string): void {
    const now = Date.now();

    // Update global speed tracker
    this.speedTracker.update(now, newBytes);
    this.bytesSinceLastProgress += newBytes;

    // Update worker speed tracker if provided
    if (workerId) {
      let workerTracker = this.workerSpeedTrackers.get(workerId);
      if (!workerTracker) {
        workerTracker = new SpeedTracker(0, true);
        this.workerSpeedTrackers.set(workerId, workerTracker);
      }
      workerTracker.update(now, newBytes);
    }

    // Generate progress update every second
    if (now - this.lastProgressUpdate >= 1000) {
      this.lastProgressUpdate = now;

      if (this.options.progressCallback) {
        const bytesSinceLastCall = this.bytesSinceLastProgress;
        this.bytesSinceLastProgress = 0;

        this.options.progressCallback(this, this.getProgress(), bytesSinceLastCall);
      }
    }
  }

  private async handleError(error: Error): Promise<void> {
    if (this.options.errorCallback) {
      await this.options.errorCallback(this, error);
    }
  }

  private async handleCompletion(): Promise<void> {
    if (this.options.completedCallback) {
      await this.options.completedCallback(this);
    }
  }

  private shouldRestartWorkers(): boolean {
    if (this.options.autoRestartCallback) {
      return this.options.autoRestartCallback(this);
    }
    return false;
  }

  async getFileSize(): Promise<number | undefined> {
    try {
      const response = await axios.head(this.options.url, this.options.axiosConfig);
      const size = parseInt(response.headers['content-length'], 10);
      return isNaN(size) ? undefined : size;
    } catch {
      return undefined;
    }
  }

  getTotalBytes(): number {
    return this.ranges.count(FragmentStatus.finished) +
      this.ranges.count(FragmentStatus.pending) +
      this.ranges.count(FragmentStatus.reserved);
  }

  private isComplete(): boolean {
    return this.ranges.count(FragmentStatus.finished) === this.getTotalBytes();
  }

  async pause(): Promise<Ranges> {
    this.isPaused = true;
    this.abortController.abort();

    await this.waitForWorkersToStop();

    // After all workers are confirmed stopped, clear internal state
    this.activeWorkers.clear();

    // Reset speed trackers
    this.speedTracker.resume();
    this.workerSpeedTrackers.clear();

    // Send a progress update to show paused state
    if (this.options.progressCallback) {
      await this.options.progressCallback(this, this.getProgress(), 0);
    }

    return this.ranges;
  }

  async cancel(): Promise<void> {
    this.isDownloading = false;
    this.abortController.abort();

    await this.waitForWorkersToStop();

    // After all workers are confirmed stopped, clear internal state
    this.activeWorkers.clear();

    // Reset speed trackers
    this.speedTracker.resume();
    this.workerSpeedTrackers.clear();

    // Final progress update to show cancelled state
    if (this.options.progressCallback) {
      await this.options.progressCallback(this, this.getProgress(), 0);
    }
  }

  private static generateWorkerId(): string {
    // Increment counter (will reset to 0 if it reaches Number.MAX_SAFE_INTEGER)
    Downloader.workerCounter = (Downloader.workerCounter + 1) % Number.MAX_SAFE_INTEGER;

    const now = new Date();
    const year = now.getFullYear();
    // Month and Day need padStart because they can be single digit
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');

    // Format: w-counter-yyyy-mm-dd-hh-mm
    return `w-${Downloader.workerCounter}-${year}-${month}-${day}-${hour}-${minute}`;
  }

  private async initializeSaveAsFileTarget(totalBytes: number) {
    // Ensure saveAt directory exists
    const saveAsDir = path.dirname(this.saveAs);
    await fsp.mkdir(saveAsDir, { recursive: true });

    // Create the file and pre-allocate the full size
    const createHandle = await open(this.options.saveAs, 'w+');
    await createHandle.truncate(totalBytes);
    await createHandle.close();
  }

  getRanges(): Ranges {
    return this.ranges;
  }

  getProgress(): DownloadProgress {
    const now = Date.now();
    const speedQueryFrom = new Date(now - 10000); // Last 10 seconds
    const histogramFrom = new Date(now - 60000); // Last minute
    const currentDate = new Date(now);

    return {
      timestamp: now,
      startedAt: this.startedAt,
      workersRestartedAt: this.workersRestartedAt,
      downloadedBytes: this.ranges.count(FragmentStatus.finished),
      speedTracker: this.speedTracker,
      ranges: this.ranges.ranges,
      totalBytes: this.ranges.isFinite() ? this.getTotalBytes() : undefined,
      speed: this.speedTracker.query(speedQueryFrom, currentDate),
      histogram: this.speedTracker.histogram(histogramFrom, currentDate, 1),
      workerStats: Array.from(this.workerSpeedTrackers.entries()).map(([id, tracker]) => ({
        id,
        speed: tracker.query(speedQueryFrom, currentDate),
        downloadedBytes: this.activeWorkers.get(id)?.bytesDownloaded || 0,
        histogram: tracker.histogram(histogramFrom, currentDate, 1)
      }))
    };
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
}
