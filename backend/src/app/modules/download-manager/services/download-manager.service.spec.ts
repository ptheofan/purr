import { Test, TestingModule } from '@nestjs/testing';
import { Volume } from 'memfs/lib/volume';
import { DownloadGroupsRepository, DownloadItemsRepository } from '../repositories';
import { DownloadManagerService } from './download-manager.service';
import { memfs } from 'memfs';
import { DownloadStatus } from '../enums';
import { DownloaderFactory } from '../../downloader';
import { Group, Item } from '../entities';
import { PutioService } from '../../putio';
import { ConfigurationModule } from '../../configuration';

type CreateItemsOptions = {
  groupId: number;
} & {
  [DownloadStatusKey in DownloadStatus]?: {
    small?: number;
    large?: number;
  };
};

function createItems(opts: CreateItemsOptions): Item[] {
  const items: Item[] = [];

  for (const status in opts) {
    if (status !== 'groupId' && opts[status as DownloadStatus]) {
      const { small, large } = opts[status as DownloadStatus]!;

      for (let i = 0; i < (small || 0); i++) {
        items.push({
          id: items.length + 1,
          groupId: opts.groupId,
          name: `file${items.length + 1}.txt`,
          size: 100, // size for small files
          crc32: '123456',
          relativePath: '/',
          downloadLink: `http://example.com/file${items.length + 1}.txt`,
          status: status as DownloadStatus,
        });
      }

      for (let i = 0; i < (large || 0); i++) {
        items.push({
          id: items.length + 1,
          groupId: opts.groupId,
          name: `file${items.length + 1}.txt`,
          size: 1024 * 1024 * 11, // size for large files
          crc32: '123456',
          relativePath: '/',
          downloadLink: `http://example.com/file${items.length + 1}.txt`,
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

describe('DownloadManagerService', () => {
  let service: DownloadManagerService;
  let groupsRepo: DownloadGroupsRepository;
  let itemsRepo: DownloadItemsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigurationModule],
      providers: [
        DownloadManagerService,
        DownloaderFactory,
        DownloadGroupsRepository,
        DownloadItemsRepository,
        {
          provide: PutioService,
          useValue: {
            getVolume: jest.fn().mockResolvedValue(new Volume()),
          }
        },
      ],
    }).compile();

    service = module.get<DownloadManagerService>(DownloadManagerService);
    service.setSettings({
      concurrentLargeFiles: 2,
      concurrentSmallFiles: 8,
      concurrentGroups: 2,
      smallFileThreshold: 1024 * 1024 * 10,   // 10MB
    })
    groupsRepo = module.get<DownloadGroupsRepository>(DownloadGroupsRepository);
    itemsRepo = module.get<DownloadItemsRepository>(DownloadItemsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      expect(group).toEqual([{
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
      expect(group).toEqual([{
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
      expect(group).toEqual([{
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
        saveAt: '/save/here'
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
        saveAt: '/save/here/'
      };
      const savePath = await service.computeDownloadSavePath(item, group);
      expect(savePath).toEqual('/save/here/folder1/file1.txt');
    });
  });

  describe('download group candidates', () => {
    it('should download all groups concurrently', async () => {
      groupsRepo.addMany([
        { id: 1, name: 'group1', status: DownloadStatus.Downloading, saveAt: '/save/here' },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here' },
        { id: 3, name: 'group3', status: DownloadStatus.Pending, saveAt: '/save/here' },
      ]);

      // Unlimited groups concurrently
      service.setSettings({ concurrentGroups: 0 });
      const result = await service.getDownloadGroupCandidates();
      expect(result).toEqual([
        { id: 1, name: 'group1', status: DownloadStatus.Downloading, saveAt: '/save/here' },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here' },
        { id: 3, name: 'group3', status: DownloadStatus.Pending, saveAt: '/save/here' },
      ]);
    });

    it('should download 2 groups concurrently', async () => {
      groupsRepo.addMany([
        { id: 1, name: 'group1', status: DownloadStatus.Pending, saveAt: '/save/here' },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here' },
        { id: 3, name: 'group3', status: DownloadStatus.Pending, saveAt: '/save/here' },
      ]);

      const result = await service.getDownloadGroupCandidates();
      expect(result).toEqual([
        { id: 1, name: 'group1', status: DownloadStatus.Pending, saveAt: '/save/here' },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here' },
      ]);
    });

    it('should download 2 groups concurrently and ignore groups in non-downloadable states', async () => {
      groupsRepo.addMany([
        { id: 1, name: 'group1', status: DownloadStatus.Completed, saveAt: '/save/here' },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here' },
        { id: 3, name: 'group3', status: DownloadStatus.Error, saveAt: '/save/here' },
        { id: 4, name: 'group4', status: DownloadStatus.Downloading, saveAt: '/save/here' },
        { id: 5, name: 'group5', status: DownloadStatus.Pending, saveAt: '/save/here' },
      ]);

      const result = await service.getDownloadGroupCandidates();
      expect(result).toEqual([
        { id: 4, name: 'group4', status: DownloadStatus.Downloading, saveAt: '/save/here' },
        { id: 2, name: 'group2', status: DownloadStatus.Pending, saveAt: '/save/here' },
      ]);
    });
  });

  describe('download items candidates',() => {
    it('should respect concurrency controls', async () => {
      await groupsRepo.addMany([
        { id: 1, name: 'group1', status: DownloadStatus.Completed, saveAt: '/save/here' },
        { id: 2, name: 'group2', status: DownloadStatus.Downloading, saveAt: '/save/here' },
        { id: 3, name: 'group3', status: DownloadStatus.Error, saveAt: '/save/here' },
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
        { id: 1, name: 'group1', status: DownloadStatus.Completed, saveAt: '/save/here' },
        { id: 2, name: 'group2', status: DownloadStatus.Downloading, saveAt: '/save/here' },
        { id: 3, name: 'group3', status: DownloadStatus.Pending, saveAt: '/save/here' },
        { id: 4, name: 'group4', status: DownloadStatus.Error, saveAt: '/save/here' },
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
  });
});
