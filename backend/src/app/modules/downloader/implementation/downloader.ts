import { Logger } from '@nestjs/common';
import { FragmentStatus } from '../dtos';
import { Ranges } from './ranges';
import axios, { AxiosError, AxiosRequestConfig, CanceledError, CancelTokenSource, ResponseType } from 'axios';
import * as http from 'http';
import * as https from 'https';
import { strict as assert } from 'assert';
import fsp from 'node:fs/promises';
import fs from 'fs';
import { SpeedTracker } from '../plugins';
import { crc32File, prettyBytes } from '../../../helpers';
import * as path from 'path';
import {
  CompletedCallback,
  DownloaderOpts,
  DownloaderStats,
  DownloaderStatus,
  ErrorCallback,
  IDownloader,
  ProgressCallback,
  WorkerState,
  WorkerStats,
} from './downloader.interface';


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
  private serverSupportsRanges?: boolean = undefined;
  private cancelTokens: Map<string, CancelTokenSource> = new Map();
  private httpAgent: any;
  private httpsAgent: any;
  private url: string;
  private saveAs: string;
  private fileSize: number;
  private workersCount: number;
  private chunkSize: number;
  private stats: DownloaderStats;
  private workers: Map<string, WorkerStats> = new Map();
  private progressUpdateInterval?: number; // ms
  private progressCallback?: ProgressCallback;
  private completedCallback?: CompletedCallback;
  private errorCallback?: ErrorCallback;
  private status: DownloaderStatus;
  private lastProgressUpdateTimestamp = 0;
  private debugOutput = true;
  private maxRedirects: number = 3;
  private logger: Logger | null;
  private downloadStartedAt: number;

  /**
   * Create a downloader
   * Call the start method to begin
   * @param opts
   */
  static async create<T>(opts: DownloaderOpts<T>): Promise<Downloader<T>> {
    const downloader = new Downloader<T>();
    downloader.logger = opts.disableLogging ? null : new Logger('Downloader');
    downloader._sourceObject = opts.sourceObject;
    downloader.url = opts.url;
    downloader.saveAs = opts.saveAs;
    downloader.httpAgent = opts.httpAgent;
    downloader.httpsAgent = opts.httpsAgent;
    downloader.fileSize = opts.fileSize;
    downloader.chunkSize = opts.chunkSize || 1024 * 1024 * 10; // 10MB
    downloader.serverSupportsRanges = opts.serverSupportsRanges;
    downloader.progressUpdateInterval = opts.progressUpdateInterval;
    downloader.progressCallback = opts.progressCallback;
    downloader.completedCallback = opts.completedCallback;
    downloader.errorCallback = opts.errorCallback;
    downloader.status = opts.status || DownloaderStatus.STOPPED;
    downloader.debugOutput = opts.debugOutput;
    downloader.workersCount = opts.workersCount || 1;

    if (!downloader.httpAgent) {
      downloader.httpAgent = new http.Agent({
        keepAlive: true,
        maxSockets: 1024,
        timeout: 30000,
      });
    }

    if (!downloader.httpsAgent) {
      downloader.httpsAgent = new https.Agent({
        keepAlive: true,
        maxSockets: 1024,
        timeout: 30000,
      });
    }

    // FileSize
    if (!downloader.fileSize) {
      downloader.fileSize = await downloader.queryFileSize();
    }

    // Ranges (might have been set by queryFileSize opportunistic check)
    if (downloader.serverSupportsRanges === undefined) {
      downloader.serverSupportsRanges = await downloader.queryRangesSupport();
    }

    if (!downloader.serverSupportsRanges) {
      downloader.workersCount = 1;
      // No ranges support, maximize chunk size for optimal performance
      downloader.chunkSize = downloader.fileSize ? downloader.fileSize : Number.MAX_SAFE_INTEGER;
    }

    // Configure Ranges
    downloader.ranges = new Ranges(downloader.fileSize);

    // Trackers and Stats
    downloader.stats = downloader.createTrackersAndStats();

    if (downloader.isResumable()) {
      await downloader.configureResume();
    }

    return downloader;
  }

  createTrackersAndStats(): DownloaderStats {
    return {
      timestamp: Date.now(),
      downloadedBytes: this.ranges.count(FragmentStatus.finished),
      speedTracker: new SpeedTracker(10),
      ranges: this.ranges.ranges,
    }
  }

  async configureResume(): Promise<void> {
    // file already exists?
    if (fs.existsSync(this.saveAs)) {
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
    return this.serverSupportsRanges;
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
    const response = await axios.head(this.url, this.getAxiosOptions());

    if (response.headers && response.headers['content-length']) {
      if (response.headers['accept-ranges'] === 'bytes') {
        // Opportunistic: if the server supports ranges, we can use it
        this.serverSupportsRanges = true;
      }
      return Number(response.headers['content-length']);
    }

    return undefined;
  }

  async queryRangesSupport(): Promise<boolean> {
    try {
      const response = await axios.get(this.url, { ...this.getAxiosOptions(),
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
  async start(): Promise<void> {
    this.status = DownloaderStatus.RUNNING;
    return new Promise(async (resolve, reject) => {
      while(this.status === DownloaderStatus.RUNNING || this.status === DownloaderStatus.RESTARTING || this.status === DownloaderStatus.STOPPING) {
        try {
          await this.startWorkers();
          const fileCRC = await crc32File(this.saveAs);
          this.logger.log(`FileCRC = ${fileCRC}`);
          this.logger.log(`ItemCRC = ${this.sourceObject['crc32']}`);
          this.logger.log(`CRC Check: ${fileCRC === this.sourceObject['crc32'] ? 'OK' : 'FAILED'}`);
          return resolve();
        } catch (err) {
          if (err === WorkerState.STOPPED || err.message === WorkerState.STOPPED) {
            switch (this.status) {
              case DownloaderStatus.STOPPING:
                // Download stopped
                this.debugOutput && this.logger.debug(`Download Stopped! Stopping workers...`);
                await this.waitForWorkersToEnterState(WorkerState.STOPPED);
                this.status = DownloaderStatus.STOPPED;
                return resolve();
              case DownloaderStatus.RESTARTING:
                // Connections reset
                this.debugOutput && this.logger.debug(`Too Slow! Restarting workers...`);
                await this.waitForWorkersToEnterState(WorkerState.STOPPED);
                this.debugOutput && this.logger.debug(`All workers stopped (DownloaderStatus = ${ this.status } - WorkersState = ${ Array.from(this.workers.values()).map((worker) => worker.state).join(', ')})`);
                // Wait 1 second before restarting
                await new Promise((resolve) => setTimeout(resolve, 1000));
                break;
              default:
                this.debugOutput && this.logger.error(`Unexpected Workers Cancellation (${ err.message })`, err.stack);
                this.errorHandler(err);
                return reject(err);
            }
          } else {
            if (err instanceof AxiosError) {
              if (err.response.status === 416) {
                // Range not satisfiable - unknown size, download completed
                this.completedHandler();
                return resolve();
              }

              this.debugOutput && this.logger.error(`Error while running workers (${ err.message })`, err.stack);
              this.errorHandler(err);
              return reject(err);
            }
          }
        }
      }
    });
  }

  async startWorkers(): Promise<void> {
    assert(this.workersCount > 0, 'workersCount must be greater than 0');
    assert(this.chunkSize > 0, 'chunkSize must be greater than 0');
    this.status = DownloaderStatus.RUNNING;

    // Ensure saveAt directory exists
    const saveAsDir = path.dirname(this.saveAs);
    await fsp.mkdir(saveAsDir, { recursive: true });

    // At this point we should have no reserved ranges
    this.ranges.changeAll(FragmentStatus.reserved, FragmentStatus.pending);

    // Tune the workers count based on the file size
    let workersCount: number;
    if (!this.serverSupportsRanges) {
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
      const id = `worker-${i}`;

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

    this.debugOutput && this.logger.debug(`Starting Workers for ${this.saveAs}`);
    this.downloadStartedAt = Date.now();
    await Promise.all(workers);
    this.debugOutput && this.logger.debug('All workers completed');
    this.completedHandler();
  }

  getStats(): DownloaderStats {
    return this.stats;
  }

  getWorkersStats(): WorkerStats[] {
    return Array.from(this.workers.values());
  }

  async stop() {
    this.status = DownloaderStatus.STOPPING;
    this.cancelTokens.forEach((token) => {
      token.cancel(WorkerState.STOPPED);
    });
  }

  /**
   * Wait for all workers to reach a specific status
   */
  protected async waitForWorkersToEnterState(status: WorkerState, onRetry?: () => void ): Promise<void> {
    let lastStateSummary: string;
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (Array.from(this.workers.values()).every((worker) => worker.state === status)) {
          clearInterval(interval);
          resolve();
        } else {
          onRetry && onRetry();
          const stateSummary = Array.from(this.workers.values()).map((worker) => worker.state).join(', ');
          if (stateSummary !== lastStateSummary) {
            this.logger.debug(`Waiting for workers to enter state ${ status } - ${ Array.from(this.workers.values()).map((worker) => worker.state).join(', ') }, Downloader.status = ${ this.status }`);
          }
        }
      }, 100);
    });
  }

  protected completedHandler(): void {
    this.status = DownloaderStatus.COMPLETED;
    if (this.completedCallback) this.completedCallback(this);
  }

  protected errorHandler(error: Error): void {
    this.status = DownloaderStatus.ERROR;
    if (this.errorCallback) this.errorCallback(this, error);
  }

  async restartWorkers() {
    this.status = DownloaderStatus.RESTARTING;
    this.cancelTokens.forEach((token) => {
      token.cancel(WorkerState.STOPPED);
    });
  }

  protected async worker(id: string): Promise<void> {
    const wStats = this.workers.get(id);
    wStats.state = WorkerState.RUNNING;

    while (this.status === DownloaderStatus.RUNNING) {
      const range = this.ranges.findSequenceOfAtLeast(this.chunkSize, FragmentStatus.pending);
      if (!range) {
        wStats.state = WorkerState.STOPPED;
        wStats.range = undefined;
        return;
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
        Range: `bytes=${range.start}-${range.end}`,
      };

      const response = await axios.get(this.url, axiosOpts);
      const stream = response.data;
      const fd = await fsp.open(this.saveAs, 'a+');
      const fileStream = fd.createWriteStream({ start: range.start });

      try {
        await new Promise<void>((resolve, reject) => {
          stream.on('data', (buffer: Buffer) => {
            if (this.status !== DownloaderStatus.RUNNING) {
              cancelToken.cancel(WorkerState.STOPPED);
              return;
            }

            if (this.shouldRestartWorkers()) {
              // Trigger workers restart
              this.restartWorkers();
            }
            this.progressUpdateHandler(buffer.length, id);
          });
          stream.on('error', (err: Error) => {
            fd.close();
            this.ranges.markAs(range.start, range.end, FragmentStatus.pending);
            wStats.state = WorkerState.STOPPED;
            if (err instanceof CanceledError && err.message === WorkerState.STOPPED) {
              // Intentional interruption on
              return reject(WorkerState.STOPPED);
            }

            // Unhandled error
            throw err;
          });
          stream.on('close', () => {
            wStats.state = WorkerState.STOPPED;
            resolve();
          });
          stream.pipe(fileStream);
        });

        // Range completed, loop to next range
        this.ranges.markAs(range.start, range.end, FragmentStatus.finished);
        wStats.rangesCount++;
        await fd.close();
      } catch (err) {
        this.ranges.markAs(range.start, range.end, FragmentStatus.pending);
        wStats.state = WorkerState.STOPPED;
        await fd.close();
        throw err;
      }
    }

    wStats.state = WorkerState.STOPPED;
  }

  /**
   * Check if the download speed is too slow and restart the connections
   */
  shouldRestartWorkers(): boolean {
    return false;
    // // DEBUG: RESET CONNECTIONS 10 sec - restart 10 sec
    // const now = Date.now();
    // if (now - this.downloadStartedAt > 10000) {
    //   this.logger.debug(`[POLICE] ${ prettyTimeOfDay(now) } - ${ prettyTimeOfDay(this.downloadStartedAt) } = ${ prettyTime(now - this.downloadStartedAt) }`);
    //   // 10 sec elapsed, restart connection
    //   return true;
    // }
    //
    // return false;
  }

  /**
   * Update the progress of the downloader
   */
  progressUpdateHandler(length: number, workerId: string): void {
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

    // Call update progress callback if needed
    if (this.progressUpdateInterval === undefined) {
      this.progressCallback && this.progressCallback(this, this.stats);
      return;
    }


    if (now - this.lastProgressUpdateTimestamp >= this.progressUpdateInterval) {
      this.lastProgressUpdateTimestamp = now;
      if (this.progressCallback) this.progressCallback(this, this.stats);

      if (this.logger && this.debugOutput) {
        // print in a single row the rates for each worker
        const rates: string[] = [];
        const now = new Date();
        const from = new Date(Date.now() - 10000);  // last 10 seconds
        this.workers.forEach((data) => {
          // Download rate of worker
          const rate = prettyBytes(data.speedTracker.query(from, now), true);

          // Downloaded bytes of worker (total in his lifetime)
          const bytesDownloaded = prettyBytes(data.downloadedBytes);

          // Percentage of the range downloaded
          if (data.range) {
            const rangeRemaining = data.range ? data.range.end - data.range.start : 0;
            const percentage = ((data.range.downloadedBytes / rangeRemaining) * 100).toFixed(0);

            rates.push(`${rate} - ${bytesDownloaded} - ${percentage}%`);
          }
        });
        this.logger.debug(`${this.saveAs}`);
        this.logger.debug(`${prettyBytes(this.stats.speedTracker.query(from, now), true)} (${rates.join(' | ')})`);
        for (let i=0; i < this.ranges.ranges.length; i++) {
          const range = this.ranges.ranges[i];
          this.logger.debug(`range-${i}: [${range.status}] ${range.start}-${range.end}`);
        }
      }
    }
  }

  get sourceObject(): T {
    return this._sourceObject;
  }
}
