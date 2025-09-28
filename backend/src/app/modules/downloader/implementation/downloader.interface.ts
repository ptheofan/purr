import { Fragment, Ranges } from './ranges';
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
  }[];
}

export interface WorkerStats {
  id: string;
  bytesDownloaded: number;
  startTime: number;
  lastUpdate: number;
  speed: number;
  retryCount: number;
  nextRetryTime?: number;
}

export type ProgressCallback = (downloader: DownloadCoordinatorInterface, stats: DownloadProgress, bytesSinceLastCall: number) => Promise<void> | void;
export type CompletedCallback = (downloader: DownloadCoordinatorInterface) => Promise<void> | void;
export type GetResumeDataCallback = (downloader: DownloadCoordinatorInterface) => Promise<Ranges | undefined>;
export type ErrorCallback = (downloader: DownloadCoordinatorInterface, error: Error) => Promise<void> | void;
export type DownloaderAutoRestartCallback = (downloader: DownloadCoordinatorInterface) => boolean;

export interface DownloadCoordinatorInterface {
  start(): Promise<void>;
  pause(): Promise<Ranges>;
  cancel(): Promise<void>;
  getProgress(): DownloadProgress;
  dispose(): Promise<void>;
  readonly id: string;
  readonly sourceObject: unknown;
  readonly saveAs: string;
  readonly url: string;
}
