import { SpeedTracker } from '../../../stats';
import { IRanges } from './ranges';
import { DownloadProgress, WorkerStats } from './downloader.interface';
import { FragmentStatus } from '../dtos/fragment.dto';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

/**
 * Tracks download progress and provides speed statistics.
 * Manages progress updates, speed tracking, and worker statistics.
 */
export class ProgressTracker extends EventEmitter2 {
  private readonly logger = new Logger(ProgressTracker.name);
  private bytesSinceLastProgress = 0;
  private lastProgressUpdate = Date.now();
  private speedTracker: SpeedTracker;
  private startedAt?: Date;
  private workersRestartedAt?: Date;
  private disposed = false;

  constructor(initialBytes: number = 0) {
    super();
    this.speedTracker = new SpeedTracker(initialBytes, true);
    this.logger.debug(`ProgressTracker initialized with ${initialBytes} initial bytes`);
  }

  /**
   * Sets the download start time.
   */
  setStartTime(date: Date): void {
    this.startedAt = date;
  }

  /**
   * Sets the workers restart time.
   */
  setWorkersRestartTime(date: Date): void {
    this.workersRestartedAt = date;
  }

  /**
   * Updates progress with new bytes downloaded.
   */
  update(newBytes: number): void {
    if (this.disposed) {
      this.logger.warn('Attempted to update disposed ProgressTracker');
      return;
    }

    if (newBytes < 0) {
      this.logger.warn(`Negative bytes update: ${newBytes}`);
      return;
    }

    const now = Date.now();
    this.speedTracker.update(now, newBytes);
    this.bytesSinceLastProgress += newBytes;

    // Emit progress event for fine-grained tracking
    this.emit('bytes.updated', { bytes: newBytes, timestamp: now });

    // Log significant progress updates
    if (this.bytesSinceLastProgress > 1024 * 1024) { // Every 1MB
      // Disabled for now, as it's too verbose
      // this.logger.debug(`Progress update: +${newBytes} bytes (total accumulated: ${this.bytesSinceLastProgress})`);
    }
  }

  /**
   * Checks if progress should be updated (every 1 second).
   */
  shouldUpdateProgress(): boolean {
    return Date.now() - this.lastProgressUpdate >= 1000;
  }

  /**
   * Gets and resets bytes since last progress update.
   */
  getBytesSinceLastProgress(): number {
    const bytes = this.bytesSinceLastProgress;
    this.bytesSinceLastProgress = 0;
    this.lastProgressUpdate = Date.now();

    // Emit progress reset event
    this.emit('progress.reset', { bytesReported: bytes, timestamp: this.lastProgressUpdate });

    return bytes;
  }

  /**
   * Gets current download progress with speed statistics.
   */
  getProgress(ranges: IRanges, workerStats: WorkerStats[]): DownloadProgress {
    const now = Date.now();
    const speedQueryFrom = new Date(now - 10000);
    const histogramFrom = new Date(now - 60000);
    const currentDate = new Date(now);

    return {
      timestamp: now,
      startedAt: this.startedAt,
      workersRestartedAt: this.workersRestartedAt,
      downloadedBytes: ranges.count(FragmentStatus.finished),
      totalBytes: ranges.isFinite() ? this.calculateTotalBytes(ranges) : undefined,
      speed: this.speedTracker.query(speedQueryFrom, currentDate),
      speedTracker: this.speedTracker,
      ranges: ranges.ranges,
      histogram: this.speedTracker.histogram(histogramFrom, currentDate, 1),
      workerStats: workerStats.map((stats) => ({
        id: stats.id,
        speed: stats.speed,
        downloadedBytes: stats.bytesDownloaded,
      })),
    };
  }

  /**
   * Calculates total bytes from all fragment statuses.
   */
  private calculateTotalBytes(ranges: IRanges): number {
    return ranges.count(FragmentStatus.finished) +
      ranges.count(FragmentStatus.pending) +
      ranges.count(FragmentStatus.reserved);
  }

  /**
   * Resets speed tracker when resuming downloads.
   */
  resetSpeedTracker(): void {
    this.speedTracker.resume();
    this.logger.debug('Speed tracker reset for resume');
    this.emit('speed.tracker.reset');
  }

  /**
   * Get current speed statistics
   */
  getCurrentSpeed(): number {
    const now = Date.now();
    const speedQueryFrom = new Date(now - 10000); // Last 10 seconds
    return this.speedTracker.query(speedQueryFrom, new Date(now));
  }

  /**
   * Get total bytes tracked
   */
  getTotalBytes(): number {
    // Access private property via any cast - this is a design issue in SpeedTracker
    return (this.speedTracker as any).totalData || 0;
  }

  /**
   * Dispose of this tracker and clean up resources
   */
  dispose(): void {
    if (this.disposed) return;

    this.logger.debug('Disposing ProgressTracker');
    this.disposed = true;

    this.removeAllListeners();
  }

  /**
   * Check if tracker is disposed
   */
  get isDisposed(): boolean {
    return this.disposed;
  }
}
