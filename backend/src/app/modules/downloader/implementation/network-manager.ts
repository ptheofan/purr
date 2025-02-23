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

      response.data.on('data', (chunk: Buffer) => {
        bytesWritten += chunk.length;
        onProgress(chunk.length);
      });

      response.data.pipe(writeStream);

      writeStream.on('finish', () => {
        if (bytesWritten === range.end - range.start + 1) {
          resolve();
        } else {
          reject(new Error(`Range size mismatch: expected ${range.end - range.start + 1}, got ${bytesWritten}`));
        }
      });

      writeStream.on('error', reject);
      response.data.on('error', reject);
    });
  }
}
