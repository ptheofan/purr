import { Injectable, Logger } from '@nestjs/common';
import PutioAPIClient, { IFile, IPutioAPIClientResponse, Transfer } from '@putdotio/api-client';
import { memfs } from 'memfs';
import { Volume } from 'memfs/lib/volume';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { AppConfigService } from '../../configuration';
import { waitFor } from '../../../helpers/promises.helper';
import {
  extractErrorInfo,
  isRateLimitError,
  calculateWaitTimeFromError,
  formatErrorForLogging,
} from '../../../helpers/error-extractor.helper'


@Injectable()
export class PutioService {
  private readonly logger = new Logger(PutioService.name);
  private api: PutioAPIClient | null = null;
  private readonly MAX_RETRY_ATTEMPTS = 10;
  private readonly DEFAULT_RATE_LIMIT_WAIT = 60; // Default wait time in seconds if no header

  constructor(
    private readonly config: AppConfigService,
  ) {}

  async getAuthToken(): Promise<string> {
    return this.config.putioAuth;
  }

  async getClientId(): Promise<number> {
    return this.config.putioClientId;
  }

  async getClientSecret(): Promise<string> {
    return this.config.putioClientSecret;
  }

  async getApi(): Promise<PutioAPIClient> {
    if (!this.api) {
      this.api = new PutioAPIClient({
        clientID: await this.getClientId(),
      });
      this.api.setToken(await this.getAuthToken());
    }

    return this.api;
  }

  async getTransfer(id: number): Promise<Transfer> {
    try {
      const api = await this.getApi();
      const transfers = await this.rateLimitSafeCall(async () => api.Transfers.Get(id));
      return transfers.transfer;
    } catch (err) {
      const errorInfo = extractErrorInfo(err);
      this.logger.error(
        `Failed to get transfer ${id}: ${formatErrorForLogging(errorInfo)}`
      );
      return null;
    }
  }

  async getFile(id: number): Promise<IFile> {
    try {
      const api = await this.getApi();
      const files = await this.rateLimitSafeCall(async () => api.Files.Query(id));
      return files.parent;
    } catch (err) {
      const errorInfo = extractErrorInfo(err);
      this.logger.error(
        `Failed to get file ${id}: ${formatErrorForLogging(errorInfo)}`
      );
      return null;
    }
  }

  async getPathsOfFiles(ids: number[]): Promise<{ id: number, path: string }[]> {
    const uniqueIds = Array.from(new Set(ids));
    const files: { [id: number]: IFile } = {};

    while(uniqueIds.length > 0) {
      const id = uniqueIds.pop();
      const file = await this.getFile(id);
      if (file) {
        files[id] = file;
        if (file.parent_id && !files[file.parent_id]) {
          uniqueIds.push(file.parent_id);
        }
      }
    }

    const rVal: { id: number, path: string }[] = [];
    for (const id of ids) {
      const file = files[id];
      if (file) {
        const path = [];
        let currentFile = file;
        while(currentFile) {
          path.unshift(currentFile.name);
          currentFile = files[currentFile.parent_id];
        }

        rVal.push({
          id,
          path: `/${path.join('/')}`,
        });
      }
    }

    return rVal;
  }

  /**
   * Safely execute Put.io API calls with automatic rate limit handling.
   *
   * Put.io Rate Limiting (Official Documentation):
   * - Rate limits are applied per token and IP address
   * - Limits vary per endpoint and request frequency
   * - Response status: 429 when rate limited
   * - Headers included in 429 responses:
   *   - X-RateLimit-Remaining: Number of requests remaining in current window
   *   - X-RateLimit-Limit: Total number of requests allowed in the window
   *   - X-RateLimit-Reset: Unix timestamp when the rate limit resets
   *
   * This method implements exponential backoff retry logic that respects
   * these official headers for optimal rate limit handling.
   */
  async rateLimitSafeCall<T>(apiCall: () => Promise<IPutioAPIClientResponse<T>>): Promise<T> {
    let attempts = 0;
    let lastErrorInfo: ReturnType<typeof extractErrorInfo> | null = null;

    while (attempts < this.MAX_RETRY_ATTEMPTS) {
      attempts++;
      try {
        const response = await apiCall();
        return response.data;
      } catch (error) {
        // Extract comprehensive error information
        const errorInfo = extractErrorInfo(error);
        lastErrorInfo = errorInfo;

        // If it's not a rate limit error, throw immediately
        if (!isRateLimitError(errorInfo)) {
          this.logger.error(
            `API call failed: ${formatErrorForLogging(errorInfo)}`
          );
          throw error;
        }

        // Handle rate limit error
        const waitTime = calculateWaitTimeFromError(errorInfo, this.DEFAULT_RATE_LIMIT_WAIT);

        this.logger.log(
          `Rate limit hit (attempt ${attempts}/${this.MAX_RETRY_ATTEMPTS}). ` +
          `Waiting ${waitTime.toFixed(1)} seconds before retrying... ` +
          `[${errorInfo.rateLimitRemaining ?? '?'}/${errorInfo.rateLimitLimit ?? '?'} remaining]`
        );

        // Add exponential backoff for safety
        const backoffTime = Math.min(waitTime * Math.pow(1.1, attempts - 1), 300); // Cap at 5 minutes
        await waitFor({ sec: backoffTime });
      }
    }

    // If we've exhausted all attempts, throw the last error
    this.logger.error(
      `Failed after ${this.MAX_RETRY_ATTEMPTS} attempts: ${lastErrorInfo ? formatErrorForLogging(lastErrorInfo) : 'Unknown error'}`
    );
    throw lastErrorInfo?.originalError || new RuntimeException('Rate limit retry attempts exhausted');
  }

  async deleteItem(id: number): Promise<void> {
    try {
      const api = await this.getApi();
      await this.rateLimitSafeCall(async () => await api.Files.Delete([id]));
    } catch (err) {
      const errorInfo = extractErrorInfo(err);
      this.logger.error(
        `Failed to delete file ${id}: ${formatErrorForLogging(errorInfo)}`
      );
    }
  }

  async getDownloadLinks(putioIds: number[], maxAttempts: number = 10): Promise<string[]> {
    if (putioIds.length === 0) {
      throw new RuntimeException('No putio ids provided, cannot get download links.');
    }

    const api = await this.getApi();
    let retries = 0;
    while(retries < maxAttempts) {
      try {
        retries++;
        const createLinkResponse = await this.rateLimitSafeCall(async () => await api.DownloadLinks.Create({ ids: putioIds }));
        if (createLinkResponse.id) {
          const getLinkResponse = await this.rateLimitSafeCall(async () => await api.DownloadLinks.Get(createLinkResponse.id));
          if (getLinkResponse.links) {
            // Putio returns the links in random order, extract the
            // ids from the url and match them with the putioIds to
            // return them in the expected order
            const links = getLinkResponse.links.download_links;
            const rVal: string[] = [];
            for (const link of links) {
              const match = link.match(/\/files\/(\d+)\//);
              if (match) {
                const id = parseInt(match[1]);
                const index = putioIds.indexOf(id);
                if (index !== -1) {
                  rVal[index] = link;
                }
              }
            }

            return rVal;
          } else {
            this.logger.debug(`Download Links response has no links (${ putioIds.join(', ') })!`, getLinkResponse);
          }
        }
      } catch (err) {
        const errorInfo = extractErrorInfo(err);
        this.logger.error(
          `Failed to get download links for [${putioIds.join(', ')}]: ${formatErrorForLogging(errorInfo)} ` +
          `(${maxAttempts - retries} retries remaining)`
        );
      }
      // sleep for 2 seconds before retrying
      await waitFor({ sec: 2 });
    }

    throw new RuntimeException(`Failed to get download links for ${ putioIds.join(', ') } after ${ retries } attempts`);
  }

  /**
   * Return a volume structure for a given id
   * For example it will return something like this:
   * Each folder has a .meta file.
   * This file represents the stringified IFIle object for the folder
   * Each file value is a stringified IFile object
   *
   * Background Info, Why Stringified?
   * We stringify the IFile object, so we can store it in the memfs as content of
   * the file. If we assign the object itself it will treat the file as a folder
   * and each key in the json as file with values.
   *
   * Shows/
   *    │  ├─ .meta
   *    │  └─ CSI.Vegas.S03E02.1080p.x265-ELiTE/
   *    │     ├─ .meta
   *    │     ├─ cover.jpg
   *    │     └─ Screens/
   *    │        └─ .meta
   *
   */
  async getVolume(id: number): Promise<Volume | null> {
    const rootNode = await this.getVolumeInternal(id);
    if (!rootNode) {
      return null;
    }

    const { vol } = memfs(rootNode);
    return vol;
  }

  /**
   * Used by getVolume to get all files and folders from a given id.
   * This is not meant to be used anywhere else. We just need it as
   * the recursive body of getVolume
   */
  private async getVolumeInternal(id: number, knownIdFileInfo?: IFile): Promise<IVFSNode | null> {
    const file: IFile = knownIdFileInfo || await this.getFile(id);
    if (!file) {
      throw new RuntimeException(`File with id ${ id } not found`);
    }

    if (file.file_type === 'FOLDER') {
      // I am a folder, create my structure and add all my files and folders
      const rVal: IVFSNode = {
        [file.name]: {
          ['.meta']: JSON.stringify(file),
        },
      };

      // This is a folder, so initialize create a folder structure
      const api = await this.getApi();
      try {
        const files = await this.rateLimitSafeCall(async () => await api.Files.Query(id));
        for (const f of files.files) {
          // This is a folder, recurse to get all files and folders from it
          if (f.file_type === 'FOLDER') {
            rVal[file.name] = {
              ...rVal[file.name] as IVFSNode,
              ...(await this.getVolumeInternal(f.id)),
            };
          } else {
            rVal[file.name][f.name] = JSON.stringify(f);
          }
        }
      } catch (err: any) {
        this.logger.error(
          `Error while attempting to get files from folder ${id}: ${err?.data?.error_message || err?.error_message || err?.message || 'Unknown error'}`,
          err?.stack
        );
      }

      return rVal;
    } else {
      // If this is a file return it as a file, nothing more to do
      return {
        [file.name]: JSON.stringify(file),
      };
    }
  }
}


interface IVFSNode {
  [name: string]: IFile | IVFSNode | string;
}
