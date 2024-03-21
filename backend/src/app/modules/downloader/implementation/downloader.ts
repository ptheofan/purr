import { Logger } from '@nestjs/common';
import { FragmentStatus } from '../dtos';
import { Ranges } from './ranges';
import axios, { AxiosRequestConfig, CanceledError, CancelTokenSource, ResponseType } from 'axios';
import http from 'http';
import https from 'https';
import { strict as assert } from 'assert';
import fsp from 'node:fs/promises';
import { SpeedTracker } from '../plugins';
import { prettyBytes } from '../../../helpers';
import * as path from 'path';
import {
  CompletedCallback,
  DownloaderOpts,
  DownloaderStatus,
  DownloaderStats,
  ErrorCallback,
  IDownloader,
  ProgressCallback,
  WorkerStats,
} from './downloader.interface';
import fs from 'fs';

export interface ResumableDownloaderOpts {
  httpAgent?: http.Agent;
  httpsAgent?: https.Agent;
  progressUpdateInterval?: number; // ms
  // getResumeData?: DownloadGetResumeDataCallback;
  onProgress?: ProgressCallback;
  onCompleted?: CompletedCallback;
  onError?: ErrorCallback;
}

export class Downloader<T> implements IDownloader {
  private sourceObject: T;
  private ranges: Ranges;
  private serverSupportsRanges?: boolean = undefined;
  private cancelTokens: Map<string, CancelTokenSource> = new Map();
  private httpAgent: http.Agent;
  private httpsAgent: https.Agent;
  private url: string;
  private saveAs: string;
  private fileSize: number;
  private workersCount: number;
  private chunkSize: number;
  private stats: DownloaderStats;
  private workerStats: Map<string, WorkerStats> = new Map();
  private progressUpdateInterval?: number; // ms
  private progressCallback?: ProgressCallback;
  private completedCallback?: CompletedCallback;
  private errorCallback?: ErrorCallback;
  protected status: DownloaderStatus;
  private lastProgressUpdateTimestamp = 0;
  private debugOutput = true;
  private maxRedirects: number = 3;
  private logger: Logger | null;

  /**
   * Create a downloader
   * Call the start method to begin
   * @param opts
   */
  static async create<T>(opts: DownloaderOpts<T>): Promise<Downloader<T>> {
    const downloader = new Downloader<T>();
    downloader.logger = opts.disableLogging ? null : new Logger('Downloader');
    downloader.sourceObject = opts.sourceObject;
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
    downloader.status = opts.status || DownloaderStatus.RUNNING;
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
    downloader.stats = {
      timestamp: Date.now(),
      downloadedBytes: downloader.ranges.count(FragmentStatus.finished),
      speedTracker: new SpeedTracker(10),
      workers: Array.from(downloader.workerStats.values()),
      ranges: downloader.ranges.ranges,
    };

    if (downloader.isResumable()) {
      await downloader.configureResume();
    }

    return downloader;
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

  async start(): Promise<void> {
    assert(this.workersCount > 0, 'workersCount must be greater than 0');
    assert(this.chunkSize > 0, 'chunkSize must be greater than 0');

    // Ensure saveAt directory exists
    const saveAsDir = path.dirname(this.saveAs);
    await fsp.mkdir(saveAsDir, { recursive: true });

    // Configure Workers
    const workers: Promise<void>[] = [];
    for (let i = 0; i < this.workersCount; i++) {
      const id = `worker-${i}`;
      // Initialize worker stats
      this.workerStats.set(id, {
        id: id,
        timestamp: Date.now(),
        speedTracker: new SpeedTracker(0, true),
        rangesCount: 0,
        downloadedBytes: 0,
      });

      // Push worker to workers list
      workers.push(this.worker(id));
    }

    try {
      if (this.logger) {
        this.logger.log(`Starting download ${this.saveAs}`);
      }
      await Promise.all(workers);
      if (this.logger && this.debugOutput) this.logger.debug('All workers completed');
      this.completedHandler();
    } catch (err) {
      if (!(err instanceof CanceledError)) {
        if (this.logger && this.debugOutput) this.logger.debug(`Error while running workers (${err.message})`, err.trace);
        this.errorHandler(err);
      }
    }
  }


  getStats(): DownloaderStats {
    return this.stats;
  }

  async pause() {
    this.cancelTokens.forEach((token) => {
      token.cancel('paused');
    });
    this.status = DownloaderStatus.PAUSED;
  }

  protected completedHandler(): void {
    this.status = DownloaderStatus.COMPLETED;
    if (this.completedCallback) this.completedCallback(this);
  }

  protected errorHandler(error: Error): void {
    this.status = DownloaderStatus.ERROR;
    if (this.errorCallback) this.errorCallback(this, error);
  }


  protected async worker(id: string): Promise<void> {
    const stats = this.workerStats.get(id);
    while (true) {
      const range = this.ranges.findSequenceOfAtLeast(this.chunkSize, FragmentStatus.pending);
      if (!range) {
        if (this.logger && this.debugOutput) this.logger.debug(`[${id}] Worker Finished`);
        return;
      }

      this.ranges.markAs(range.start, range.end, FragmentStatus.reserved);
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

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (buffer: Buffer) => {
          this.progressUpdateHandler(buffer.length, id);
        });
        stream.on('error', (err) => {
          fd.close();
          if (err === 'paused') {
            resolve();
            return;
          }

          // something went wrong...
          if (this.logger && this.debugOutput) this.logger.debug(`[${id}] Error downloading range ${range.start}-${range.end} --- ${err.message}`);
          this.ranges.markAs(range.start, range.end, FragmentStatus.pending);
          reject(err);
        });
        stream.pipe(fileStream);
        fileStream.on('close', () => {
          fd.close();
          this.ranges.markAs(range.start, range.end, FragmentStatus.finished);
          resolve();
        });
      });

      await fd.close();
      stats.rangesCount++;
      this.ranges.markAs(range.start, range.end, FragmentStatus.finished);
    }
  }

  public progressUpdateHandler(length: number, workerId: string): void {
    // progress tracking....
    const now = Date.now();
    const workerStats = this.workerStats.get(workerId);

    workerStats.timestamp = now;
    workerStats.speedTracker.update(now, length);
    workerStats.downloadedBytes += length;

    this.stats.timestamp = now;
    this.stats.speedTracker.update(now, length);
    this.stats.downloadedBytes += length;

    // Call update progress callback if needed
    if (this.progressUpdateInterval !== undefined) {
      if (now - this.lastProgressUpdateTimestamp >= this.progressUpdateInterval) {
        this.lastProgressUpdateTimestamp = now;
        if (this.progressCallback) this.progressCallback(this, this.stats);

        if (this.logger && this.debugOutput) {
          // print in a single row the rates for each worker
          const rates: string[] = [];
          const now = new Date();
          const from = new Date(Date.now() - 10000);  // last 10 seconds
          for (const [id, stats] of this.workerStats.entries()) {
            rates.push(`${id}: ${prettyBytes(stats.speedTracker.query(from, now), true)}`);
          }
          this.logger.debug(`${this.saveAs}`);
          this.logger.debug(`${prettyBytes(this.stats.speedTracker.query(from, now), true)} (${rates.join(' | ')})`);
          for (let i=0; i < this.ranges.ranges.length; i++) {
            const range = this.ranges.ranges[i];
            this.logger.debug(`range-${i}: [${range.status}] ${range.start}-${range.end}`);
          }
        }
      }
    } else {
      // report progress every time
      if (this.progressCallback) this.progressCallback(this, this.stats);
    }
  }
}
