import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { ItemResolver } from './item.resolver';
import { DownloadItemsRepository } from '../repositories';
import { ItemDto, ItemStatsDto, ItemStatusChangedDto } from '../dtos';
import { PubKeys } from '../enums';
import { PUB_SUB } from '../../subscriptions';

describe('ItemResolver', () => {
  let resolver: ItemResolver;
  let itemRepo: jest.Mocked<DownloadItemsRepository>;
  let pubSub: jest.Mocked<PubSub>;

  const mockItem: ItemDto = {
    id: 1,
    groupId: 1,
    name: 'test-file.txt',
    size: 1024,
    crc32: 'abc123',
    relativePath: '/test/test-file.txt',
    downloadLink: 'https://example.com/file',
    status: 'PENDING' as any,
    error: undefined,
  };

  const mockItems: ItemDto[] = [mockItem];

  beforeEach(async () => {
    const mockItemRepo = {
      getAll: jest.fn(),
      find: jest.fn(),
    };

    const mockPubSub = {
      asyncIterator: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemResolver,
        {
          provide: DownloadItemsRepository,
          useValue: mockItemRepo,
        },
        {
          provide: PUB_SUB,
          useValue: mockPubSub,
        },
      ],
    }).compile();

    resolver = module.get<ItemResolver>(ItemResolver);
    itemRepo = module.get(DownloadItemsRepository);
    pubSub = module.get(PUB_SUB);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('getItems', () => {
    it('should return all items', async () => {
      itemRepo.getAll.mockResolvedValue(mockItems);

      const result = await resolver.getItems();

      expect(result).toEqual(mockItems);
      expect(itemRepo.getAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no items exist', async () => {
      itemRepo.getAll.mockResolvedValue([]);

      const result = await resolver.getItems();

      expect(result).toEqual([]);
      expect(itemRepo.getAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getItem', () => {
    it('should return item when found', async () => {
      itemRepo.find.mockResolvedValue(mockItem);

      const result = await resolver.getItem(1);

      expect(result).toEqual(mockItem);
      expect(itemRepo.find).toHaveBeenCalledWith(expect.any(Function));
      expect(itemRepo.find).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when item not found', async () => {
      itemRepo.find.mockResolvedValue(undefined);

      await expect(resolver.getItem(999)).rejects.toThrow(
        new NotFoundException('Item with ID 999 not found')
      );

      expect(itemRepo.find).toHaveBeenCalledWith(expect.any(Function));
      expect(itemRepo.find).toHaveBeenCalledTimes(1);
    });

    it('should call find with correct predicate', async () => {
      itemRepo.find.mockResolvedValue(mockItem);

      await resolver.getItem(1);

      expect(itemRepo.find).toHaveBeenCalledWith(
        expect.any(Function)
      );
      
      // Verify the predicate function works correctly
      const predicate = itemRepo.find.mock.calls[0][0];
      expect(predicate(mockItem)).toBe(true);
      expect(predicate({ ...mockItem, id: 2 })).toBe(false);
    });
  });

  describe('itemStatusChanged', () => {
    it('should return async iterator for item status changes', () => {
      const mockIterator = {} as any;
      pubSub.asyncIterator.mockReturnValue(mockIterator);

      const result = resolver.itemStatusChanged();

      expect(result).toBe(mockIterator);
      expect(pubSub.asyncIterator).toHaveBeenCalledWith(PubKeys.itemStatusChanged);
      expect(pubSub.asyncIterator).toHaveBeenCalledTimes(1);
    });
  });

  describe('itemStatsUpdated', () => {
    it('should return async iterator for item stats updates', () => {
      const mockIterator = {} as any;
      pubSub.asyncIterator.mockReturnValue(mockIterator);

      const result = resolver.itemStatsUpdated();

      expect(result).toBe(mockIterator);
      expect(pubSub.asyncIterator).toHaveBeenCalledWith(PubKeys.itemStatsUpdated);
      expect(pubSub.asyncIterator).toHaveBeenCalledTimes(1);
    });
  });
});
