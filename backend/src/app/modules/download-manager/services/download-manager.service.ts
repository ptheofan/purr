import { Injectable, Logger } from '@nestjs/common';
import { Volume } from 'memfs/lib/volume';
import { DownloadGroupsRepository, DownloadItemsRepository } from '../repositories';
import { crc32File, getFirstFileOrFolder, getMeta } from '../../../helpers';
import { Group, Item } from '../entities';
import { DownloadStatus } from '../enums';
import { Downloader, DownloaderFactory } from '../../downloader';
import { Mutex } from 'async-mutex';
import { PutioService } from '../../putio';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import * as path from 'path';
import * as fs from 'fs';
import { AppConfigService } from '../../configuration';

export interface IDownloadManagerSettings {
  concurrentLargeFiles?: number;
  concurrentSmallFiles?: number;
  concurrentGroups?: number;
  smallFileThreshold?: number;
}

export type TAddVolumeResponse = {
  success: boolean;
} & ({ success: true; groups: number; items: number } | { success: false; message: string });

const startMutex = new Mutex();

@Injectable()
export class DownloadManagerService {
  private readonly logger = new Logger(DownloadManagerService.name);
  private concurrentLargeFiles: number;
  private concurrentSmallFiles: number;
  private concurrentGroups: number;
  private smallFileThreshold: number = 1024 * 1024 * 10; // 10MB

  constructor(
    private readonly groupsRepo: DownloadGroupsRepository,
    private readonly itemsRepo: DownloadItemsRepository,
    private readonly downloaderFactory: DownloaderFactory,
    private readonly putioService: PutioService,
    private readonly appConfig: AppConfigService,
  ) {
    this.concurrentGroups = appConfig.concurrentGroups;
    this.concurrentSmallFiles = appConfig.concurrentSmallFiles;
    this.concurrentLargeFiles = appConfig.concurrentLargeFiles;
  }

  setSettings(settings: IDownloadManagerSettings) {
    this.concurrentLargeFiles = settings.concurrentLargeFiles === undefined ? this.concurrentLargeFiles : settings.concurrentLargeFiles;
    this.concurrentSmallFiles = settings.concurrentSmallFiles === undefined ? this.concurrentSmallFiles : settings.concurrentSmallFiles;
    this.concurrentGroups = settings.concurrentGroups === undefined ? this.concurrentGroups : settings.concurrentGroups;
    this.smallFileThreshold = settings.smallFileThreshold === undefined ? this.smallFileThreshold : settings.smallFileThreshold;
  }

  getSettings(): IDownloadManagerSettings {
    return {
      concurrentLargeFiles: this.concurrentLargeFiles,
      concurrentSmallFiles: this.concurrentSmallFiles,
      concurrentGroups: this.concurrentGroups,
      smallFileThreshold: this.smallFileThreshold,
    };
  }

  /**
   * Add a Volume to the download manager.
   * You need to call start() to start the download queue.
   */
  async addVolume(volume: Volume, saveAt: string): Promise<TAddVolumeResponse> {
    const files = volume.readdirSync('/', { recursive: true });
    if (files.length === 0) {
      return {
        success: true,
        groups: 0,
        items: 0,
      };
    }

    const group = new Group();
    const firstNodeMeta = await getMeta(await getFirstFileOrFolder(volume), volume);
    if (await this.groupsRepo.find((group) => group.id === firstNodeMeta.id)) {
      // Group already exists
      return {
        success: false,
        message: 'Group already exists.',
      };
    }
    group.id = firstNodeMeta.id;
    group.name = firstNodeMeta.name;
    group.saveAt = saveAt;
    await this.groupsRepo.add(group);

    const items: Item[] = [];
    for (const file of files) {
      const path = file as string;
      // is it a directory or file?
      const isDirectory = volume.statSync(path).isDirectory();
      if (isDirectory || path.endsWith('/.meta')) {
        continue;
      }

      const meta = await getMeta(path, volume);
      const parentPath = path.substring(0, path.lastIndexOf('/'));
      items.push({
        id: meta.id,
        name: meta.name,
        groupId: group.id,
        size: meta.size,
        crc32: meta.crc32,
        relativePath: parentPath.length > 0 ? parentPath : '/',
        downloadLink: meta.downloadLink,
        status: DownloadStatus.Pending,
      } as Item);
    }

    // Sort the items by size, smaller files first
    items.sort((a, b) => a.size - b.size);

    // ensure all items are unique in the repo
    const uniqueItems = items.filter((item, index, self) => self.findIndex((i) => i.id === item.id) === index);
    await this.itemsRepo.addMany(uniqueItems);

    // Check if the items are already downloaded and update them accordingly
    await this.checkGroupItemsOnDisk(group.id);

    return {
      success: true,
      groups: 1,
      items: uniqueItems.length,
    };
  }

  /**
   * Check if the items of a group already exist on the disk
   * If they do verify (CRC32) they are correct and mark them as completed
   * If they do not exist, mark them as pending
   * If they exist but the CRC32 does not match, mark them as pending and delete the local files
   */
  async checkGroupItemsOnDisk(groupId: number) {
    const group = await this.groupsRepo.find((group) => group.id === groupId);
    const items = await this.itemsRepo.filter((item) => item.groupId === groupId);
    for (const item of items) {
      const saveAs = await this.computeDownloadSavePath(item, group);
      // if saveAs exists in local fs verify CRC32
      if (fs.existsSync(saveAs)) {
        const crc32 = await crc32File(saveAs);
        if (crc32 !== item.crc32) {
          // If the file exists but the CRC32 does not match, mark the item as pending
          await this.itemsRepo.update(item.id, { status: DownloadStatus.Pending });
          // remove the file
          fs.unlinkSync(saveAs);
        } else {
          // If the file exists and the CRC32 matches, mark the item as completed
          await this.itemsRepo.update(item.id, { status: DownloadStatus.Completed });
        }
      }
    }
  }

  async computeDownloadSavePath(item: Item, group: Group) {
    return path.join(group.saveAt, item.relativePath, item.name);
  }

  /**
   * Determine which groups are eligible for download and return them
   * Utilize the concurrency settings to determine which groups can be downloaded
   */
  async getDownloadGroupCandidates(): Promise<Group[]> {
    if (this.concurrentGroups < 1) {
      return await this.groupsRepo.filter(group => group.status === DownloadStatus.Downloading || group.status === DownloadStatus.Pending);
    }

    const downloadingGroups = await this.groupsRepo.filter(group => group.status === DownloadStatus.Downloading);
    if (downloadingGroups.length >= this.concurrentGroups) {
      return downloadingGroups;
    }

    const pendingGroups = await this.groupsRepo.filter(group => group.status === DownloadStatus.Pending);
    const rVal = downloadingGroups;
    const pendingGroupsToAdd = Math.min(this.concurrentGroups - downloadingGroups.length, pendingGroups.length);
    for (let i = 0; i < pendingGroupsToAdd; i++) {
      rVal.push(pendingGroups[i]);
    }
    return rVal;
  }

  /**
   * Determine which items are eligible for download and return them
   * Utilize the concurrency settings to determine which items can be downloaded
   */
  async getDownloadItemCandidates(groups: Group[]): Promise<Item[]> {
    const downloadingItemsCounters = (await this.itemsRepo.getAll()).reduce((acc, item) => {
      if (item.status === DownloadStatus.Downloading) {
        if (item.size <= this.smallFileThreshold) {
          acc.smallFilesCount++;
        } else {
          acc.largeFilesCount++;
        }
      }
      return acc;
    }, { smallFilesCount: 0, largeFilesCount: 0 });

    // Check if the downloading limits are already reached
    if (downloadingItemsCounters.smallFilesCount >= this.concurrentSmallFiles && downloadingItemsCounters.largeFilesCount >= this.concurrentLargeFiles) {
      return [];
    }

    const rVal: Item[] = [];
    for (const group of groups) {
      const items = await this.itemsRepo.filter(item => item.groupId === group.id && item.status === DownloadStatus.Pending);
      const { smallFiles, largeFiles } = items.reduce((acc, item) => {
        if (item.size > this.smallFileThreshold && downloadingItemsCounters.largeFilesCount + acc.largeFiles.length < this.concurrentLargeFiles) {
          acc.largeFiles.push(item);
        } else if (downloadingItemsCounters.smallFilesCount + acc.smallFiles.length < this.concurrentSmallFiles) {
          acc.smallFiles.push(item);
        }
        return acc;
      }, { smallFiles: [], largeFiles: [] });

      // Download the small files according to concurrency settings
      while (downloadingItemsCounters.smallFilesCount < this.concurrentSmallFiles && smallFiles.length > 0) {
        const item = smallFiles.shift();
        downloadingItemsCounters.smallFilesCount++;
        rVal.push(item);
      }

      // Download the large files according to concurrency settings
      while (downloadingItemsCounters.largeFilesCount < this.concurrentLargeFiles && largeFiles.length > 0) {
        const item = largeFiles.shift();
        downloadingItemsCounters.largeFilesCount++;
        rVal.push(item);
      }

      // Check if the downloading limits are already reached
      if (downloadingItemsCounters.smallFilesCount >= this.concurrentSmallFiles && downloadingItemsCounters.largeFilesCount >= this.concurrentLargeFiles) {
        break;
      }
    }

    return rVal;
  }

  /**
   * Start the download queue
   */
  async start() {
    return startMutex.runExclusive(async () => {
      try {
        const groups = await this.getDownloadGroupCandidates();
        if (groups.length === 0) {
          return;
        }

        const items = await this.getDownloadItemCandidates(groups);
        if (items.length === 0) {
          return;
        }

        // Get download links for all items to download
        // We retrieve the with minimum possible number of calls to prevent
        // possible rate limiting from putio
        let links: string[] = [];
        try {
          links = await this.putioService.getDownloadLinks(items.map(item => item.id));
        } catch (error) {
          this.logger.error('Failed to get download links from putio.', error);
          return;
        }

        // assign the download links to the items and start downloading them
        await Promise.all(items.map(async (item, index) => {
          items[index].downloadLink = links[index];
          const group = groups.find(group => group.id === items[index].groupId);
          const saveAs = await this.computeDownloadSavePath(items[index], group);
          return this.download(items[index], saveAs);
        }));
      } catch (error) {
        this.logger.error(error);
      }
    });
  }

  protected async download(item: Item, saveAs: string) {
    if (!item.downloadLink) {
      // Get the download link from putio
      throw new RuntimeException(`Download link for item ${ item.id } is not available.`);
    }

    await this.updateItemStatus(item.id, DownloadStatus.Downloading);

    try {
      const downloader = await this.downloaderFactory.create({
        sourceObject: item,
        url: item.downloadLink,
        saveAs: saveAs,
        progressUpdateInterval: this.appConfig.uiProgressUpdateInterval,
        debugOutput: true,
        disableLogging: false,
        workersCount: item.size <= this.smallFileThreshold ? 1 : 4,
        fileSize: item.size,
        chunkSize: this.appConfig.downloaderChunkSize,
        autoRestartCallback: this.downloadAutoRestartCallback.bind(this),
        progressCallback: undefined,
        completedCallback: undefined,
        errorCallback: undefined,
      });

      downloader.start()
        .then(async () => {
          await this.updateItemStatus(item.id, DownloadStatus.Completed);
          try {
            // await this.putioService.deleteFile(item.id);
          } catch (error) {
            this.logger.error(`Downloader completed successfully but failed to delete the file ${ item.id } from putio.`, error);
          }
          await this.start();
        })
        .catch(async (error) => {
          await this.updateItemStatus(item.id, DownloadStatus.Error);
          this.logger.error(`download ${ item.name } failed! ${ error.error_message }`, error.stack);
          await this.start();
        });
    } catch (error) {
      this.logger.error(error);
      await this.itemsRepo.update(item.id, {
        status: DownloadStatus.Error,
        error: error instanceof Error ? error.message : error as string
      });
      await this.start();
    }
  }

  async updateItemStatus(id: number, status: DownloadStatus) {
    const item = await this.itemsRepo.find((item) => item.id === id);
    if (!item) {
      throw new RuntimeException(`Cannot update item ${ id } status. Item not found.`);
    }

    const group = await this.groupsRepo.find((group) => group.id === item.groupId);
    if (!group) {
      throw new RuntimeException(`Cannot update item ${ id } status. Group not found.`);
    }
    await this.itemsRepo.update(id, { status });

    // If the item is completed, check if the group is completed
    if (status === DownloadStatus.Completed || status === DownloadStatus.Error) {
      const groupItems = await this.itemsRepo.filter((item) => item.groupId === group.id);
      const completedItems = groupItems.filter((item) => item.status === DownloadStatus.Completed || item.status === DownloadStatus.Error);
      if (groupItems.length === completedItems.length) {
        await this.groupsRepo.update(group.id, { status: DownloadStatus.Completed });
      }
    }
  }

  async groupExists(id: number) {
    return await this.groupsRepo.find((group) => group.id === id) !== undefined;
  }

  downloadAutoRestartCallback(downloader: Downloader<any>): boolean {
    if (!this.appConfig.downloaderPerformanceMonitoringEnabled) {
      return false;
    }

    const timeElapsedThreshold = 1000 * this.appConfig.downloaderPerformanceMonitoringTime;

    // Time elapsed since last workers restart in ms
    const timeElapsed = Date.now() - downloader.getStats().workersRestartedAt.getTime();

    // if time elapsed is over timeElapsedThreshold seconds do a speed check
    if (timeElapsed > timeElapsedThreshold) {
      // if speed is below downloaderPerformanceMonitoringSpeed then restart the workers
      // this is to prevent the workers from being stuck on a slow connection
      // and never finishing the download
      const queryFrom: Date = new Date(Date.now() - 1000 * 10);
      const speed = downloader.getStats().speedTracker.query(queryFrom, new Date());
      const speedThreshold = this.appConfig.downloaderPerformanceMonitoringSpeed;
      if (speed < speedThreshold) {
        return true;
      }
    }

    return false;
  }

  async completedCallback(downloader: Downloader<Item>) {
    // CRC32 check

    // Delete the file from put.io
    await this.putioService.deleteFile(downloader.sourceObject.id);
  }
}
