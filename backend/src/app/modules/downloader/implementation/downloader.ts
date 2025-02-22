import { Logger } from '@nestjs/common';
import { FragmentStatus } from '../dtos';
import { Ranges } from './ranges';
import axios, {
  AxiosError,
  AxiosRequestConfig,
  CanceledError,
  CancelTokenSource,
  ResponseType,
} from 'axios';
import http from 'http';
import https from 'https';
import fsp from 'node:fs/promises';
import fs from 'fs';
import { prettyBytes } from '../../../helpers';
import * as path from 'path';
import {
  CompletedCallback,
  DownloaderAutoRestartCallback,
  DownloaderOpts,
  DownloaderStats,
  DownloaderStatus,
  ErrorCallback,
  IDownloader,
  ProgressCallback,
  WorkerState,
  WorkerStats,
} from './downloader.interface';
import { SpeedTracker } from '../../../stats';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { waitFor } from '../../../helpers/promises.helper'

export interface ResumableDownloaderOpts {
  httpAgent?: http.Agent;
  httpsAgent?: https.Agent;
  progressUpdateInterval?: number; // ms
  // getResumeData?: DownloadGetResumeDataCallback;
  onProgress?: ProgressCallback;
  onCompleted?: CompletedCallback;
  onError?: ErrorCallback;
}

/**
 * How it works:
 * - The downloader is split into workers
 * - Each worker downloads a range of bytes
 *
 * Flow:
 * When you call `start()` the downloader will enter the control loop and return a promise.
 * The control loop itself is a another promise that will resolve when the download is completed or stopped or errored.
 * The control loop is also a promise to handle restarting connections.
 *
 * There is the `Downloader.status` which indicates what the downloader is supposed to be doing at the moment.
 * There is also the `Worker.state` which indicates what the worker is doing at the moment.
 *
 * The combination of these two states will determine the flow of the downloader.
 * For example, if the Downloader is set to restarting
 *    - Trigger all workers to stop
 *    - Downloader will wait for all workers to stop
 *    - Downloader will set the status to running
 *    - Downloader will relaunch all workers
 */
export class Downloader<T> implements IDownloader {
  private _sourceObject: T;
  private ranges: Ranges;
  private _serverSupportsRanges?: boolean = undefined;
  private cancelTokens: Map<string, CancelTokenSource> = new Map();
  private httpAgent: any;
  private httpsAgent: any;
  private _url: string;
  private _saveAs: string;
  private fileSize: number;
  private workersCount: number;
  private chunkSize: number;
  private stats: DownloaderStats;
  private workers: Map<string, WorkerStats> = new Map();
  private progressUpdateInterval?: number; // ms
  private progressCallback?: ProgressCallback;
  private completedCallback?: CompletedCallback;
  private errorCallback?: ErrorCallback;
  private _status: DownloaderStatus;
  private lastProgressUpdateTimestamp = 0;
  private debugOutput = true;
  private maxRedirects: number = 3;
  private logger: Logger | null;
  private autoRestartCallback?: DownloaderAutoRestartCallback;
  private bytesSinceLastProgressUpdate: number = 0;

  constructor(opts: DownloaderOpts<T>) {
    this.logger = opts.disableLogging ? null : new Logger('Downloader');
    this._sourceObject = opts.sourceObject;
    this._url = opts.url;
    this._saveAs = opts.saveAs;
    this.httpAgent = opts.httpAgent;
    this.httpsAgent = opts.httpsAgent;
    this.fileSize = opts.fileSize;
    this.chunkSize = opts.chunkSize || 1024 * 1024 * 10; // 10MB
    this._serverSupportsRanges = opts.serverSupportsRanges || undefined;
    this.progressUpdateInterval = opts.progressUpdateInterval;
    this.progressCallback = opts.progressCallback;
    this.completedCallback = opts.completedCallback;
    this.errorCallback = opts.errorCallback;
    this._status = opts.status || DownloaderStatus.STOPPED;
    this.debugOutput = opts.debugOutput;
    this.workersCount = opts.workersCount || 1;
    this.autoRestartCallback = opts.autoRestartCallback;
  }

  /**
   * Initialize the downloader
   * Call the start method to begin the downloading process
   */
  async initialize(): Promise<void> {
    if (!this.httpAgent) {
      this.httpAgent = new http.Agent({
        keepAlive: true,
        maxSockets: 1024,
        timeout: 30000,
      });
    }

    if (!this.httpsAgent) {
      this.httpsAgent = new https.Agent({
        keepAlive: true,
        maxSockets: 1024,
        timeout: 30000,
      });
    }

    // FileSize
    if (!this.fileSize) {
      this.fileSize = await this.queryFileSize();
    }

    // Ranges (might have been set by queryFileSize opportunistic check)
    if (this._serverSupportsRanges === undefined) {
      this._serverSupportsRanges = await this.queryRangesSupport();
    }

    if (!this._serverSupportsRanges) {
      this.workersCount = 1;
      // No ranges support, maximize chunk size for optimal performance
      this.chunkSize = this.fileSize ? this.fileSize : Number.MAX_SAFE_INTEGER;
    }

    // Configure Ranges
    this.ranges = new Ranges(this.fileSize);

    // Trackers and Stats
    this.stats = this.createTrackersAndStats();

    if (this.isResumable()) {
      await this.configureResume();
    }
  }

  createTrackersAndStats(): DownloaderStats {
    return {
      timestamp: Date.now(),
      downloadedBytes: this.ranges.count(FragmentStatus.finished),
      speedTracker: new SpeedTracker(10),
      ranges: this.ranges.ranges,
    };
  }

  async configureResume(): Promise<void> {
    // file already exists?
    if (fs.existsSync(this._saveAs)) {
      // if (this.getResumeData) {
      //   const ranges = await this._options.getResumeData(this);
      //   if (ranges) {
      //     // Clean up all reserved ranges to pending
      //     ranges.changeAll(FragmentStatus.reserved, FragmentStatus.pending);
      //     this.ranges = ranges;
      //   }
      // }
    }
  }

  isResumable(): boolean {
    return this._serverSupportsRanges;
  }

  getAxiosOptions(): AxiosRequestConfig {
    return {
      httpAgent: this.httpAgent,
      httpsAgent: this.httpsAgent,
      adapter: undefined,
      maxRedirects: this.maxRedirects,
    };
  }

  async queryFileSize(): Promise<number | undefined> {
    const response = await axios.head(this._url, this.getAxiosOptions());

    if (response.headers && response.headers['content-length']) {
      if (response.headers['accept-ranges'] === 'bytes') {
        // Opportunistic: if the server supports ranges, we can use it
        this._serverSupportsRanges = true;
      }
      return Number(response.headers['content-length']);
    }

    return undefined;
  }

  async queryRangesSupport(): Promise<boolean> {
    try {
      const response = await axios.get(this._url, {
        ...this.getAxiosOptions(),
        headers: {
          Range: 'bytes=0-1',
        },
      });

      return response.status === 206;
    } catch (err) {
      return false;
    }
  }

  /**
   * Start the download
   */
  async download(): Promise<void> {
    if (!this.stats.startedAt) {
      this.stats.startedAt = new Date();
    }

    if (this._status !== DownloaderStatus.STOPPED) {
      throw new RuntimeException(
        `Cannot start download, status is already ${ this._status } (${ this._url })`,
      );
    }

    this._status = DownloaderStatus.RUNNING;
    return new Promise(async (resolve, reject) => {
      while (
        this._status === DownloaderStatus.RUNNING ||
        this._status === DownloaderStatus.RESTARTING ||
        this._status === DownloaderStatus.STOPPING
        ) {
        try {
          await this.startWorkers();
          return resolve();
        } catch (err) {
          if (
            err === WorkerState.STOPPED ||
            err.message === WorkerState.STOPPED
          ) {
            switch (this._status) {
              case DownloaderStatus.STOPPING:
                // Download stopped
                this.debugOutput &&
                this.logger.debug(`Download Stopped! Stopping workers...`);
                await this.waitForWorkersToEnterState(WorkerState.STOPPED);
                this._status = DownloaderStatus.STOPPED;
                return resolve();
              case DownloaderStatus.RESTARTING:
                // Connections reset
                this.debugOutput &&
                this.logger.debug(`Too Slow! Restarting workers...`);
                await this.waitForWorkersToEnterState(WorkerState.STOPPED);
                this.debugOutput &&
                this.logger.debug(
                  `All workers stopped (DownloaderStatus = ${ this._status } - WorkersState = ${ Array.from(
                    this.workers.values(),
                  )
                    .map((worker) => worker.state)
                    .join(', ') })`,
                );
                // Wait 1 second before restarting
                await waitFor({ sec: 1 });
                break;
              default:
                this.debugOutput &&
                this.logger.error(
                  `Unexpected Workers Cancellation (${ err.message })`,
                  err.stack,
                );
                this.errorHandler(err);
                return reject(err);
            }
          } else {
            if (err instanceof AxiosError) {
              this.debugOutput &&
              this.logger.error(
                `Error while running workers (${ err.message })`,
                err.stack,
              );
              this.errorHandler(err);
              return reject(err);
            }
          }
        }
      }
    });
  }

  async startWorkers(): Promise<void> {
    if (this.workersCount < 1) {
      throw new RuntimeException('workersCount must be greater than 0');
    }
    if (this.chunkSize < 1) {
      throw new RuntimeException('chunkSize must be greater than 0');
    }
    //this._status = DownloaderStatus.RUNNING;

    // Ensure saveAt directory exists
    const saveAsDir = path.dirname(this._saveAs);
    await fsp.mkdir(saveAsDir, { recursive: true });

    // Prepare the file
    const fd = await fsp.open(this._saveAs, 'w+');
    await fd.truncate(this.fileSize);
    await fd.close();

    // At this point we should have no reserved ranges
    this.ranges.changeAll(FragmentStatus.reserved, FragmentStatus.pending);

    // Tune the workers count based on the file size
    let workersCount: number;
    if (!this._serverSupportsRanges) {
      // Ranges not supported
      workersCount = 1;
    } else if (this.fileSize && this.fileSize < this.chunkSize) {
      workersCount = 1;
    } else {
      // unknown size or size > chunkSize
      workersCount = this.workersCount;
    }

    // Configure Workers
    this.workers.clear();
    const workers: Promise<void>[] = [];
    for (let i = 0; i < workersCount; i++) {
      const id = `worker-${ i }`;

      // Create Worker Data structure (should be reset also when resuming)
      this.workers.set(id, {
        id: id,
        state: WorkerState.STOPPED,
        timestamp: Date.now(),
        speedTracker: new SpeedTracker(0, true),
        rangesCount: 0,
        downloadedBytes: 0,
        range: undefined,
      });

      // Push worker to workers list
      workers.push(this.worker(id));
    }

    this.debugOutput &&
    this.logger.debug(`Starting Workers for ${ this._saveAs }`);
    this.stats.workersRestartedAt = new Date();
    this.bytesSinceLastProgressUpdate = 0;
    await Promise.all(workers);
    this.debugOutput && this.logger.debug('All workers completed');
    await this.completedHandler();
  }

  getStats(): DownloaderStats {
    return this.stats;
  }

  getWorkersStats(): WorkerStats[] {
    return Array.from(this.workers.values());
  }

  stop() {
    this._status = DownloaderStatus.STOPPING;
    this.cancelTokens.forEach((token) => {
      token.cancel(WorkerState.STOPPED);
    });
  }

  /**
   * Wait for all workers to reach a specific status
   */
  async waitForWorkersToEnterState(
    status: WorkerState,
    onRetry?: () => void,
  ): Promise<void> {
    let lastStateSummary: string;
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (
          Array.from(this.workers.values()).every(
            (worker) => worker.state === status,
          )
        ) {
          clearInterval(interval);
          resolve();
        } else {
          onRetry && onRetry();
          const stateSummary = Array.from(this.workers.values())
            .map((worker) => worker.state)
            .join(', ');
          if (stateSummary !== lastStateSummary) {
            this.logger.debug(
              `Waiting for workers to enter state ${ status } - ${ Array.from(
                this.workers.values(),
              )
                .map((worker) => worker.state)
                .join(', ') }, Downloader.status = ${ this._status }`,
            );
          }
        }
      }, 100);
    });
  }

  async completedHandler(): Promise<void> {
    this._status = DownloaderStatus.COMPLETED;
    if (this.completedCallback) await this.completedCallback(this);
  }

  async errorHandler(error: Error): Promise<void> {
    this._status = DownloaderStatus.ERROR;
    if (this.errorCallback) await this.errorCallback(this, error);
  }

  restartWorkers() {
    this._status = DownloaderStatus.RESTARTING;
    this.cancelTokens.forEach((token) => {
      token.cancel(WorkerState.STOPPED);
    });
  }

  /**
   * The core loop of a worker. The promise will return when the worker is stopped
   * If it is stopped because it has nothing more to download it will resolve.
   * If it is stopped for any other reason it will reject the promise.
   *
   * How:
   * It will request for an available range. If there are no more available
   * ranges it has nothing more to do and the promise will resolve.
   */
  protected async worker(id: string): Promise<void> {
    const wStats = this.workers.get(id);
    let withError = false;

    while (this._status === DownloaderStatus.RUNNING) {
      wStats.state = WorkerState.RUNNING;

      const range = this.ranges.findSequenceOfAtLeast(
        this.chunkSize,
        FragmentStatus.pending,
      );
      if (!range) {
        wStats.state = WorkerState.STOPPED;
        wStats.range = undefined;
        break;
      }

      this.ranges.markAs(range.start, range.end, FragmentStatus.reserved);
      wStats.range = {
        start: range?.start || 0,
        end: range?.end || 0,
        downloadedBytes: 0,
      };
      const cancelToken = axios.CancelToken.source();
      this.cancelTokens.set(id, cancelToken);
      const axiosOpts: AxiosRequestConfig = {
        ...this.getAxiosOptions(),
        responseType: <ResponseType>'stream',
        cancelToken: cancelToken.token,
      };

      // Download Range (headers)
      axiosOpts.headers = {
        Range: `bytes=${ range.start }-${ range.end }`,
      };

      const response = await axios.get(this._url, axiosOpts);
      const stream = response.data;
      const fileStream = fs.createWriteStream(this._saveAs, {
        flags: 'r+',
        start: range.start,
      });

      try {
        await new Promise<void>((resolve, reject) => {
          stream.on('data', async (buffer: Buffer) => {
            if (this.shouldRestartWorkers()) {
              // Trigger workers restart
              this.restartWorkers();
            }
            await this.progressUpdateHandler(buffer.length, id);
          });
          stream.on('error', (err: Error) => {
            fileStream.close();
            withError = true;
            this.ranges.markAs(range.start, range.end, FragmentStatus.pending);
            wStats.state = WorkerState.STOPPED;
            if (
              err instanceof CanceledError &&
              err.message === WorkerState.STOPPED
            ) {
              // Intentional interruption on
              return reject(WorkerState.STOPPED);
            }

            // Unhandled error
            throw err;
          });
          fileStream.on('finish', () => {
            wStats.state = WorkerState.STOPPED;
            resolve();
          });
          stream.pipe(fileStream);
        });

        // Range completed, loop to next range
        this.ranges.markAs(range.start, range.end, FragmentStatus.finished);
        wStats.state = WorkerState.STOPPED;
        wStats.rangesCount++;
        await this.progressUpdateHandler(0, id);
      } catch (err) {
        this.ranges.markAs(range.start, range.end, FragmentStatus.pending);
        wStats.state = WorkerState.STOPPED;
        await this.progressUpdateHandler(0, id);
        fileStream.close();
        throw err;
      }
    }

    wStats.state = WorkerState.STOPPED;
    if (withError) {
      throw new Error(WorkerState.STOPPED);
    }
  }

  /**
   * This is a heuristic to determine if the workers should be restarted.
   * It is based on the time elapsed since the last time the workers were restarted.
   */
  shouldRestartWorkers(): boolean {
    return this.autoRestartCallback && this.autoRestartCallback(this) === true;
  }

  /**
   * Update the progress of the downloader
   */
  async progressUpdateHandler(length: number, workerId: string): Promise<void> {
    // progress tracking....
    const now = Date.now();
    const wStats = this.workers.get(workerId);

    wStats.timestamp = now;
    wStats.speedTracker.update(now, length);
    wStats.downloadedBytes += length;
    wStats.range.downloadedBytes += length;

    this.stats.timestamp = now;
    this.stats.speedTracker.update(now, length);
    this.stats.downloadedBytes += length;
    this.bytesSinceLastProgressUpdate += length;

    // Call update progress callback if needed
    if (now - this.lastProgressUpdateTimestamp >= this.progressUpdateInterval) {
      this.lastProgressUpdateTimestamp = now;
      if (this.progressCallback) {
        this.stats.ranges = this.ranges.ranges;
        await this.progressCallback(this, this.stats, length);
      }
      this.bytesSinceLastProgressUpdate = 0;

      if (this.logger && this.debugOutput) {
        // print in a single row the rates for each worker
        const rates: string[] = [];
        const now = new Date();
        const from = new Date(Date.now() - 10000); // last 10 seconds
        this.workers.forEach((data) => {
          // Download rate of worker
          const rate = `${ prettyBytes(data.speedTracker.query(from, now)) }/s`;

          // Downloaded bytes of worker (total in his lifetime)
          const bytesDownloaded = prettyBytes(data.downloadedBytes);

          // Percentage of the range downloaded
          if (data.range) {
            const rangeRemaining = data.range ? data.range.end - data.range.start : 0;
            const percentage = ((data.range.downloadedBytes / rangeRemaining) * 100).toFixed(0);

            rates.push(`${ rate } - ${ bytesDownloaded } - ${ percentage }%`);
          }
        });
        this.logger.debug(`${ this._saveAs }`);
        this.logger.debug(
          `${ prettyBytes(this.stats.speedTracker.query(from, now)) }/s (${ rates.join(' | ') })`,
        );
        for (let i = 0; i < this.ranges.ranges.length; i++) {
          const range = this.ranges.ranges[i];
          this.logger.debug(
            `range-${ i }: [${ range.status }] ${ range.start }-${ range.end }`,
          );
        }
      }
    }
  }

  get sourceObject(): T {
    return this._sourceObject;
  }

  get saveAs(): string {
    return this._saveAs;
  }

  get url(): string {
    return this._url;
  }

  get serverSupportsRanges(): boolean {
    return this._serverSupportsRanges;
  }

  get status(): DownloaderStatus {
    return this._status;
  }
}
