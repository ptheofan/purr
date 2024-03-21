import { SpeedTracker } from '../plugins';
import { Fragment, Ranges } from './ranges';
import http from 'http';
import https from 'https';

export class DownloaderOpts<T> {
  sourceObject: T
  url: string;
  saveAs: string;
  httpAgent?: http.Agent;
  httpsAgent?: https.Agent;
  fileSize?: number;
  workersCount?: number;
  chunkSize?: number;
  serverSupportsRanges?: boolean;
  progressUpdateInterval?: number; // ms
  progressCallback?: ProgressCallback;
  completedCallback?: CompletedCallback;
  errorCallback?: ErrorCallback;
  status?: DownloaderStatus;
  debugOutput?: boolean;
  disableLogging?: boolean;
}

export enum DownloaderStatus {
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface DownloaderStats {
  timestamp: number;
  downloadedBytes: number;
  speedTracker: SpeedTracker;
  workers: WorkerStats[];
  ranges: Fragment[];
}

export interface WorkerStats {
  id: string;
  timestamp: number;
  speedTracker: SpeedTracker;
  rangesCount: number;
  downloadedBytes: number;
}

export type ProgressCallback = (downloader: IDownloader, stats: DownloaderStats) => void;
export type CompletedCallback = (downloader: IDownloader) => Promise<void> | void;
export type GetResumeDataCallback = (downloader: IDownloader) => Promise<Ranges | undefined>;
export type ErrorCallback = (downloader: IDownloader, error: Error) => void;

export interface IDownloader {

}
