import { Test, TestingModule } from '@nestjs/testing';
import { Volume } from 'memfs/lib/volume';
import { DownloadGroupsRepository, DownloadItemsRepository } from '../repositories';
import { DownloadManagerService } from './download-manager.service';
import { memfs } from 'memfs';
import { DownloadStatus, GroupState } from '../enums';
import { DownloadFactory } from '../../downloader';
import { Group, Item } from '../entities';
import { PutioService } from '../../putio';
import { AppConfigService } from '../../configuration';
import { ConfigService } from '@nestjs/config';
import * as process from 'process';
import { PublisherService } from './publisher.service';
import { ModuleMocker, MockMetadata } from 'jest-mock';

type CreateItemsOptions = {
  groupId: number;
} & {
  [DownloadStatusKey in DownloadStatus]?: {
    small?: number;
    large?: number;
  };
};

let globalItemId = 1;

function createItems(opts: CreateItemsOptions): Item[] {
  const items: Item[] = [];

  for (const status in opts) {
    if (status !== 'groupId' && opts[status as DownloadStatus]) {
      const { small, large } = opts[status as DownloadStatus]!;

      for (let i = 0; i < (small || 0); i++) {
        items.push({
          id: globalItemId++,
          groupId: opts.groupId,
          name: `file${globalItemId - 1}.txt`,
          size: 100, // size for small files
          crc32: '123456',
          relativePath: '/',
          downloadLink: `http://example.com/file${globalItemId - 1}.txt`,
          status: status as DownloadStatus,
        });
      }

      for (let i = 0; i < (large || 0); i++) {
        items.push({
          id: globalItemId++,
          groupId: opts.groupId,
          name: `file${globalItemId - 1}.txt`,
          size: 1024 * 1024 * 11, // size for large files
          crc32: '123456',
          relativePath: '/',
          downloadLink: `http://example.com/file${globalItemId - 1}.txt`,
          status: status as DownloadStatus,
        });
      }
    }
  }

  return items;
}

const countSmallLargeItems = (result: Item[], status: DownloadStatus[] = [DownloadStatus.Pending, DownloadStatus.Downloading]) => result.reduce((acc, item) => {
  if (status.includes(item.status)) {
    acc[item.size > 1024 * 1024 * 10 ? 'large' : 'small']++;
  }
  return acc;
}, { small: 0, large: 0 });

const moduleMocker = new ModuleMocker(global);

describe('DownloadManagerService', () => {
  // Set some values to process.env
  process.env.PUTIO_CLIENT_ID = '1234';
  process.env.PUTIO_CLIENT_SECRET = 'xxxx';
  process.env.PUTIO_AUTH = 'xxxx';
  process.env.UI_PROGRESS_UPDATE_INTERVAL = '0';

  let service: DownloadManagerService;
  let groupsRepo: jest.Mocked<DownloadGroupsRepository>;
  let itemsRepo: jest.Mocked<DownloadItemsRepository>;
  let downloaderFactory: jest.Mocked<DownloadFactory>;
  let putioService: jest.Mocked<PutioService>;
  let appConfig: jest.Mocked<AppConfigService>;
  let pubService: jest.Mocked<PublisherService>;

  beforeEach(async () => {
    // Reset global item ID counter
    globalItemId = 1;
    
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        ConfigService,
        AppConfigService,
        DownloadManagerService,
        DownloadFactory,
        DownloadGroupsRepository,
        DownloadItemsRepository,
        {
          provide: PublisherService,
          useValue: {
            downloadManagerStats: jest.fn(),
            groupStateChanged: jest.fn(),
            groupStatusChanged: jest.fn(),
            groupAdded: jest.fn(),
            itemStatusChanged: jest.fn(),
            itemStatsUpdated: jest.fn(),
          },
        },
        {
          provide: PutioService,
          useValue: {
            getVolume: jest.fn().mockResolvedValue(new Volume()),
            getDownloadLinks: jest.fn().mockResolvedValue([]),
            deleteItem: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .useMocker((token) => {
        if (token === DownloadFactory) {
          return {
            create: jest.fn().mockResolvedValue({
              start: jest.fn().mockResolvedValue(undefined),
              getProgress: jest.fn().mockReturnValue({
                startedAt: new Date(),
                workersRestartedAt: null,
                downloadedBytes: 0,
                ranges: [],
                workerStats: [],
                speedTracker: {
                  query: jest.fn().mockReturnValue(0),
                  histogram: jest.fn().mockReturnValue({
                    startEpoch: 0,
                    endEpoch: 0,
                    values: [],
                  }),
                },
              }),
            }),
          };
        }
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata) as ObjectConstructor;
          return new Mock();
        }
      })
      .compile();

    service = module.get<DownloadManagerService>(DownloadManagerService);
    groupsRepo = module.get<DownloadGroupsRepository>(DownloadGroupsRepository) as jest.Mocked<DownloadGroupsRepository>;
    itemsRepo = module.get<DownloadItemsRepository>(DownloadItemsRepository) as jest.Mocked<DownloadItemsRepository>;
    downloaderFactory = module.get<DownloadFactory>(DownloadFactory) as jest.Mocked<DownloadFactory>;
    putioService = module.get<PutioService>(PutioService) as jest.Mocked<PutioService>;
    appConfig = module.get<AppConfigService>(AppConfigService) as jest.Mocked<AppConfigService>;
    pubService = module.get<PublisherService>(PublisherService) as jest.Mocked<PublisherService>;

    // Set default settings
    service.setSettings({
      concurrentLargeFiles: 2,
      concurrentSmallFiles: 8,
      concurrentGroups: 2,
      smallFileThreshold: 1024 * 1024 * 10, // 10MB
    });

    // Mock app config properties
    Object.defineProperty(appConfig, 'uiProgressUpdateInterval', { value: 0, writable: true });
    Object.defineProperty(appConfig, 'downloaderChunkSize', { value: 1024 * 1024, writable: true });
    Object.defineProperty(appConfig, 'downloaderPerformanceMonitoringEnabled', { value: false, writable: true });
    Object.defineProperty(appConfig, 'downloaderPerformanceMonitoringTime', { value: 30, writable: true });
    Object.defineProperty(appConfig, 'downloaderPerformanceMonitoringSpeed', { value: 1024, writable: true });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setSettings and getSettings', () => {
    it('should set and get settings correctly', () => {
      const settings = {
        concurrentLargeFiles: 3,
        concurrentSmallFiles: 10,
        concurrentGroups: 1,
        smallFileThreshold: 1024 * 1024 * 5, // 5MB
      };

      service.setSettings(settings);
      const retrievedSettings = service.getSettings();

      expect(retrievedSettings).toEqual(settings);
    });

    it('should handle partial settings updates', () => {
      const initialSettings = service.getSettings();
      const partialSettings = {
        concurrentLargeFiles: 5,
        // Other settings should remain unchanged
      };

      service.setSettings(partialSettings);
      const retrievedSettings = service.getSettings();

      expect(retrievedSettings.concurrentLargeFiles).toBe(5);
      expect(retrievedSettings.concurrentSmallFiles).toBe(initialSettings.concurrentSmallFiles);
      expect(retrievedSettings.concurrentGroups).toBe(initialSettings.concurrentGroups);
      expect(retrievedSettings.smallFileThreshold).toBe(initialSettings.smallFileThreshold);
    });
  });

  describe('addVolume', () => {
    it('folder with file', async () => {
      const { vol: volume } = memfs({
        '/folder1': {
          '.meta': JSON.stringify({ id: 1, name: 'folder1' }),
          'file1.txt': JSON.stringify({ id: 2, name: 'file1.txt', size: 100, crc32: '123456', downloadLink: 'http://example.com/file1.txt' }),
        }
      });

      const result = await service.addVolume(volume, '/save/here');
      expect(result).toMatchObject({ groups: 1, items: 1 });
      const group = await groupsRepo.getAll();
      expect(group).toMatchObject([{
        id: 1,
        name: 'folder1',
        saveAt: '/save/here',
        status: DownloadStatus.Pending,
      }]);
      const items = await itemsRepo.getAll();
      expect(items).toEqual([
        {
          id: 2,
          name: 'file1.txt',
          groupId: 1,
          size: 100,
          crc32: '123456',
          relativePath: '/folder1',
          downloadLink: 'http://example.com/file1.txt',
          status: DownloadStatus.Pending
        }
      ]);
    });

    it('single file', async () => {
      const { vol: volume } = memfs({
        'file1.txt': JSON.stringify({ id: 1, name: 'file1.txt', size: 100, crc32: '123456', downloadLink: 'http://example.com/file1.txt' }),
      });

      const result = await service.addVolume(volume, '/save/here');
      expect(result).toMatchObject({ groups: 1, items: 1 });
      const group = await groupsRepo.getAll();
      expect(group).toMatchObject([{
        id: 1,
        name: 'file1.txt',
        saveAt: '/save/here',
        status: DownloadStatus.Pending
      }]);
      const items = await itemsRepo.getAll();
      expect(items).toEqual([
        {
          id: 1,
          name: 'file1.txt',
          groupId: 1,
          size: 100,
          crc32: '123456',
          relativePath: '/',
          downloadLink: 'http://example.com/file1.txt',
          status: DownloadStatus.Pending
        }
      ]);
    });

    it('should not allow duplicate files', async () => {
      const { vol: volume } = memfs({
        'file1.txt': JSON.stringify({ id: 1, name: 'file1.txt', size: 100, crc32: '123456', downloadLink: 'http://example.com/file1.txt' }),
      });

      const result = await service.addVolume(volume, '/save/here');
      expect(result).toMatchObject({ groups: 1, items: 1 });
      const group = await groupsRepo.getAll();
      expect(group).toMatchObject([{
        id: 1,
        name: 'file1.txt',
        saveAt: '/save/here',
        status: DownloadStatus.Pending
      }]);
      const items = await itemsRepo.getAll();
      expect(items).toEqual([
        {
          id: 1,
          name: 'file1.txt',
          groupId: 1,
          size: 100,
          crc32: '123456',
          relativePath: '/',
          downloadLink: 'http://example.com/file1.txt',
          status: DownloadStatus.Pending
        }
      ]);

      const result2 = await service.addVolume(volume, '/save/here');
      expect(result2).toMatchObject({ success: false });
    });

    it('should not add items if the volume is empty', async () => {
      const volume = new Volume();
      const result = await service.addVolume(volume, '/save/here');
      expect(result).toMatchObject({ groups: 0, items: 0 });
      const group = await groupsRepo.getAll();
      expect(group).toEqual([]);
      const items = await itemsRepo.getAll();
      expect(items).toEqual([]);
    });
  });

  describe('groupExists', () => {
    it('should return true if group exists', async () => {
      const mockGroup = { id: 1, name: 'test', status: DownloadStatus.Pending, saveAt: '/test', addedAt: new Date(), state: GroupState.Ready };
      jest.spyOn(groupsRepo, 'find').mockResolvedValue(mockGroup);

      const result = await service.groupExists(1);
      expect(result).toBe(true);
    });

    it('should return false if group does not exist', async () => {
      jest.spyOn(groupsRepo, 'find').mockResolvedValue(undefined);

      const result = await service.groupExists(999);
      expect(result).toBe(false);
    });
  });


  describe('computeDownloadSavePath', () => {
    it('should compute the correct save path', async () => {
      const item: Item = {
        id: 1,
        name: 'file1.txt',
        groupId: 1,
        size: 100,
        crc32: '123456',
        relativePath: '/folder1',
        downloadLink: 'http://example.com/file1.txt',
        status: DownloadStatus.Pending,
      };
      const group: Group = {
        id: 1,
        name: 'folder1',
        status: DownloadStatus.Pending,
        saveAt: '/save/here',
        addedAt: new Date(),
        state: GroupState.Initializing,
      };
      const savePath = await service.computeDownloadSavePath(item, group);
      expect(savePath).toEqual('/save/here/folder1/file1.txt');
    });

    it('should handle trailing slashes', async () => {
      const item: Item = {
        id: 1,
        name: 'file1.txt',
        groupId: 1,
        size: 100,
        crc32: '123456',
        relativePath: '/folder1/',
        downloadLink: 'http://example.com/file1.txt',
        status: DownloadStatus.Pending,
      };
      const group: Group = {
        id: 1,
        name: 'folder1',
        status: DownloadStatus.Pending,
        saveAt: '/save/here/',
        addedAt: new Date(),
        state: GroupState.Initializing,
      };
      const savePath = await service.computeDownloadSavePath(item, group);
      expect(savePath).toEqual('/save/here/folder1/file1.txt');
    });
  });

  describe('download group candidates', () => {
    it('should download all groups concurrently', async () => {
      groupsRepo.addMany([
        { id: 1, name: 'group1', status: DownloadStatus.Downloading, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Initializing, },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Initializing, },
        { id: 3, name: 'group3', status: DownloadStatus.Pending, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Initializing, },
      ]);

      // Unlimited groups concurrently
      service.setSettings({ concurrentGroups: 0 });
      const result = await service.getDownloadGroupCandidates();
      expect(result).toMatchObject([
        { id: 1, name: 'group1', status: DownloadStatus.Downloading, saveAt: '/save/here' },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here' },
        { id: 3, name: 'group3', status: DownloadStatus.Pending, saveAt: '/save/here' },
      ]);
    });

    it('should download 2 groups concurrently', async () => {
      groupsRepo.addMany([
        { id: 1, name: 'group1', status: DownloadStatus.Pending, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
        { id: 3, name: 'group3', status: DownloadStatus.Pending, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
      ]);

      const result = await service.getDownloadGroupCandidates();
      expect(result).toMatchObject([
        { id: 1, name: 'group1', status: DownloadStatus.Pending, saveAt: '/save/here' },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here' },
      ]);
    });

    it('should download 2 groups concurrently and ignore groups in non-downloadable states', async () => {
      groupsRepo.addMany([
        { id: 1, name: 'group1', status: DownloadStatus.Completed, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
        { id: 3, name: 'group3', status: DownloadStatus.Error, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
        { id: 4, name: 'group4', status: DownloadStatus.Downloading, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
        { id: 5, name: 'group5', status: DownloadStatus.Pending, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
      ]);

      const result = await service.getDownloadGroupCandidates();
      expect(result).toMatchObject([
        { id: 4, name: 'group4', status: DownloadStatus.Downloading, saveAt: '/save/here' },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here' },
      ]);
    });
  });

  describe('download items candidates',() => {
    it('should respect concurrency controls', async () => {
      await groupsRepo.addMany([
        { id: 1, name: 'group1', status: DownloadStatus.Completed, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
        { id: 2, name: 'group2', status: DownloadStatus.Downloading, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
        { id: 3, name: 'group3', status: DownloadStatus.Error, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
      ]);

      await itemsRepo.addMany(createItems({
        groupId: 2,
        [DownloadStatus.Downloading]: { small: 3, large: 1 },
        [DownloadStatus.Pending]: { small: 6, large: 2 },
        [DownloadStatus.Completed]: { small: 5, large: 2 },
        [DownloadStatus.Error]: { small: 1, large: 1 },
      }));

      // CandidateGroups would return only group2
      const groups = await groupsRepo.filter(g => g.id === 2);
      const result = await service.getDownloadItemCandidates(groups);
      // New items (pending) should be 5 and 1
      expect(countSmallLargeItems(result, [DownloadStatus.Pending])).toEqual({ small: 5, large: 1 });

      // Should not return items already in downloading state
      expect(countSmallLargeItems(result, [DownloadStatus.Downloading])).toEqual({ small: 0, large: 0 });
    });

    it('should respect concurrency controls even with multiple groups', async () => {
      await groupsRepo.addMany([
        { id: 1, name: 'group1', status: DownloadStatus.Completed, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
        { id: 2, name: 'group2', status: DownloadStatus.Downloading, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
        { id: 3, name: 'group3', status: DownloadStatus.Pending, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
        { id: 4, name: 'group4', status: DownloadStatus.Error, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Ready, },
      ]);

      await itemsRepo.addMany(createItems({
        groupId: 1,
        [DownloadStatus.Completed]: { small: 5, large: 2 },
        [DownloadStatus.Error]: { small: 1, large: 1 },
      }));

      await itemsRepo.addMany(createItems({
        groupId: 2,
        [DownloadStatus.Completed]: { small: 2, large: 1 },
        [DownloadStatus.Pending]: { small: 1, large: 1 },
      }));

      await itemsRepo.addMany(createItems({
        groupId: 3,
        [DownloadStatus.Downloading]: { small: 2, large: 1 },
        [DownloadStatus.Pending]: { small: 5, large: 1 },
      }));

      await itemsRepo.addMany(createItems({
        groupId: 4,
        [DownloadStatus.Error]: { small: 6, large: 2 },
      }));

      const groups = await groupsRepo.filter(g => g.id === 2 || g.id === 3);
      const result = await service.getDownloadItemCandidates(groups);
      
      // Expect the sum of Pending - Downloading capped by max items from group2 and group3
      expect(countSmallLargeItems(result, [DownloadStatus.Pending])).toEqual({ small: 6, large: 1 });

      // From group2 expect 1 small and 1 large
      expect(countSmallLargeItems(result.filter(i => i.groupId === 2), [DownloadStatus.Pending])).toEqual({ small: 1, large: 1 });

      // From group3 expect 5 small
      expect(countSmallLargeItems(result.filter(i => i.groupId === 3), [DownloadStatus.Pending])).toEqual({ small: 5, large: 0 });

      // Should not return items already in downloading state
      expect(countSmallLargeItems(result, [DownloadStatus.Downloading])).toEqual({ small: 0, large: 0 });
    });

    it('test minimum limit to 1 small, 1 large and 1 group', async () => {
      service.setSettings({
        concurrentLargeFiles: 1,
        concurrentSmallFiles: 1,
        concurrentGroups: 1,
        smallFileThreshold: 1024 * 1024 * 10,   // 10MB
      })

      await groupsRepo.addMany([
        { id: 1, name: 'group1', status: DownloadStatus.Pending, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Initializing, },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here', addedAt: new Date(), state: GroupState.Initializing, },
      ]);

      // small ids 1, 2, 3, 4, 5
      // large ids 6, 7
      await itemsRepo.addMany(createItems({
        groupId: 1,
        [DownloadStatus.Pending]: { small: 5, large: 2 },
      }));

      // small ids 8
      // large ids 9
      await itemsRepo.addMany(createItems({
        groupId: 2,
        [DownloadStatus.Pending]: { small: 1, large: 1 },
      }));

      // Groups are still initializing, not eligible for download yet
      let groups = await service.getDownloadGroupCandidates();
      expect(groups).toHaveLength(0);

      // Switch the groups to ready
      await groupsRepo.update(1, { state: GroupState.Ready });
      await groupsRepo.update(2, { state: GroupState.Ready });

      groups = await service.getDownloadGroupCandidates();
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toEqual(1);

      let items = await service.getDownloadItemCandidates(groups);
      expect(countSmallLargeItems(items, [DownloadStatus.Pending])).toEqual({ small: 1, large: 1 });
      expect(items[0].id).toEqual(1);
      expect(items[1].id).toEqual(6);

      // Mark the small and large items as downloading
      await itemsRepo.update(1, { status: DownloadStatus.Downloading });
      await itemsRepo.update(6, { status: DownloadStatus.Downloading });

      // 1 small and 1 large are downloading, should have the downloading group as candidate but no items
      groups = await service.getDownloadGroupCandidates();
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toEqual(1);
      items = await service.getDownloadItemCandidates(groups);
      expect(items).toHaveLength(0);

      // 1 small item completed, should tell us to start downloading the next small file of the same group
      await itemsRepo.update(1, { status: DownloadStatus.Completed });
      groups = await service.getDownloadGroupCandidates();
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toEqual(1);
      items = await service.getDownloadItemCandidates(groups);
      expect(countSmallLargeItems(items, [DownloadStatus.Pending])).toEqual({ small: 1, large: 0 });
      expect(items[0].id).toEqual(2);

      await itemsRepo.update(2, { status: DownloadStatus.Downloading });
      groups = await service.getDownloadGroupCandidates();
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toEqual(1);
      items = await service.getDownloadItemCandidates(groups);
      expect(countSmallLargeItems(items, [DownloadStatus.Pending])).toEqual({ small: 0, large: 0 });
      expect(items).toHaveLength(0);

      // 1 large item completed, should tell us to start downloading the next large file of the same group
      await itemsRepo.update(6, { status: DownloadStatus.Completed });
      groups = await service.getDownloadGroupCandidates();
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toEqual(1);
      items = await service.getDownloadItemCandidates(groups);
      expect(countSmallLargeItems(items, [DownloadStatus.Pending])).toEqual({ small: 0, large: 1 });
      expect(items[0].id).toEqual(7);
    });
  });

  describe('downloadAutoRestartCallback', () => {
    it('should return false when performance monitoring is disabled', () => {
      Object.defineProperty(appConfig, 'downloaderPerformanceMonitoringEnabled', { value: false });
      
      const mockDownloader = {
        getProgress: jest.fn().mockReturnValue({
          startedAt: new Date(),
          workersRestartedAt: null,
          speedTracker: {
            query: jest.fn().mockReturnValue(1000),
          },
        }),
      };

      const result = service.downloadAutoRestartCallback(mockDownloader as any);
      expect(result).toBe(false);
    });

    it('should return false when workers have not started', () => {
      Object.defineProperty(appConfig, 'downloaderPerformanceMonitoringEnabled', { value: true });
      
      const mockDownloader = {
        getProgress: jest.fn().mockReturnValue({
          startedAt: null,
          workersRestartedAt: null,
        }),
      };

      const result = service.downloadAutoRestartCallback(mockDownloader as any);
      expect(result).toBe(false);
    });

    it('should return true when speed is below threshold', () => {
      Object.defineProperty(appConfig, 'downloaderPerformanceMonitoringEnabled', { value: true });
      Object.defineProperty(appConfig, 'downloaderPerformanceMonitoringTime', { value: 1 });
      Object.defineProperty(appConfig, 'downloaderPerformanceMonitoringSpeed', { value: 1000 });
      
      const mockDownloader = {
        getProgress: jest.fn().mockReturnValue({
          startedAt: new Date(Date.now() - 2000), // 2 seconds ago
          workersRestartedAt: null,
          speedTracker: {
            query: jest.fn().mockReturnValue(500), // Below threshold
          },
        }),
      };

      const result = service.downloadAutoRestartCallback(mockDownloader as any);
      expect(result).toBe(true);
    });
  });

  describe('setItemError', () => {
    it('should set item error status and update repository', async () => {
      const itemId = 1;
      const errorMessage = 'Test error';
      
      jest.spyOn(service, 'updateItemStatus').mockResolvedValue(undefined);
      jest.spyOn(itemsRepo, 'update').mockResolvedValue(undefined);

      await service.setItemError(itemId, errorMessage);

      expect(service.updateItemStatus).toHaveBeenCalledWith(itemId, DownloadStatus.Error);
      expect(itemsRepo.update).toHaveBeenCalledWith(itemId, { error: errorMessage });
    });
  });

  describe('updateGroupStatus', () => {
    it('should update group status when status changes', async () => {
      const groupId = 1;
      const newStatus = DownloadStatus.Completed;
      const mockGroup = { id: groupId, status: DownloadStatus.Pending, name: 'test', saveAt: '/test', addedAt: new Date(), state: GroupState.Ready };
      
      jest.spyOn(groupsRepo, 'find').mockResolvedValue(mockGroup);
      jest.spyOn(groupsRepo, 'update').mockResolvedValue(undefined);
      jest.spyOn(pubService, 'groupStatusChanged').mockResolvedValue(undefined);

      await service.updateGroupStatus(groupId, newStatus);

      expect(groupsRepo.update).toHaveBeenCalledWith(groupId, { status: newStatus });
      expect(pubService.groupStatusChanged).toHaveBeenCalledWith({ id: groupId, status: newStatus });
    });

    it('should not update when status is the same', async () => {
      const groupId = 1;
      const currentStatus = DownloadStatus.Pending;
      const mockGroup = { id: groupId, status: currentStatus, name: 'test', saveAt: '/test', addedAt: new Date(), state: GroupState.Ready };
      
      jest.spyOn(groupsRepo, 'find').mockResolvedValue(mockGroup);
      jest.spyOn(groupsRepo, 'update').mockResolvedValue(undefined);
      jest.spyOn(pubService, 'groupStatusChanged').mockResolvedValue(undefined);

      await service.updateGroupStatus(groupId, currentStatus);

      expect(groupsRepo.update).not.toHaveBeenCalled();
      expect(pubService.groupStatusChanged).not.toHaveBeenCalled();
    });

    it('should throw error when group not found', async () => {
      const groupId = 999;
      
      jest.spyOn(groupsRepo, 'find').mockResolvedValue(undefined);

      await expect(service.updateGroupStatus(groupId, DownloadStatus.Completed))
        .rejects.toThrow(`Group ${groupId} not found.`);
    });
  });

  describe('updateGroupState', () => {
    it('should update group state when state changes', async () => {
      const groupId = 1;
      const newState = GroupState.Ready;
      const mockGroup = { id: groupId, state: GroupState.Initializing, status: DownloadStatus.Pending, name: 'test', saveAt: '/test', addedAt: new Date() };
      
      jest.spyOn(groupsRepo, 'find').mockResolvedValue(mockGroup);
      jest.spyOn(groupsRepo, 'update').mockResolvedValue(undefined);
      jest.spyOn(pubService, 'groupStateChanged').mockResolvedValue(undefined);

      await service.updateGroupState(groupId, newState);

      expect(groupsRepo.update).toHaveBeenCalledWith(groupId, { state: newState });
      expect(pubService.groupStateChanged).toHaveBeenCalledWith({ id: groupId, state: newState });
    });
  });
});
