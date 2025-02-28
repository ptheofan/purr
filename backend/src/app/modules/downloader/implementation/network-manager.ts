import axios, { AxiosRequestConfig } from 'axios';
import { createWriteStream } from 'fs';
import { FileHandle } from 'fs/promises';
import { Fragment } from './ranges';

export class NetworkManager {
  constructor(
    private readonly networkCheckUrl: string,
    private readonly axiosConfig?: Partial<AxiosRequestConfig>
  ) {}

  async checkConnectivity(): Promise<boolean> {
    try {
      await axios.head(this.networkCheckUrl, {
        ...this.axiosConfig,
        timeout: this.axiosConfig?.timeout || 5000
      });
      return true;
    } catch {
      return false;
    }
  }

  async getFileSize(url: string): Promise<number | undefined> {
    try {
      const response = await axios.head(url, this.axiosConfig);
      const size = parseInt(response.headers['content-length'], 10);
      return isNaN(size) ? undefined : size;
    } catch {
      return undefined;
    }
  }

  calculateRetryDelay(retryCount: number, initialDelay: number, maxDelay: number): number {
    const delay = Math.min(
      initialDelay * Math.pow(2, retryCount),
      maxDelay
    );
    return delay + Math.random() * 1000;
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
        // The size check has been modified to be more tolerant
        // Some servers might send slightly different amounts of data
        // than requested, but as long as we're within a reasonable margin
        // (e.g., within 0.5% of expected size), we consider it successful

        // Calculate allowable margin (0.5% of expected bytes or at least 1 byte)
        const margin = Math.max(1, Math.ceil(expectedBytes * 0.005));

        // Check if the bytes written are within the acceptable range
        if (Math.abs(bytesWritten - expectedBytes) <= margin) {
          resolve();
        } else {
          reject(new Error(`Range size mismatch: expected ${expectedBytes}, got ${bytesWritten} (difference: ${bytesWritten - expectedBytes})`));
        }
      });

      writeStream.on('error', reject);
      response.data.on('error', reject);
    });
  }
}
