import { Injectable, Logger } from '@nestjs/common';
import PutioAPIClient, { IFile, IPutioAPIClientResponse } from '@putdotio/api-client';
import axios from 'axios';
import { memfs } from 'memfs';
import { Volume } from 'memfs/lib/volume';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { AppConfigService } from '../../configuration';


@Injectable()
export class PutioService {
  private readonly logger = new Logger(PutioService.name);
  private api: PutioAPIClient | null = null;

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

  async getFile(id: number): Promise<IFile> {
    try {
      const api = await this.getApi();
      const files = await this.rateLimitSafeCall(async () => api.Files.Query(id));
      return files.parent;
    } catch (err) {
      this.logger.error(`Error while attempting to get file ${ id } (${ err?.data?.error_message || err?.error_message || 'Unexpected Reason' })`);
      return null;
    }
  }

  async rateLimitSafeCall<T>(apiCall: () => Promise<IPutioAPIClientResponse<T>>): Promise<T> {
    let attempts = 0;
    // Try 100 times to get a successful response
    while (attempts < 100) {
      attempts++;
      try {
        const response = await apiCall();
        return response.data;
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }
        if (axios.isAxiosError(error)) {
          const response = error.response;
          if (response && response.status !== 429) {
            throw error;
          }

          const resetTimestamp = parseInt(response.headers['x-ratelimit-reset']);
          const limit = parseInt(response.headers['x-ratelimit-limit']);
          const remaining = parseInt(response.headers['x-ratelimit-remaining']);
          const currentTime = new Date().getTime() / 1000;
          const waitTime = resetTimestamp - currentTime;
          this.logger.log(
            `Rate limit reached (${ remaining }/${ limit }). Waiting for ${ waitTime } seconds before retrying.`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
        }
      }
    }
  }

  async deleteFile(id: number): Promise<void> {
    try {
      const api = await this.getApi();
      await this.rateLimitSafeCall(async () => await api.Files.Delete([id]));
    } catch (err) {
      this.logger.error(`Error while attempting to delete file ${ id } (${ err.error_message })`);
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
            this.logger.debug(`Download Links response has no links!`, getLinkResponse);
          }
        }
      } catch (err) {
        this.logger.error(`Error while attempting to get download links for ${ putioIds.join(', ') } (${ err.error_message }) - ${ retries } retries remaining.`);
        // sleep for 2 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
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
      let rVal: IVFSNode;
      rVal = {
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
      } catch (err) {
        this.logger.error(`Error while attempting to get files from folder ${ id } (${ err.error_message })`, err.stack);
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
