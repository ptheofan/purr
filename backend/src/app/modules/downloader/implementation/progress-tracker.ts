import { SpeedTracker } from '../../../stats';
import { IRanges } from './ranges';
import { DownloadProgress, WorkerStats } from './downloader.interface';
import { FragmentStatus } from '../dtos/fragment.dto';

/**
 * Tracks download progress and provides speed statistics.
 * Manages progress updates, speed tracking, and worker statistics.
 */
export class ProgressTracker {
  private bytesSinceLastProgress = 0;
  private lastProgressUpdate = Date.now();
  private speedTracker: SpeedTracker;
  private startedAt?: Date;
  private workersRestartedAt?: Date;

  constructor(initialBytes: number = 0) {
    this.speedTracker = new SpeedTracker(initialBytes, true);
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
    const now = Date.now();
    this.speedTracker.update(now, newBytes);
    this.bytesSinceLastProgress += newBytes;
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
  }
}
