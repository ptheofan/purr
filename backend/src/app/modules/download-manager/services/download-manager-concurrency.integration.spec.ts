import { Test, TestingModule } from '@nestjs/testing';
import { DownloadManagerService } from './download-manager.service';
import { DownloadGroupsRepository, DownloadItemsRepository } from '../repositories';
import { DownloadStatus, GroupState } from '../enums';
import { Group, Item } from '../entities';
import { DownloadFactory } from '../../downloader';
import { PutioService } from '../../putio';
import { AppConfigService } from '../../configuration';
import { ConfigService } from '@nestjs/config';
import { PublisherService } from './publisher.service';

describe('DownloadManager Concurrency Integration', () => {
  let service: DownloadManagerService;
  let itemsRepo: jest.Mocked<DownloadItemsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadManagerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const mockConfig = {
                NODE_ENV: 'test',
                PUTIO_CLIENT_ID: '123',
                PUTIO_CLIENT_SECRET: 'secret',
                PUTIO_AUTH: 'auth',
                DOWNLOADER_ARBITRARY_DOWNLOADS_ROOT_FOLDER: '/tmp',
              };
              return mockConfig[key];
            }),
          },
        },
        {
          provide: AppConfigService,
          useValue: {
            concurrentGroups: 2,
            concurrentSmallFiles: 2,
            concurrentLargeFiles: 2,
            uiProgressUpdateInterval: 0, // Disable UI updates in tests
          },
        },
        {
          provide: DownloadGroupsRepository,
          useValue: {
            filter: jest.fn(),
            getAll: jest.fn(),
            findById: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: DownloadItemsRepository,
          useValue: {
            filter: jest.fn(),
            getAll: jest.fn(),
            findById: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: DownloadFactory,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: PutioService,
          useValue: {
            getFiles: jest.fn(),
            getDownloadLink: jest.fn(),
          },
        },
        {
          provide: PublisherService,
          useValue: {
            publishDownloadStats: jest.fn(),
            publishItemStats: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DownloadManagerService>(DownloadManagerService);
    itemsRepo = module.get(DownloadItemsRepository);
  });

  describe('Cross-group concurrency bug fix', () => {
    it('should process large files from multiple groups when small files limit is reached', async () => {
      // Setup: Group 1 has only small files, Group 2 has only large files
      const groups: Group[] = [
        {
          id: 1,
          name: 'Group 1 (Small Files)',
          saveAt: '/downloads/group1',
          status: DownloadStatus.Downloading,
          state: GroupState.Ready,
          addedAt: new Date(),
        },
        {
          id: 2,
          name: 'Group 2 (Large Files)',
          saveAt: '/downloads/group2',
          status: DownloadStatus.Downloading,
          state: GroupState.Ready,
          addedAt: new Date(),
        },
      ];

      // Group 1 items (all small - size < 10MB threshold)
      const group1Items: Item[] = [
        {
          id: 1,
          groupId: 1,
          name: 'small1.txt',
          size: 1024 * 1024 * 1, // 1MB
          crc32: 'abc123',
          relativePath: '/',
          downloadLink: 'http://example.com/small1.txt',
          status: DownloadStatus.Pending,
        },
        {
          id: 2,
          groupId: 1,
          name: 'small2.txt',
          size: 1024 * 1024 * 2, // 2MB
          crc32: 'def456',
          relativePath: '/',
          downloadLink: 'http://example.com/small2.txt',
          status: DownloadStatus.Pending,
        },
        {
          id: 3,
          groupId: 1,
          name: 'small3.txt',
          size: 1024 * 1024 * 3, // 3MB
          crc32: 'ghi789',
          relativePath: '/',
          downloadLink: 'http://example.com/small3.txt',
          status: DownloadStatus.Pending,
        },
      ];

      // Group 2 items (all large - size > 10MB threshold)
      const group2Items: Item[] = [
        {
          id: 4,
          groupId: 2,
          name: 'large1.mkv',
          size: 1024 * 1024 * 50, // 50MB
          crc32: 'jkl012',
          relativePath: '/',
          downloadLink: 'http://example.com/large1.mkv',
          status: DownloadStatus.Pending,
        },
        {
          id: 5,
          groupId: 2,
          name: 'large2.mkv',
          size: 1024 * 1024 * 100, // 100MB
          crc32: 'mno345',
          relativePath: '/',
          downloadLink: 'http://example.com/large2.mkv',
          status: DownloadStatus.Pending,
        },
      ];

      // Mock repository responses
      // Mock getAll to return no currently downloading items
      itemsRepo.getAll.mockResolvedValue([]);

      // Mock filter to return items based on filter criteria
      itemsRepo.filter.mockImplementation((filterFn) => {
        const allItems = [...group1Items, ...group2Items];
        return Promise.resolve(allItems.filter(filterFn));
      });

      // Act: Get download item candidates
      const candidates = await service.getDownloadItemCandidates(groups);

      // Assert: Should get 2 small files + 2 large files (respecting both limits)
      expect(candidates).toHaveLength(4);

      // Should have 2 small files from Group 1
      const smallFiles = candidates.filter(item => item.size <= 1024 * 1024 * 10);
      expect(smallFiles).toHaveLength(2);
      expect(smallFiles.map(f => f.name).sort()).toEqual(['small1.txt', 'small2.txt']);

      // Should have 2 large files from Group 2 (this proves the bug is fixed)
      const largeFiles = candidates.filter(item => item.size > 1024 * 1024 * 10);
      expect(largeFiles).toHaveLength(2);
      expect(largeFiles.map(f => f.name).sort()).toEqual(['large1.mkv', 'large2.mkv']);

      // Verify both groups are represented
      const groupIds = [...new Set(candidates.map(c => c.groupId))];
      expect(groupIds.sort()).toEqual([1, 2]);
    });

    it('should still respect individual file type limits', async () => {
      // This test ensures we didn't break the existing concurrency limits
      const groups: Group[] = [
        {
          id: 1,
          name: 'Mixed Group',
          saveAt: '/downloads/mixed',
          status: DownloadStatus.Downloading,
          state: GroupState.Ready,
          addedAt: new Date(),
        },
      ];

      // Create more items than the concurrency limits
      const items: Item[] = [
        // 3 small files (but limit is 2) - all < 10MB
        { id: 1, groupId: 1, name: 'small1.txt', size: 1024 * 1024 * 1, crc32: 'a', relativePath: '/', downloadLink: 'http://ex.com/1', status: DownloadStatus.Pending },
        { id: 2, groupId: 1, name: 'small2.txt', size: 1024 * 1024 * 2, crc32: 'b', relativePath: '/', downloadLink: 'http://ex.com/2', status: DownloadStatus.Pending },
        { id: 3, groupId: 1, name: 'small3.txt', size: 1024 * 1024 * 3, crc32: 'c', relativePath: '/', downloadLink: 'http://ex.com/3', status: DownloadStatus.Pending },
        // 3 large files (but limit is 2) - all > 10MB
        { id: 4, groupId: 1, name: 'large1.mkv', size: 1024 * 1024 * 20, crc32: 'd', relativePath: '/', downloadLink: 'http://ex.com/4', status: DownloadStatus.Pending },
        { id: 5, groupId: 1, name: 'large2.mkv', size: 1024 * 1024 * 30, crc32: 'e', relativePath: '/', downloadLink: 'http://ex.com/5', status: DownloadStatus.Pending },
        { id: 6, groupId: 1, name: 'large3.mkv', size: 1024 * 1024 * 40, crc32: 'f', relativePath: '/', downloadLink: 'http://ex.com/6', status: DownloadStatus.Pending },
      ];

      // Mock getAll to return no currently downloading items
      itemsRepo.getAll.mockResolvedValue([]);

      // Mock filter to return items based on filter criteria
      itemsRepo.filter.mockImplementation((filterFn) => {
        return Promise.resolve(items.filter(filterFn));
      });

      const candidates = await service.getDownloadItemCandidates(groups);

      // Should still respect limits: 2 small + 2 large = 4 total
      expect(candidates).toHaveLength(4);

      const smallFiles = candidates.filter(item => item.size <= 1024 * 1024 * 10);
      const largeFiles = candidates.filter(item => item.size > 1024 * 1024 * 10);

      expect(smallFiles).toHaveLength(2);
      expect(largeFiles).toHaveLength(2);
    });

    it('should not select items when already at concurrency limits', async () => {
      // Test that the method respects existing downloads in progress
      const groups: Group[] = [
        {
          id: 1,
          name: 'Test Group',
          saveAt: '/downloads/test',
          status: DownloadStatus.Downloading,
          state: GroupState.Ready,
          addedAt: new Date(),
        },
      ];

      const pendingItems: Item[] = [
        { id: 1, groupId: 1, name: 'small1.txt', size: 1024 * 1024 * 1, crc32: 'a', relativePath: '/', downloadLink: 'http://ex.com/1', status: DownloadStatus.Pending },
        { id: 2, groupId: 1, name: 'large1.mkv', size: 1024 * 1024 * 20, crc32: 'b', relativePath: '/', downloadLink: 'http://ex.com/2', status: DownloadStatus.Pending },
      ];

      // Mock currently downloading items (at max capacity)
      const downloadingItems: Item[] = [
        { id: 3, groupId: 1, name: 'downloading_small1.txt', size: 1024 * 1024 * 2, crc32: 'c', relativePath: '/', downloadLink: 'http://ex.com/3', status: DownloadStatus.Downloading },
        { id: 4, groupId: 1, name: 'downloading_small2.txt', size: 1024 * 1024 * 3, crc32: 'd', relativePath: '/', downloadLink: 'http://ex.com/4', status: DownloadStatus.Downloading },
        { id: 5, groupId: 1, name: 'downloading_large1.mkv', size: 1024 * 1024 * 30, crc32: 'e', relativePath: '/', downloadLink: 'http://ex.com/5', status: DownloadStatus.Downloading },
        { id: 6, groupId: 1, name: 'downloading_large2.mkv', size: 1024 * 1024 * 40, crc32: 'f', relativePath: '/', downloadLink: 'http://ex.com/6', status: DownloadStatus.Downloading },
      ];

      // Mock getAll to return items currently downloading (at max capacity)
      itemsRepo.getAll.mockResolvedValue(downloadingItems);

      // Mock filter to return pending items
      itemsRepo.filter.mockImplementation((filterFn) => {
        return Promise.resolve(pendingItems.filter(filterFn));
      });

      const candidates = await service.getDownloadItemCandidates(groups);

      // Should return empty array as we're already at max concurrency for both types
      expect(candidates).toHaveLength(0);
    });
  });
});