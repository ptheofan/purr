import { Fragment, Ranges } from './ranges';
import http from 'http';
import https from 'https';
import { Downloader } from './downloader';
import { SpeedTracker } from '../../../stats';
import { registerEnumType } from '@nestjs/graphql';

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
  autoRestartCallback?: DownloaderAutoRestartCallback;
}

export type DownloaderAutoRestartCallback = (downloader: Downloader<any>) => boolean;

export enum DownloaderStatus {
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  RESTARTING = 'restarting',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export enum WorkerState {
  RUNNING = 'running',
  STOPPED = 'stopped',
}

registerEnumType(WorkerState, {
  name: 'WorkerState',
});

export interface DownloaderStats {
  timestamp: number;
  startedAt?: Date;
  workersRestartedAt?: Date;
  downloadedBytes: number;
  speedTracker: SpeedTracker;
  ranges: Fragment[];
}

export interface RangeStats {
  start: number;
  end: number;
  downloadedBytes: number;
}

export interface WorkerStats {
  id: string;
  state: WorkerState;
  timestamp: number;
  speedTracker: SpeedTracker;
  rangesCount: number;
  downloadedBytes: number;
  range?: RangeStats;
}

export type ProgressCallback = (downloader: IDownloader, stats: DownloaderStats, bytesSinceLastCall: number) => Promise<void> | void;
export type CompletedCallback = (downloader: IDownloader) => Promise<void> | void;
export type GetResumeDataCallback = (downloader: IDownloader) => Promise<Ranges | undefined>;
export type ErrorCallback = (downloader: IDownloader, error: Error) => Promise<void> | void;

export interface IDownloader {

}
