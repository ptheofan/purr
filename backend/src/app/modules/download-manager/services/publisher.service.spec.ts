import { Test, TestingModule } from '@nestjs/testing';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import { PubSub } from 'graphql-subscriptions';
import { PublisherService } from './publisher.service';
import { PubKeys, GroupState, DownloadStatus } from '../enums';
import {
  DownloadManagerStatsDto,
  GroupDto,
  GroupStateChangedDto,
  GroupStatusChangedDto,
  ItemStatsDto,
  ItemStatusChangedDto
} from '../dtos';
import { FragmentStatus } from '../../downloader';

describe('PublisherService', () => {
  let service: PublisherService;
  let pubSub: jest.Mocked<PubSub>;

  const mockPubSub = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublisherService,
        {
          provide: 'PUB_SUB',
          useValue: mockPubSub,
        },
      ],
    }).compile();

    service = module.get<PublisherService>(PublisherService);
    pubSub = module.get('PUB_SUB');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('groupStateChanged', () => {
    it('should publish group state changed event', async () => {
      const payload: GroupStateChangedDto = { id: 1, state: GroupState.Ready };

      pubSub.publish.mockResolvedValue(undefined);

      const result = await service.groupStateChanged(payload);

      expect(pubSub.publish).toHaveBeenCalledWith(PubKeys.groupStateChanged, {
        [PubKeys.groupStateChanged]: payload,
      });
      expect(result).toBeUndefined();
    });

    it('should throw RuntimeException when payload is null', async () => {
      await expect(service.groupStateChanged(null as unknown as GroupStateChangedDto))
        .rejects.toThrow(RuntimeException);
      expect(pubSub.publish).not.toHaveBeenCalled();
    });

    it('should throw RuntimeException when payload is undefined', async () => {
      await expect(service.groupStateChanged(undefined as unknown as GroupStateChangedDto))
        .rejects.toThrow(RuntimeException);
      expect(pubSub.publish).not.toHaveBeenCalled();
    });
  });

  describe('groupStatusChanged', () => {
    it('should publish group status changed event', async () => {
      const payload: GroupStatusChangedDto = { id: 1, status: DownloadStatus.Completed };

      pubSub.publish.mockResolvedValue(undefined);

      const result = await service.groupStatusChanged(payload);

      expect(pubSub.publish).toHaveBeenCalledWith(PubKeys.groupStatusChanged, {
        [PubKeys.groupStatusChanged]: payload,
      });
      expect(result).toBeUndefined();
    });

    it('should throw RuntimeException when payload is null', async () => {
      await expect(service.groupStatusChanged(null as unknown as GroupStatusChangedDto))
        .rejects.toThrow(RuntimeException);
      expect(pubSub.publish).not.toHaveBeenCalled();
    });
  });

  describe('groupAdded', () => {
    it('should publish group added event', async () => {
      const payload: GroupDto = {
        id: 1,
        name: 'Test Group',
        addedAt: new Date(),
        saveAt: '/test/path',
        status: DownloadStatus.Pending,
        state: GroupState.Initializing
      };
      pubSub.publish.mockResolvedValue(undefined);

      const result = await service.groupAdded(payload);

      expect(pubSub.publish).toHaveBeenCalledWith(PubKeys.groupAdded, {
        [PubKeys.groupAdded]: payload,
      });
      expect(result).toBeUndefined();
    });

    it('should throw RuntimeException when payload is null', async () => {
      await expect(service.groupAdded(null as unknown as GroupDto))
        .rejects.toThrow(RuntimeException);
      expect(pubSub.publish).not.toHaveBeenCalled();
    });
  });

  describe('itemStatusChanged', () => {
    it('should publish item status changed event', async () => {
      const payload: ItemStatusChangedDto = { id: 1, status: DownloadStatus.Downloading };
      pubSub.publish.mockResolvedValue(undefined);

      const result = await service.itemStatusChanged(payload);

      expect(pubSub.publish).toHaveBeenCalledWith(PubKeys.itemStatusChanged, {
        [PubKeys.itemStatusChanged]: payload,
      });
      expect(result).toBeUndefined();
    });

    it('should throw RuntimeException when payload is null', async () => {
      await expect(service.itemStatusChanged(null as unknown as ItemStatusChangedDto))
        .rejects.toThrow(RuntimeException);
      expect(pubSub.publish).not.toHaveBeenCalled();
    });
  });

  describe('itemStatsUpdated', () => {
    it('should publish item stats updated event', async () => {
      const payload: ItemStatsDto = {
        itemId: 1,
        downloadedBytes: 1024,
        bytesSinceLastEvent: 512,
        speed: 100,
        fragments: [{ start: 0, end: 1024, status: FragmentStatus.finished }],
        workers: [{ id: 'worker1', speed: 100, downloadedBytes: 1024 }]
      };
      pubSub.publish.mockResolvedValue(undefined);

      const result = await service.itemStatsUpdated(payload);

      expect(pubSub.publish).toHaveBeenCalledWith(PubKeys.itemStatsUpdated, {
        [PubKeys.itemStatsUpdated]: payload,
      });
      expect(result).toBeUndefined();
    });

    it('should throw RuntimeException when payload is null', async () => {
      await expect(service.itemStatsUpdated(null as unknown as ItemStatsDto))
        .rejects.toThrow(RuntimeException);
      expect(pubSub.publish).not.toHaveBeenCalled();
    });
  });

  describe('downloadManagerStats', () => {
    it('should publish download manager stats event', async () => {
      const payload: DownloadManagerStatsDto = {
        startedAt: new Date(),
        lifetimeBytes: '1024000',
        speed: 500
      };
      pubSub.publish.mockResolvedValue(undefined);

      const result = await service.downloadManagerStats(payload);

      expect(pubSub.publish).toHaveBeenCalledWith(PubKeys.downloadManagerStats, {
        [PubKeys.downloadManagerStats]: payload,
      });
      expect(result).toBeUndefined();
    });

    it('should throw RuntimeException when payload is null', async () => {
      await expect(service.downloadManagerStats(null as unknown as DownloadManagerStatsDto))
        .rejects.toThrow(RuntimeException);
      expect(pubSub.publish).not.toHaveBeenCalled();
    });
  });

});
