import { Test, TestingModule } from '@nestjs/testing';
import { DownloadItemsRepository } from './download-items.repository';
import { Item } from '../entities';
import { DownloadStatus } from '../enums';

describe('DownloadItemsRepository', () => {
  let repository: DownloadItemsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DownloadItemsRepository],
    }).compile();

    repository = module.get<DownloadItemsRepository>(DownloadItemsRepository);
  });

  afterEach(async () => {
    // Clean up after each test
    await repository.removeAll();
  });

  describe('Repository Operations', () => {
    it('should be defined', () => {
      expect(repository).toBeDefined();
    });

    it('should add an item', async () => {
      const item: Item = {
        id: 1,
        groupId: 100,
        name: 'test-file.mkv',
        size: 1024000,
        crc32: 'abc123',
        relativePath: '/downloads/movies',
        downloadLink: 'https://example.com/file.mkv',
        status: DownloadStatus.Pending,
      };

      await repository.add(item);
      const result = await repository.getById(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.groupId).toBe(100);
      expect(result?.name).toBe('test-file.mkv');
      expect(result?.size).toBe(1024000);
      expect(result?.crc32).toBe('abc123');
      expect(result?.relativePath).toBe('/downloads/movies');
      expect(result?.downloadLink).toBe('https://example.com/file.mkv');
      expect(result?.status).toBe(DownloadStatus.Pending);
    });

    it('should return a deep copy of the item', async () => {
      const item: Item = {
        id: 1,
        groupId: 100,
        name: 'test-file.mkv',
        size: 1024000,
        crc32: 'abc123',
        relativePath: '/downloads/movies',
        status: DownloadStatus.Pending,
      };

      await repository.add(item);
      const result = await repository.getById(1);

      expect(result).toBeDefined();
      expect(result).not.toBe(item); // Different reference
      expect(result).toEqual(item); // Same content
    });

    it('should update an existing item', async () => {
      const item: Item = {
        id: 1,
        groupId: 100,
        name: 'test-file.mkv',
        size: 1024000,
        crc32: 'abc123',
        relativePath: '/downloads/movies',
        status: DownloadStatus.Pending,
      };

      await repository.add(item);
      
      const updated = await repository.update(1, {
        status: DownloadStatus.Downloading,
        error: undefined,
      });

      expect(updated).toBe(true);
      
      const result = await repository.getById(1);
      expect(result?.status).toBe(DownloadStatus.Downloading);
      expect(result?.error).toBeUndefined();
    });

    it('should return false when updating non-existent item', async () => {
      const updated = await repository.update(999, {
        status: DownloadStatus.Downloading,
      });

      expect(updated).toBe(false);
    });

    it('should remove an item', async () => {
      const item: Item = {
        id: 1,
        groupId: 100,
        name: 'test-file.mkv',
        size: 1024000,
        crc32: 'abc123',
        relativePath: '/downloads/movies',
        status: DownloadStatus.Pending,
      };

      await repository.add(item);
      const removed = await repository.remove(1);

      expect(removed).toBe(true);
      
      const result = await repository.getById(1);
      expect(result).toBeUndefined();
    });

    it('should return false when removing non-existent item', async () => {
      const removed = await repository.remove(999);
      expect(removed).toBe(false);
    });

    it('should get all items', async () => {
      const items: Item[] = [
        {
          id: 1,
          groupId: 100,
          name: 'file1.mkv',
          size: 1024000,
          crc32: 'abc123',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Pending,
        },
        {
          id: 2,
          groupId: 100,
          name: 'file2.mkv',
          size: 2048000,
          crc32: 'def456',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Downloading,
        },
      ];

      await repository.addMany(items);
      const result = await repository.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it('should filter items by predicate', async () => {
      const items: Item[] = [
        {
          id: 1,
          groupId: 100,
          name: 'file1.mkv',
          size: 1024000,
          crc32: 'abc123',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Pending,
        },
        {
          id: 2,
          groupId: 100,
          name: 'file2.mkv',
          size: 2048000,
          crc32: 'def456',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Downloading,
        },
        {
          id: 3,
          groupId: 200,
          name: 'file3.mkv',
          size: 3072000,
          crc32: 'ghi789',
          relativePath: '/downloads/series',
          status: DownloadStatus.Pending,
        },
      ];

      await repository.addMany(items);
      
      // Filter by groupId
      const group100Items = await repository.filter(item => item.groupId === 100);
      expect(group100Items).toHaveLength(2);
      expect(group100Items.every(item => item.groupId === 100)).toBe(true);

      // Filter by status
      const pendingItems = await repository.filter(item => item.status === DownloadStatus.Pending);
      expect(pendingItems).toHaveLength(2);
      expect(pendingItems.every(item => item.status === DownloadStatus.Pending)).toBe(true);
    });

    it('should find item by predicate', async () => {
      const items: Item[] = [
        {
          id: 1,
          groupId: 100,
          name: 'file1.mkv',
          size: 1024000,
          crc32: 'abc123',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Pending,
        },
        {
          id: 2,
          groupId: 100,
          name: 'file2.mkv',
          size: 2048000,
          crc32: 'def456',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Downloading,
        },
      ];

      await repository.addMany(items);
      
      const found = await repository.find(item => item.name === 'file2.mkv');
      expect(found).toBeDefined();
      expect(found?.id).toBe(2);
      expect(found?.name).toBe('file2.mkv');
    });

    it('should return undefined when finding non-existent item', async () => {
      const found = await repository.find(item => item.name === 'non-existent.mkv');
      expect(found).toBeUndefined();
    });

    it('should check if item exists', async () => {
      const item: Item = {
        id: 1,
        groupId: 100,
        name: 'test-file.mkv',
        size: 1024000,
        crc32: 'abc123',
        relativePath: '/downloads/movies',
        status: DownloadStatus.Pending,
      };

      await repository.add(item);
      
      expect(await repository.has(1)).toBe(true);
      expect(await repository.has(999)).toBe(false);
    });

    it('should return correct size', async () => {
      expect(await repository.size()).toBe(0);
      expect(await repository.isEmpty()).toBe(true);

      const items: Item[] = [
        {
          id: 1,
          groupId: 100,
          name: 'file1.mkv',
          size: 1024000,
          crc32: 'abc123',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Pending,
        },
        {
          id: 2,
          groupId: 100,
          name: 'file2.mkv',
          size: 2048000,
          crc32: 'def456',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Downloading,
        },
      ];

      await repository.addMany(items);
      
      expect(await repository.size()).toBe(2);
      expect(await repository.isEmpty()).toBe(false);
    });

    it('should remove all items', async () => {
      const items: Item[] = [
        {
          id: 1,
          groupId: 100,
          name: 'file1.mkv',
          size: 1024000,
          crc32: 'abc123',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Pending,
        },
        {
          id: 2,
          groupId: 100,
          name: 'file2.mkv',
          size: 2048000,
          crc32: 'def456',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Downloading,
        },
      ];

      await repository.addMany(items);
      expect(await repository.size()).toBe(2);

      await repository.removeAll();
      expect(await repository.size()).toBe(0);
      expect(await repository.isEmpty()).toBe(true);
    });

    it('should remove many items by predicate', async () => {
      const items: Item[] = [
        {
          id: 1,
          groupId: 100,
          name: 'file1.mkv',
          size: 1024000,
          crc32: 'abc123',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Pending,
        },
        {
          id: 2,
          groupId: 100,
          name: 'file2.mkv',
          size: 2048000,
          crc32: 'def456',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Downloading,
        },
        {
          id: 3,
          groupId: 200,
          name: 'file3.mkv',
          size: 3072000,
          crc32: 'ghi789',
          relativePath: '/downloads/series',
          status: DownloadStatus.Pending,
        },
      ];

      await repository.addMany(items);
      expect(await repository.size()).toBe(3);

      const removedCount = await repository.removeMany(item => item.groupId === 100);
      expect(removedCount).toBe(2);
      expect(await repository.size()).toBe(1);

      const remaining = await repository.getAll();
      expect(remaining[0].id).toBe(3);
    });

    it('should perform bulk update', async () => {
      const items: Item[] = [
        {
          id: 1,
          groupId: 100,
          name: 'file1.mkv',
          size: 1024000,
          crc32: 'abc123',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Pending,
        },
        {
          id: 2,
          groupId: 100,
          name: 'file2.mkv',
          size: 2048000,
          crc32: 'def456',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Pending,
        },
      ];

      await repository.addMany(items);

      const updates = [
        { id: 1, update: { status: DownloadStatus.Downloading } },
        { id: 2, update: { status: DownloadStatus.Completed } },
        { id: 999, update: { status: DownloadStatus.Error } }, // Non-existent
      ];

      const updatedCount = await repository.bulkUpdate(updates);
      expect(updatedCount).toBe(2);

      const item1 = await repository.getById(1);
      const item2 = await repository.getById(2);
      
      expect(item1?.status).toBe(DownloadStatus.Downloading);
      expect(item2?.status).toBe(DownloadStatus.Completed);
    });

    it('should perform bulk remove', async () => {
      const items: Item[] = [
        {
          id: 1,
          groupId: 100,
          name: 'file1.mkv',
          size: 1024000,
          crc32: 'abc123',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Pending,
        },
        {
          id: 2,
          groupId: 100,
          name: 'file2.mkv',
          size: 2048000,
          crc32: 'def456',
          relativePath: '/downloads/movies',
          status: DownloadStatus.Downloading,
        },
        {
          id: 3,
          groupId: 200,
          name: 'file3.mkv',
          size: 3072000,
          crc32: 'ghi789',
          relativePath: '/downloads/series',
          status: DownloadStatus.Pending,
        },
      ];

      await repository.addMany(items);
      expect(await repository.size()).toBe(3);

      const removedCount = await repository.bulkRemove([1, 3, 999]); // 999 doesn't exist
      expect(removedCount).toBe(2);
      expect(await repository.size()).toBe(1);

      const remaining = await repository.getAll();
      expect(remaining[0].id).toBe(2);
    });
  });

  describe('Thread Safety', () => {
    it('should handle concurrent operations', async () => {
      const promises: Promise<void>[] = [];
      
      // Add items concurrently
      for (let i = 1; i <= 10; i++) {
        const item: Item = {
          id: i,
          groupId: 100,
          name: `file${i}.mkv`,
          size: 1024000,
          crc32: `hash${i}`,
          relativePath: '/downloads/movies',
          status: DownloadStatus.Pending,
        };
        promises.push(repository.add(item));
      }

      await Promise.all(promises);
      
      expect(await repository.size()).toBe(10);
      
      const allItems = await repository.getAll();
      expect(allItems).toHaveLength(10);
      
      // Verify all items are present
      for (let i = 1; i <= 10; i++) {
        const item = await repository.getById(i);
        expect(item).toBeDefined();
        expect(item?.id).toBe(i);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle items with null crc32', async () => {
      const item: Item = {
        id: 1,
        groupId: 100,
        name: 'test-file.mkv',
        size: 1024000,
        crc32: null,
        relativePath: '/downloads/movies',
        status: DownloadStatus.Pending,
      };

      await repository.add(item);
      const result = await repository.getById(1);

      expect(result?.crc32).toBeNull();
    });

    it('should handle items with undefined error', async () => {
      const item: Item = {
        id: 1,
        groupId: 100,
        name: 'test-file.mkv',
        size: 1024000,
        crc32: 'abc123',
        relativePath: '/downloads/movies',
        status: DownloadStatus.Error,
        error: 'Download failed',
      };

      await repository.add(item);
      const result = await repository.getById(1);

      expect(result?.error).toBe('Download failed');
    });

    it('should handle items without downloadLink', async () => {
      const item: Item = {
        id: 1,
        groupId: 100,
        name: 'test-file.mkv',
        size: 1024000,
        crc32: 'abc123',
        relativePath: '/downloads/movies',
        status: DownloadStatus.Pending,
      };

      await repository.add(item);
      const result = await repository.getById(1);

      expect(result?.downloadLink).toBeUndefined();
    });
  });
});
