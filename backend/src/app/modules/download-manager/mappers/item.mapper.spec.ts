import { Test, TestingModule } from '@nestjs/testing';
import { ItemMapper } from './item.mapper';
import { Item } from '../entities';
import { ItemDto } from '../dtos';
import { DownloadStatus } from '../enums';

describe('ItemMapper', () => {
  let mapper: ItemMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ItemMapper],
    }).compile();

    mapper = module.get<ItemMapper>(ItemMapper);
  });

  describe('entityToDto', () => {
    it('should convert Item entity to ItemDto with all properties', () => {
      // Arrange
      const item: Item = {
        id: 1,
        groupId: 100,
        name: 'test-file.mkv',
        size: 1024000,
        crc32: 'a1b2c3d4',
        relativePath: '/downloads/movies',
        downloadLink: 'https://example.com/download/test-file.mkv',
        status: DownloadStatus.Pending,
        error: undefined,
      };

      const expectedDto: ItemDto = {
        id: 1,
        groupId: 100,
        name: 'test-file.mkv',
        size: 1024000,
        crc32: 'a1b2c3d4',
        relativePath: '/downloads/movies',
        downloadLink: 'https://example.com/download/test-file.mkv',
        status: DownloadStatus.Pending,
        error: undefined,
      };

      // Act
      const result = mapper.entityToDto(item);

      // Assert
      expect(result).toEqual(expectedDto);
    });

    it('should handle Item with null crc32', () => {
      // Arrange
      const item: Item = {
        id: 2,
        groupId: 200,
        name: 'another-file.txt',
        size: 512,
        crc32: null,
        relativePath: '/downloads/documents',
        downloadLink: undefined,
        status: DownloadStatus.Completed,
        error: undefined,
      };

      // Act
      const result = mapper.entityToDto(item);

      // Assert
      expect(result.crc32).toBeNull();
      expect(result.downloadLink).toBeUndefined();
      expect(result.status).toBe(DownloadStatus.Completed);
    });

    it('should handle Item with error status and error message', () => {
      // Arrange
      const item: Item = {
        id: 3,
        groupId: 300,
        name: 'failed-file.zip',
        size: 2048000,
        crc32: 'e5f6g7h8',
        relativePath: '/downloads/archives',
        downloadLink: 'https://example.com/download/failed-file.zip',
        status: DownloadStatus.Error,
        error: 'Download failed: Connection timeout',
      };

      // Act
      const result = mapper.entityToDto(item);

      // Assert
      expect(result.status).toBe(DownloadStatus.Error);
      expect(result.error).toBe('Download failed: Connection timeout');
    });

    it('should handle Item with all DownloadStatus values', () => {
      const statuses = [
        DownloadStatus.Pending,
        DownloadStatus.Paused,
        DownloadStatus.Downloading,
        DownloadStatus.Completed,
        DownloadStatus.Error,
      ];

      statuses.forEach((status, index) => {
        // Arrange
        const item: Item = {
          id: index + 1,
          groupId: 400 + index,
          name: `file-${status.toLowerCase()}.ext`,
          size: 1024 * (index + 1),
          crc32: `hash${index}`,
          relativePath: '/downloads',
          downloadLink: `https://example.com/file-${index}`,
          status,
          error: status === DownloadStatus.Error ? 'Test error' : undefined,
        };

        // Act
        const result = mapper.entityToDto(item);

        // Assert
        expect(result.status).toBe(status);
        if (status === DownloadStatus.Error) {
          expect(result.error).toBe('Test error');
        } else {
          expect(result.error).toBeUndefined();
        }
      });
    });

    it('should preserve all property types correctly', () => {
      // Arrange
      const item: Item = {
        id: 999,
        groupId: 999,
        name: 'type-test.mp4',
        size: 987654321,
        crc32: 'typecheck123',
        relativePath: '/type/test',
        downloadLink: 'https://type.test/check',
        status: DownloadStatus.Downloading,
        error: 'Type error',
      };

      // Act
      const result = mapper.entityToDto(item);

      // Assert
      expect(typeof result.id).toBe('number');
      expect(typeof result.groupId).toBe('number');
      expect(typeof result.name).toBe('string');
      expect(typeof result.size).toBe('number');
      expect(typeof result.crc32).toBe('string');
      expect(typeof result.relativePath).toBe('string');
      expect(typeof result.downloadLink).toBe('string');
      expect(typeof result.status).toBe('string');
      expect(typeof result.error).toBe('string');
    });

    it('should create a new object instance (not reference)', () => {
      // Arrange
      const item: Item = {
        id: 1,
        groupId: 1,
        name: 'reference-test.txt',
        size: 100,
        crc32: 'ref',
        relativePath: '/test',
        downloadLink: 'https://test.com',
        status: DownloadStatus.Pending,
        error: undefined,
      };

      // Act
      const result = mapper.entityToDto(item);

      // Assert
      expect(result).not.toBe(item); // Different object instances
      expect(result).toEqual(item); // But same values
    });
  });
});
