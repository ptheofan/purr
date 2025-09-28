import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { createWriteStream } from 'fs';
import { FileHandle } from 'fs/promises';
import { Fragment } from './ranges';
import { Logger } from '@nestjs/common';
import { NetworkError } from '../errors/download.errors';

export class NetworkManager {
  private readonly logger = new Logger(NetworkManager.name);
  private networkCheckUrl?: string;
  private axiosConfig?: Partial<AxiosRequestConfig>;
  private bytesTolerancePercent: number = 0.1; // Default 0.1% tolerance instead of 0.5%
  private disposed = false;

  constructor() {
    this.logger.debug('NetworkManager instance created');
  }

  /**
   * Configure the network manager with specific settings
   */
  configure(
    networkCheckUrl: string,
    axiosConfig?: Partial<AxiosRequestConfig>,
    bytesTolerancePercent: number = 0.1
  ): void {
    if (this.disposed) {
      throw new Error('Cannot configure disposed NetworkManager');
    }

    this.networkCheckUrl = networkCheckUrl;
    this.axiosConfig = axiosConfig;
    this.bytesTolerancePercent = bytesTolerancePercent;

    this.logger.debug(`NetworkManager configured with check URL: ${networkCheckUrl}`);
  }

  async checkConnectivity(): Promise<boolean> {
    if (!this.networkCheckUrl) {
      throw new Error('NetworkManager not configured. Call configure() first.');
    }
    if (this.disposed) {
      throw new Error('Cannot check connectivity on disposed NetworkManager');
    }

    try {
      await axios.head(this.networkCheckUrl, {
        ...this.axiosConfig,
        timeout: this.axiosConfig?.timeout || 5000
      });
      this.logger.debug('Network connectivity check: OK');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Network connectivity check failed: ${errorMessage}`);
      return false;
    }
  }

  async getFileSize(url: string): Promise<number | undefined> {
    if (this.disposed) {
      throw new Error('Cannot get file size on disposed NetworkManager');
    }

    try {
      const response = await axios.head(url, this.axiosConfig);
      const size = parseInt(response.headers['content-length'], 10);

      if (isNaN(size)) {
        this.logger.warn(`No content-length header in response from ${url}`);
        return undefined;
      }

      this.logger.debug(`File size for ${url}: ${size} bytes`);
      return size;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(`Failed to get file size from ${url}: ${error.message}`);
        throw new NetworkError(
          `Failed to get file size: ${error.message}`,
          error.response?.status,
          url,
          undefined,
          error
        );
      }
      throw error;
    }
  }

  calculateRetryDelay(retryCount: number, initialDelay: number, maxDelay: number): number {
    const delay = Math.min(
      initialDelay * Math.pow(2, retryCount),
      maxDelay
    );
    const jitter = Math.random() * 1000;
    const totalDelay = delay + jitter;

    this.logger.debug(`Retry ${retryCount}: delay ${totalDelay}ms (base: ${delay}ms, jitter: ${jitter.toFixed(0)}ms)`);
    return totalDelay;
  }

  /**
   * Dispose of this manager and clean up resources
   */
  dispose(): void {
    if (this.disposed) return;

    this.logger.debug('Disposing NetworkManager');
    this.disposed = true;

    // Clear sensitive data
    this.networkCheckUrl = undefined;
    this.axiosConfig = undefined;
  }

  /**
   * Check if manager is disposed
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  async downloadRange(
    range: Pick<Fragment, 'start' | 'end'>,
    url: string,
    fileHandle: Pick<FileHandle, 'fd'>,
    abortSignal: AbortSignal,
    onProgress: (bytes: number) => void
  ): Promise<void> {
    const response = await axios({
      ...this.axiosConfig,
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers: {
        ...(this.axiosConfig?.headers || {}),
        Range: `bytes=${range.start}-${range.end}`
      },
      signal: abortSignal,
      timeout: this.axiosConfig?.timeout || 30000
    });

    const writeStream = createWriteStream(null, {
      fd: fileHandle.fd,
      start: range.start,
      autoClose: false
    });

    return new Promise<void>((resolve, reject) => {
      let bytesWritten = 0;
      const expectedBytes = range.end - range.start + 1;

      response.data.on('data', (chunk: Buffer) => {
        bytesWritten += chunk.length;
        onProgress(chunk.length);
      });

      response.data.pipe(writeStream);

      writeStream.on('finish', () => {
        // Some servers might send slightly different amounts of data than requested
        // Use configurable tolerance to handle minor discrepancies
        const toleranceRatio = this.bytesTolerancePercent / 100;
        const margin = Math.max(1, Math.ceil(expectedBytes * toleranceRatio));

        if (Math.abs(bytesWritten - expectedBytes) <= margin) {
          resolve();
        } else {
          reject(new Error(`Range size mismatch: expected ${expectedBytes}, got ${bytesWritten} (difference: ${bytesWritten - expectedBytes}, tolerance: ${margin} bytes)`));
        }
      });

      writeStream.on('error', reject);
      response.data.on('error', reject);
    });
  }
}
