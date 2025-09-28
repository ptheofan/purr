import { Injectable, Logger } from '@nestjs/common';
import { Volume } from 'memfs/lib/volume';
import { DownloadGroupsRepository, DownloadItemsRepository } from '../repositories';
import { crc32File, getFirstFileOrFolder, getMeta } from '../../../helpers';
import { Group, Item } from '../entities';
import { DownloadStatus, GroupState } from '../enums';
import { DownloadFactory, DownloadProgress } from '../../downloader';
import { Mutex } from 'async-mutex';
import { PutioService } from '../../putio';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import * as path from 'path';
import * as fs from 'fs';
import { AppConfigService } from '../../configuration';
import { SpeedTracker } from '../../../stats';
import { PublisherService } from './publisher.service';
import { ItemStatsDto } from '../dtos';
import { DownloadCoordinator } from '../../downloader';

export interface IDownloadManagerSettings {
  concurrentLargeFiles?: number;
  concurrentSmallFiles?: number;
  concurrentGroups?: number;
  smallFileThreshold?: number;
}

export type TAddVolumeResponse = {
  success: boolean;
  analysisCompletedPromise: Promise<void>;
} & ({ success: true; groups: number; items: number } | { success: false; message: string });

// Constants for better maintainability
const DEFAULT_SMALL_FILE_THRESHOLD = 1024 * 1024 * 10; // 10MB
const DEFAULT_HISTOGRAM_DURATION = 1000 * 60 * 60 * 2; // 2 hours
const DEFAULT_SPEED_QUERY_DURATION = 1000 * 30; // 30 seconds
const MIN_PROGRESS_UPDATE_INTERVAL = 1000; // 1 second

const startMutex = new Mutex();

interface ITotalBytesDownloaded {
  since: Date;
  bytes: number;
}

@Injectable()
export class DownloadManagerService {
  private readonly logger = new Logger(DownloadManagerService.name);
  private concurrentLargeFiles: number;
  private concurrentSmallFiles: number;
  private concurrentGroups: number;
  private smallFileThreshold: number = DEFAULT_SMALL_FILE_THRESHOLD;
  private readonly histogramDuration = DEFAULT_HISTOGRAM_DURATION;
  private readonly speedQueryDuration = DEFAULT_SPEED_QUERY_DURATION;
  private totalBytesDownloaded: ITotalBytesDownloaded;
  private readonly speedTracker: SpeedTracker;
  private progressUpdateIntervalId: NodeJS.Timeout | undefined;
  private readonly activeDownloaders = new Map<number, DownloadCoordinator<Item>>();

  constructor(
    private readonly groupsRepo: DownloadGroupsRepository,
    private readonly itemsRepo: DownloadItemsRepository,
    private readonly downloaderFactory: DownloadFactory,
    private readonly putioService: PutioService,
    private readonly appConfig: AppConfigService,
    private readonly pubService: PublisherService,
  ) {
    this.totalBytesDownloaded = {
      since: new Date(),
      bytes: 0,
    };
    this.concurrentGroups = appConfig.concurrentGroups;
    this.concurrentSmallFiles = appConfig.concurrentSmallFiles;
    this.concurrentLargeFiles = appConfig.concurrentLargeFiles;
    this.speedTracker = new SpeedTracker();
    this.configureUpdateInterval();
  }

  /**
   * Configure the interval to publish to the UI the download manager statistics
   * Internally it uses timeout. This ensures that in case of high load, if
   * some intervals are missed it will publish max once per interval.
   */
  configureUpdateInterval() {
    if (this.progressUpdateIntervalId) {
      clearTimeout(this.progressUpdateIntervalId);
    }

    if (this.appConfig.uiProgressUpdateInterval === 0) {
      return;
    }

    this.progressUpdateIntervalId = setTimeout(async () => {
      await this.publishDownloadManagerStats();
      this.configureUpdateInterval();
    }, Math.max(this.appConfig.uiProgressUpdateInterval, MIN_PROGRESS_UPDATE_INTERVAL));
  }

  async publishDownloadManagerStats() {
    const now = new Date();
    const granularity = 60;
    const histo = this.speedTracker.histogram(new Date(now.getTime() - this.histogramDuration), now, granularity);

    // Round histo.startEpoch to the earliest of granularity seconds
    // The histo.endEpoch is not rounded, we want to show the most recent data until right now
    const histoGranularStart = Math.floor(histo.startEpoch / granularity) * granularity;

    const histogramDto = histo.endEpoch === 0 ? null : {
      since: new Date(histoGranularStart * 1000),
      until: new Date(histo.endEpoch * 1000),
      granularity,
      values: histo.values,
    };

    await this.pubService.downloadManagerStats({
      startedAt: this.totalBytesDownloaded.since,
      lifetimeBytes: this.totalBytesDownloaded.bytes,
      speed: Math.round(this.speedTracker.query(new Date(now.getTime() - this.speedQueryDuration), now)),
      histogram: histogramDto,
    });
  }

  setSettings(settings: IDownloadManagerSettings): void {
    this.concurrentLargeFiles = settings.concurrentLargeFiles ?? this.concurrentLargeFiles;
    this.concurrentSmallFiles = settings.concurrentSmallFiles ?? this.concurrentSmallFiles;
    this.concurrentGroups = settings.concurrentGroups ?? this.concurrentGroups;
    this.smallFileThreshold = settings.smallFileThreshold ?? this.smallFileThreshold;
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
   * Analyzes the volume structure and creates groups/items for download.
   * You need to call start() to start the download queue.
   */
  async addVolume(volume: Volume, saveAt: string): Promise<TAddVolumeResponse> {
    const files = volume.readdirSync('/', { recursive: true });
    if (files.length === 0) {
      return {
        success: true,
        groups: 0,
        items: 0,
        analysisCompletedPromise: Promise.resolve(),
      };
    }

    const group = new Group();
    const firstNodeMeta = await getMeta(await getFirstFileOrFolder(volume), volume);
    
    // Check if group already exists to prevent duplicates
    if (await this.groupsRepo.find((group) => group.id === firstNodeMeta.id)) {
      return {
        success: false,
        message: 'Group already exists.',
        analysisCompletedPromise: Promise.resolve(),
      };
    }
    group.id = firstNodeMeta.id;
    group.name = firstNodeMeta.name;
    group.addedAt = new Date();
    group.saveAt = saveAt;
    group.state = GroupState.Initializing;
    await this.groupsRepo.add(group);

    const items: Item[] = [];
    for (const file of files) {
      const filePath = file as string;
      const isDirectory = volume.statSync(filePath).isDirectory();
      
      // Skip directories and meta files
      if (isDirectory || filePath.endsWith('/.meta')) {
        continue;
      }

      const meta = await getMeta(filePath, volume);
      const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
      
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

    // Sort items by size for optimal download order (smaller files first)
    items.sort((a, b) => a.size - b.size);

    // Remove duplicate items based on ID
    const uniqueItems = items.filter((item, index, self) => 
      self.findIndex((i) => i.id === item.id) === index
    );
    await this.itemsRepo.addMany(uniqueItems);

    // Asynchronously check if items already exist on disk and verify their integrity
    const analysisCompletedPromise = new Promise<void>((resolve) => {
      this.checkGroupItemsOnDisk(group.id).then(async ({ groupId }) => {
        await this.updateGroupState(groupId, GroupState.Ready);
        resolve();
      });
    });

    // Mark group as ready for download
    group.state = GroupState.Ready;

    return {
      success: true,
      groups: 1,
      items: uniqueItems.length,
      analysisCompletedPromise,
    };
  }

  /**
   * Check if the items of a group already exist on disk and verify their integrity.
   * - If files exist and CRC32 matches: mark as completed and delete from put.io
   * - If files exist but CRC32 doesn't match: mark as pending and delete local files
   * - If files don't exist: mark as pending
   */
  async checkGroupItemsOnDisk(groupId: number): Promise<{ groupId: number }> {
    const group = await this.groupsRepo.find((group) => group.id === groupId);
    const items = await this.itemsRepo.filter((item) => item.groupId === groupId);
    let itemsCompletedCounter = 0;
    for (const item of items) {
      const saveAs = await this.computeDownloadSavePath(item, group);
      
      if (fs.existsSync(saveAs)) {
        const crc32 = await crc32File(saveAs);
        if (crc32 !== item.crc32) {
          this.logger.warn(
            `CRC32 check failed for ${item.name} (${item.id}). Expected: ${item.crc32}, got: ${crc32}. Will retry download.`
          );
          await this.itemsRepo.update(item.id, { status: DownloadStatus.Pending });
          fs.unlinkSync(saveAs);
        } else {
          this.logger.log(`CRC32 check passed for ${item.name} (${item.id}). Marking as completed.`);
          await this.itemsRepo.update(item.id, { status: DownloadStatus.Completed });
          itemsCompletedCounter++;
          await this.putioService.deleteItem(item.id);
        }
      }
    }

    // Update group status based on completion
    const groupStatus = itemsCompletedCounter === items.length 
      ? DownloadStatus.Completed 
      : DownloadStatus.Pending;
    await this.updateGroupStatus(groupId, groupStatus);

    return { groupId };
  }

  async computeDownloadSavePath(item: Item, group: Group): Promise<string> {
    return path.join(group.saveAt, item.relativePath, item.name);
  }

  /**
   * Determine which groups are eligible for download based on concurrency settings.
   * Returns groups that can be downloaded concurrently.
   */
  async getDownloadGroupCandidates(): Promise<Group[]> {
    // If unlimited concurrency, return all active groups
    if (this.concurrentGroups < 1) {
      return await this.groupsRepo.filter(group => 
        group.status === DownloadStatus.Downloading || group.status === DownloadStatus.Pending
      );
    }

    const downloadingGroups = await this.groupsRepo.filter(group => 
      group.status === DownloadStatus.Downloading
    );
    
    // If already at max concurrency, return only downloading groups
    if (downloadingGroups.length >= this.concurrentGroups) {
      return downloadingGroups;
    }

    // Add pending groups up to concurrency limit
    const pendingGroups = await this.groupsRepo.filter(group => 
      group.state === GroupState.Ready && group.status === DownloadStatus.Pending
    );
    
    const result = [...downloadingGroups];
    const pendingGroupsToAdd = Math.min(
      this.concurrentGroups - downloadingGroups.length, 
      pendingGroups.length
    );
    
    for (let i = 0; i < pendingGroupsToAdd; i++) {
      result.push(pendingGroups[i]);
    }
    
    return result;
  }

  /**
   * Determine which items are eligible for download based on concurrency settings.
   * Returns items that can be downloaded concurrently, respecting size-based limits.
   */
  async getDownloadItemCandidates(groups: Group[]): Promise<Item[]> {
    // Count currently downloading items by size
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

    // If already at max concurrency for both types, return empty
    if (downloadingItemsCounters.smallFilesCount >= this.concurrentSmallFiles && 
        downloadingItemsCounters.largeFilesCount >= this.concurrentLargeFiles) {
      return [];
    }

    const result: Item[] = [];
    let currentSmallCount = downloadingItemsCounters.smallFilesCount;
    let currentLargeCount = downloadingItemsCounters.largeFilesCount;

    for (const group of groups) {
      const items = await this.itemsRepo.filter(item => 
        item.groupId === group.id && item.status === DownloadStatus.Pending
      );
      
      // Separate items by size
      const smallFiles = items.filter(item => item.size <= this.smallFileThreshold);
      const largeFiles = items.filter(item => item.size > this.smallFileThreshold);

      // Add small files up to concurrency limit
      for (const item of smallFiles) {
        if (currentSmallCount < this.concurrentSmallFiles) {
          result.push(item);
          currentSmallCount++;
        } else {
          break;
        }
      }

      // Add large files up to concurrency limit
      for (const item of largeFiles) {
        if (currentLargeCount < this.concurrentLargeFiles) {
          result.push(item);
          currentLargeCount++;
        } else {
          break;
        }
      }

      // Stop if both limits are reached
      if (currentSmallCount >= this.concurrentSmallFiles && 
          currentLargeCount >= this.concurrentLargeFiles) {
        break;
      }
    }

    return result;
  }

  /**
   * Start the download queue.
   * Uses a mutex to ensure only one start operation runs at a time.
   */
  async start(): Promise<void> {
    this.logger.debug('Starting download queue.');
    return startMutex.runExclusive(async () => {
      this.logger.debug('Running start mutex.');
      try {
        const groups = await this.getDownloadGroupCandidates();
        if (groups.length === 0) {
          this.logger.debug('Exiting start mutex - no groups to download.');
          return;
        }

        const items = await this.getDownloadItemCandidates(groups);
        if (items.length === 0) {
          this.logger.debug('Exiting start mutex - no items to download.');
          return;
        }

        // Get download links for all items in batch to minimize API calls
        let links: string[] = [];
        try {
          links = await this.putioService.getDownloadLinks(items.map(item => item.id));
        } catch (error) {
          this.logger.error('Failed to get download links from putio.', error);
          return;
        }

        // Start downloading all items concurrently
        this.logger.debug('Starting download of items.');
        await Promise.all(items.map(async (item, index) => {
          items[index].downloadLink = links[index];
          const group = groups.find(group => group.id === items[index].groupId);
          if (!group) {
            throw new Error(`Group not found for item ${item.id}`);
          }
          const saveAs = await this.computeDownloadSavePath(items[index], group);
          return this.download(items[index], saveAs);
        }));
      } catch (error) {
        this.logger.error('Error in start method:', error);
      }

      this.logger.debug('Exiting start mutex.');
    });
  }

  /**
   * Start downloading a single item.
   * Creates a downloader and manages its lifecycle.
   */
  protected async download(item: Item, saveAs: string): Promise<void> {
    if (this.activeDownloaders.has(item.id)) {
      throw new Error(`Download already in progress for item ${item.id}`);
    }

    if (!item.downloadLink) {
      throw new RuntimeException(`Download link for item ${item.id} is not available.`);
    }

    await this.updateItemStatus(item.id, DownloadStatus.Downloading);

    try {
      const downloader = await this.downloaderFactory.create<Item>({
        sourceObject: item,
        url: item.downloadLink,
        saveAs: saveAs,
        progressUpdateInterval: this.appConfig.uiProgressUpdateInterval,
        workersCount: item.size <= this.smallFileThreshold ? 1 : 4,
        fileSize: item.size,
        chunkSize: this.appConfig.downloaderChunkSize,
        autoRestartCallback: this.downloadAutoRestartCallback.bind(this),
        progressCallback: this.progressCallback.bind(this),
        completedCallback: this.completedCallback.bind(this),
        errorCallback: this.errorCallback.bind(this),
      });

      this.activeDownloaders.set(item.id, downloader);

      downloader.start()
        .then(async () => {
          this.activeDownloaders.delete(item.id);
          await this.updateItemStatus(item.id, DownloadStatus.Completed);
          this.logger.debug(`Download ${item.name} completed, calling START again.`);
          await this.start();
        })
        .catch(async (error) => {
          this.activeDownloaders.delete(item.id);
          await this.setItemError(item.id, error.error_message);
          this.logger.error(`Download ${item.name} failed! ${error.error_message}`, error.stack);
          this.logger.debug(`Download ${item.name} failed, calling START again.`);
          await this.start();
        });
    } catch (error) {
      this.logger.error(`Failed to create downloader for ${item.name}`, error);
      await this.setItemError(item.id, error instanceof Error ? error.message : String(error));
      this.logger.debug(`Download ${item.name} failed, calling START again.`);
      await this.start();
    }
  }

  async setItemError(itemId: number, error: string): Promise<void> {
    await this.updateItemStatus(itemId, DownloadStatus.Error);
    await this.itemsRepo.update(itemId, { error });
  }

  async updateGroupStatus(groupId: number, status: DownloadStatus): Promise<void> {
    const group = await this.groupsRepo.find(g => g.id === groupId);
    if (!group) {
      throw new RuntimeException(`Group ${groupId} not found.`);
    }

    if (group.status !== status) {
      await this.groupsRepo.update(groupId, { status });
      await this.pubService.groupStatusChanged({ id: groupId, status });
    }
  }

  async updateGroupState(groupId: number, state: GroupState): Promise<void> {
    const group = await this.groupsRepo.find(g => g.id === groupId);
    if (!group) {
      throw new RuntimeException(`Group ${groupId} not found.`);
    }

    if (group.state !== state) {
      await this.groupsRepo.update(groupId, { state });
      await this.pubService.groupStateChanged({ id: groupId, state });
    }
  }

  async updateItemStatus(id: number, status: DownloadStatus): Promise<void> {
    const item = await this.itemsRepo.find((item) => item.id === id);
    if (!item) {
      throw new RuntimeException(`Cannot update item ${id} status. Item not found.`);
    }

    if (item.status === status) {
      return; // Item is already in the desired status
    }

    const group = await this.groupsRepo.find((group) => group.id === item.groupId);
    if (!group) {
      throw new RuntimeException(`Cannot update item ${id} status. Group not found.`);
    }
    
    await this.itemsRepo.update(id, { status });
    await this.pubService.itemStatusChanged({ id, status });

    // Update group status based on item completion
    if (status === DownloadStatus.Completed || status === DownloadStatus.Error) {
      const groupItems = await this.itemsRepo.filter((item) => item.groupId === group.id);
      const completedItems = groupItems.filter((item) => 
        item.status === DownloadStatus.Completed || item.status === DownloadStatus.Error
      );
      if (groupItems.length === completedItems.length) {
        await this.updateGroupStatus(group.id, DownloadStatus.Completed);
      }
    } else if (status === DownloadStatus.Pending) {
      // If group is not downloading or pending, set it to pending
      if (group.status !== DownloadStatus.Downloading && group.status !== DownloadStatus.Pending) {
        await this.updateGroupStatus(group.id, DownloadStatus.Pending);
      }
    }
  }

  async groupExists(id: number): Promise<boolean> {
    return await this.groupsRepo.find((group) => group.id === id) !== undefined;
  }

  /**
   * Determines if download workers should be restarted based on performance monitoring.
   * Returns true if workers are stuck on slow connection and need restart.
   */
  downloadAutoRestartCallback(downloader: DownloadCoordinator<Item>): boolean {
    if (!this.appConfig.downloaderPerformanceMonitoringEnabled) {
      return false;
    }

    const stats = downloader.getProgress();
    if (!stats.workersRestartedAt && !stats.startedAt) {
      return false; // Workers have not been started yet
    }

    const timeElapsedThreshold = 1000 * this.appConfig.downloaderPerformanceMonitoringTime;
    const since = stats.workersRestartedAt?.getTime() || stats.startedAt.getTime();
    const timeElapsed = Date.now() - since;

    // Check if enough time has elapsed to warrant a speed check
    if (timeElapsed > timeElapsedThreshold) {
      const queryFrom = new Date(Date.now() - 1000 * 10);
      const speed = stats.speedTracker.query(queryFrom, new Date());
      const speedThreshold = this.appConfig.downloaderPerformanceMonitoringSpeed;
      
      // Restart workers if speed is below threshold
      return speed < speedThreshold;
    }

    return false;
  }

  /**
   * Progress callback for download updates.
   * Updates statistics and publishes progress to UI.
   */
  progressCallback(downloader: DownloadCoordinator<Item>, stats: DownloadProgress, bytesSinceLastCall: number): void {
    // Update download manager statistics
    this.speedTracker.update(Date.now(), bytesSinceLastCall);
    this.totalBytesDownloaded.bytes += bytesSinceLastCall;

    const now = new Date();
    const from = new Date(now.getTime() - this.speedQueryDuration);
    const histogram = stats.speedTracker.histogram(from, now);
    
    // Publish progress update to UI (fire and forget)
    this.pubService.itemStatsUpdated({
      itemId: downloader.sourceObject.id,
      startedAt: stats.startedAt,
      restartedAt: stats.workersRestartedAt,
      downloadedBytes: stats.downloadedBytes,
      bytesSinceLastEvent: bytesSinceLastCall,
      speed: Math.round(stats.speedTracker.query(from, now)),
      fragments: stats.ranges,
      histogram: {
        since: new Date(histogram.startEpoch * 1000),
        until: new Date(histogram.endEpoch * 1000),
        granularity: 1,
        values: histogram.values,
      },
      workers: stats.workerStats.map((worker) => ({
        id: worker.id,
        speed: worker.speed,
        downloadedBytes: worker.downloadedBytes,
      })),
    } as ItemStatsDto);
  }

  /**
   * Callback when download completes.
   * Verifies file integrity and updates status accordingly.
   */
  async completedCallback(downloader: DownloadCoordinator<Item>): Promise<void> {
    const item = downloader.sourceObject;
    
    // Verify file integrity with CRC32 check
    const fileCRC = await crc32File(downloader.saveAs);
    if (fileCRC !== item.crc32) {
      this.logger.warn(
        `CRC32 check failed for ${item.name} (${item.id}). Expected: ${item.crc32}, got: ${fileCRC}. Will retry download.`
      );
      fs.unlinkSync(downloader.saveAs);
      await this.updateItemStatus(item.id, DownloadStatus.Pending);
      return;
    }

    // Mark item as completed
    await this.updateItemStatus(item.id, DownloadStatus.Completed);

    // If entire group is completed, delete from put.io
    const group = await this.groupsRepo.find((group) => group.id === item.groupId);
    if (group?.status === DownloadStatus.Completed) {
      this.logger.log(`Group ${group.id} is completed. Deleting from put.io.`);
      await this.putioService.deleteItem(group.id);
    }

    // Send final progress update
    this.progressCallback(downloader, downloader.getProgress(), 0);
  }

  /**
   * Callback when download encounters an error.
   * Updates item status and sends final progress update.
   */
  async errorCallback(downloader: DownloadCoordinator<Item>): Promise<void> {
    const item = downloader.sourceObject;
    this.logger.error(`Download failed for ${item.name}`);
    await this.updateItemStatus(item.id, DownloadStatus.Error);

    // Send final progress update
    this.progressCallback(downloader, downloader.getProgress(), 0);
  }
}
