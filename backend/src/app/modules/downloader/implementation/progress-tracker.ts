import { SpeedTracker } from '../../../stats';
import { IRanges } from './ranges'
import { DownloadProgress, WorkerStats } from './downloader.interface'
import { FragmentStatus } from '../dtos';

export class ProgressTracker {
  private bytesSinceLastProgress = 0;
  private lastProgressUpdate = Date.now();
  private speedTracker: SpeedTracker;
  private startedAt?: Date;
  private workersRestartedAt?: Date;

  constructor(initialBytes: number = 0) {
    this.speedTracker = new SpeedTracker(initialBytes, true);
  }

  setStartTime(date: Date): void {
    this.startedAt = date;
  }

  setWorkersRestartTime(date: Date): void {
    this.workersRestartedAt = date;
  }

  update(newBytes: number): void {
    const now = Date.now();
    this.speedTracker.update(now, newBytes);
    this.bytesSinceLastProgress += newBytes;
  }

  shouldUpdateProgress(): boolean {
    return Date.now() - this.lastProgressUpdate >= 1000;
  }

  getBytesSinceLastProgress(): number {
    const bytes = this.bytesSinceLastProgress;
    this.bytesSinceLastProgress = 0;
    this.lastProgressUpdate = Date.now();
    return bytes;
  }

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
      totalBytes: ranges.isFinite() ? this.getTotalBytes(ranges) : undefined,
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

  private getTotalBytes(ranges: IRanges): number {
    return ranges.count(FragmentStatus.finished) +
      ranges.count(FragmentStatus.pending) +
      ranges.count(FragmentStatus.reserved);
  }

  resetSpeedTracker(): void {
    this.speedTracker.resume();
  }
}
