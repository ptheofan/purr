import { DownloadProgress } from '../implementation/downloader.interface';
import { Fragment } from '../implementation/ranges';

export enum DownloadEventType {
  STARTED = 'download.started',
  PROGRESS = 'download.progress',
  COMPLETED = 'download.completed',
  PAUSED = 'download.paused',
  CANCELLED = 'download.cancelled',
  ERROR = 'download.error',
  WORKER_STARTED = 'download.worker.started',
  WORKER_COMPLETED = 'download.worker.completed',
  WORKER_FAILED = 'download.worker.failed',
  WORKER_RESTARTED = 'download.worker.restarted',
}

export interface DownloadStartedEvent {
  instanceId: string;
  url: string;
  saveAs: string;
  totalBytes?: number;
  workersCount: number;
  timestamp: Date;
}

export interface DownloadProgressEvent extends DownloadProgress {
  instanceId: string;
  bytesSinceLastUpdate: number;
}

export interface DownloadCompletedEvent {
  instanceId: string;
  url: string;
  saveAs: string;
  totalBytes: number;
  duration: number;
  averageSpeed: number;
  timestamp: Date;
}

export interface DownloadPausedEvent {
  instanceId: string;
  ranges: Fragment[];
  bytesDownloaded: number;
  timestamp: Date;
}

export interface DownloadCancelledEvent {
  instanceId: string;
  bytesDownloaded: number;
  timestamp: Date;
}

export interface DownloadErrorEvent {
  instanceId: string;
  error: Error;
  errorType: 'network' | 'filesystem' | 'validation' | 'unknown';
  retryable: boolean;
  timestamp: Date;
}

export interface WorkerStartedEvent {
  instanceId: string;
  workerId: string;
  range: { start: number; end: number };
  timestamp: Date;
}

export interface WorkerCompletedEvent {
  instanceId: string;
  workerId: string;
  bytesDownloaded: number;
  duration: number;
  averageSpeed: number;
  timestamp: Date;
}

export interface WorkerFailedEvent {
  instanceId: string;
  workerId: string;
  error: Error;
  retryCount: number;
  willRetry: boolean;
  timestamp: Date;
}

export interface WorkerRestartedEvent {
  instanceId: string;
  workerId: string;
  reason: 'slow_speed' | 'error' | 'manual';
  previousSpeed?: number;
  timestamp: Date;
}

export type DownloadEvent =
  | DownloadStartedEvent
  | DownloadProgressEvent
  | DownloadCompletedEvent
  | DownloadPausedEvent
  | DownloadCancelledEvent
  | DownloadErrorEvent
  | WorkerStartedEvent
  | WorkerCompletedEvent
  | WorkerFailedEvent
  | WorkerRestartedEvent;