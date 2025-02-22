import { Fragment, Ranges } from './ranges';
import { Downloader } from './downloader';
import { Histogram, SpeedTracker } from '../../../stats'
import { AxiosRequestConfig } from 'axios'

export interface DownloaderOptions<T> {
  // Core options
  sourceObject: T;
  url: string;
  saveAs: string;
  axiosConfig?: Partial<AxiosRequestConfig>;
  fileSize?: number;
  workersCount?: number;
  chunkSize?: number;

  // Progress & callbacks
  progressUpdateInterval?: number;
  progressCallback?: ProgressCallback;
  completedCallback?: CompletedCallback;
  errorCallback?: ErrorCallback;
  autoRestartCallback?: DownloaderAutoRestartCallback;
  getResumeDataCallback?: GetResumeDataCallback;

  // Performance monitoring
  minSpeedThreshold?: number;
  speedCheckInterval?: number;
  speedCheckDuration?: number;

  // Network resilience
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  networkCheckUrl?: string;

  // State management
  initialRanges?: Ranges;

  // Debug options
  debugOutput?: boolean;
  disableLogging?: boolean;
}

export interface DownloadProgress {
  timestamp: number;
  startedAt?: Date;
  downloadedBytes: number;
  totalBytes?: number;
  speed: number;
  speedTracker: SpeedTracker;
  ranges: Fragment[];
  workersRestartedAt?: Date;
  histogram?: Histogram;
  workerStats: {
    id: string;
    speed: number;
    downloadedBytes: number;
    histogram?: Histogram;
  }[];
}

export type ProgressCallback = (downloader: IDownloader, stats: DownloadProgress, bytesSinceLastCall: number) => Promise<void> | void;
export type CompletedCallback = (downloader: IDownloader) => Promise<void> | void;
export type GetResumeDataCallback = (downloader: IDownloader) => Promise<Ranges | undefined>;
export type ErrorCallback = (downloader: IDownloader, error: Error) => Promise<void> | void;
export type DownloaderAutoRestartCallback = (downloader: Downloader<any>) => boolean;

export interface IDownloader {

}
