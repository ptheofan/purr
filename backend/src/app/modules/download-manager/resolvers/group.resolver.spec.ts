import { Test, TestingModule } from '@nestjs/testing';
import { GroupResolver } from './group.resolver';
import { DownloadGroupsRepository, DownloadItemsRepository } from '../repositories';
import { GroupDto, ItemDto } from '../dtos';
import { PubKeys } from '../enums';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../../subscriptions';

describe('GroupResolver', () => {
  let resolver: GroupResolver;
  let groupRepo: jest.Mocked<DownloadGroupsRepository>;
  let itemRepo: jest.Mocked<DownloadItemsRepository>;
  let pubSub: jest.Mocked<PubSub>;

  const mockGroup: GroupDto = {
    id: 1,
    name: 'Test Group',
    addedAt: new Date('2023-01-01'),
    saveAt: '/test/path',
    status: 'PENDING' as any,
    state: 'IDLE' as any,
  };

  const mockItem: ItemDto = {
    id: 1,
    groupId: 1,
    name: 'test-file.txt',
    size: 1024,
    crc32: 'abc123',
    relativePath: 'test-file.txt',
    downloadLink: 'https://example.com/file',
    status: 'PENDING' as any,
  };

  beforeEach(async () => {
    const mockGroupRepo = {
      getAll: jest.fn(),
      find: jest.fn(),
    };

    const mockItemRepo = {
      filter: jest.fn(),
    };

    const mockPubSub = {
      asyncIterator: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupResolver,
        {
          provide: DownloadGroupsRepository,
          useValue: mockGroupRepo,
        },
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

    resolver = module.get<GroupResolver>(GroupResolver);
    groupRepo = module.get(DownloadGroupsRepository);
    itemRepo = module.get(DownloadItemsRepository);
    pubSub = module.get(PUB_SUB);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGroups', () => {
    it('should return an array of groups', async () => {
      const expectedGroups = [mockGroup];
      groupRepo.getAll.mockResolvedValue(expectedGroups);

      const result = await resolver.getGroups();

      expect(result).toEqual(expectedGroups);
      expect(groupRepo.getAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no groups exist', async () => {
      groupRepo.getAll.mockResolvedValue([]);

      const result = await resolver.getGroups();

      expect(result).toEqual([]);
      expect(groupRepo.getAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getGroup', () => {
    it('should return a group when found', async () => {
      groupRepo.find.mockResolvedValue(mockGroup);

      const result = await resolver.getGroup(1);

      expect(result).toEqual(mockGroup);
      expect(groupRepo.find).toHaveBeenCalledWith(expect.any(Function));
      expect(groupRepo.find).toHaveBeenCalledTimes(1);
    });

    it('should return null when group not found', async () => {
      groupRepo.find.mockResolvedValue(undefined);

      const result = await resolver.getGroup(999);

      expect(result).toBeNull();
      expect(groupRepo.find).toHaveBeenCalledWith(expect.any(Function));
      expect(groupRepo.find).toHaveBeenCalledTimes(1);
    });

    it('should call find with correct predicate', async () => {
      groupRepo.find.mockResolvedValue(mockGroup);

      await resolver.getGroup(1);

      const predicate = groupRepo.find.mock.calls[0][0];
      expect(predicate(mockGroup)).toBe(true);
      expect(predicate({ ...mockGroup, id: 2 })).toBe(false);
    });
  });

  describe('items', () => {
    it('should return items for the given group', async () => {
      const expectedItems = [mockItem];
      itemRepo.filter.mockResolvedValue(expectedItems);

      const result = await resolver.items(mockGroup);

      expect(result).toEqual(expectedItems);
      expect(itemRepo.filter).toHaveBeenCalledWith(expect.any(Function));
      expect(itemRepo.filter).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no items exist for group', async () => {
      itemRepo.filter.mockResolvedValue([]);

      const result = await resolver.items(mockGroup);

      expect(result).toEqual([]);
      expect(itemRepo.filter).toHaveBeenCalledWith(expect.any(Function));
      expect(itemRepo.filter).toHaveBeenCalledTimes(1);
    });

    it('should call filter with correct predicate', async () => {
      itemRepo.filter.mockResolvedValue([mockItem]);

      await resolver.items(mockGroup);

      const predicate = itemRepo.filter.mock.calls[0][0];
      expect(predicate(mockItem)).toBe(true);
      expect(predicate({ ...mockItem, groupId: 2 })).toBe(false);
    });
  });

  describe('groupStateChanged', () => {
    it('should return async iterator for group state changes', () => {
      const mockIterator = {
        next: jest.fn(),
        return: jest.fn(),
        throw: jest.fn(),
      } as unknown as AsyncIterator<unknown>;
      pubSub.asyncIterator.mockReturnValue(mockIterator);

      const result = resolver.groupStateChanged();

      expect(result).toBe(mockIterator);
      expect(pubSub.asyncIterator).toHaveBeenCalledWith(PubKeys.groupStateChanged);
      expect(pubSub.asyncIterator).toHaveBeenCalledTimes(1);
    });
  });

  describe('groupStatusChanged', () => {
    it('should return async iterator for group status changes', () => {
      const mockIterator = {
        next: jest.fn(),
        return: jest.fn(),
        throw: jest.fn(),
      } as unknown as AsyncIterator<unknown>;
      pubSub.asyncIterator.mockReturnValue(mockIterator);

      const result = resolver.groupStatusChanged();

      expect(result).toBe(mockIterator);
      expect(pubSub.asyncIterator).toHaveBeenCalledWith(PubKeys.groupStatusChanged);
      expect(pubSub.asyncIterator).toHaveBeenCalledTimes(1);
    });
  });

  describe('groupAdded', () => {
    it('should return async iterator for group added events', () => {
      const mockIterator = {
        next: jest.fn(),
        return: jest.fn(),
        throw: jest.fn(),
      } as unknown as AsyncIterator<unknown>;
      pubSub.asyncIterator.mockReturnValue(mockIterator);

      const result = resolver.groupAdded();

      expect(result).toBe(mockIterator);
      expect(pubSub.asyncIterator).toHaveBeenCalledWith(PubKeys.groupAdded);
      expect(pubSub.asyncIterator).toHaveBeenCalledTimes(1);
    });
  });
});
