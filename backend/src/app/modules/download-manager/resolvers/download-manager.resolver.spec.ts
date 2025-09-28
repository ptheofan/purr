import { Test, TestingModule } from '@nestjs/testing';
import { DownloadManagerResolver } from './download-manager.resolver';
import { AppConfigService } from '../../configuration';
import { PutioService } from '../../putio';
import { DownloadManagerService } from '../services';
import { DownloadGroupsRepository } from '../repositories';
import { PublisherService } from '../services/publisher.service';
import { GroupMapper } from '../mappers';
import { PUB_SUB } from '../../subscriptions';
import { PubSub } from 'graphql-subscriptions';
import { GroupState, DownloadStatus } from '../enums';
import { Group } from '../entities';
import { GroupDto } from '../dtos';
import { Volume } from 'memfs/lib/volume';

describe('DownloadManagerResolver', () => {
  let resolver: DownloadManagerResolver;
  let appConfigService: jest.Mocked<AppConfigService>;
  let putioService: jest.Mocked<PutioService>;
  let downloadManagerService: jest.Mocked<DownloadManagerService>;
  let groupRepo: jest.Mocked<DownloadGroupsRepository>;
  let pubService: jest.Mocked<PublisherService>;
  let groupMapper: jest.Mocked<GroupMapper>;
  let pubSub: jest.Mocked<PubSub>;

  const mockGroup: Group = {
    id: 123,
    addedAt: new Date(),
    name: 'Test Group',
    saveAt: '/downloads/test',
    status: DownloadStatus.Pending,
    state: GroupState.Initializing,
  };

  const mockGroupDto: GroupDto = {
    id: 123,
    addedAt: new Date(),
    name: 'Test Group',
    saveAt: '/downloads/test',
    status: DownloadStatus.Pending,
    state: GroupState.Initializing,
  };

  const mockVolume = {
    // Mock volume object - simplified for testing
    toJSON: jest.fn().mockReturnValue({}),
  } as unknown as Volume;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadManagerResolver,
        {
          provide: AppConfigService,
          useValue: {
            get downloaderArbitraryDownloadsEnabled() { return true; },
            set downloaderArbitraryDownloadsEnabled(value: boolean) { /* mock setter */ },
            downloaderArbitraryDownloadsRootFolder: '/downloads',
          },
        },
        {
          provide: PutioService,
          useValue: {
            getVolume: jest.fn(),
          },
        },
        {
          provide: DownloadManagerService,
          useValue: {
            addVolume: jest.fn(),
            start: jest.fn(),
          },
        },
        {
          provide: DownloadGroupsRepository,
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: PublisherService,
          useValue: {
            groupStateChanged: jest.fn(),
            groupAdded: jest.fn(),
          },
        },
        {
          provide: GroupMapper,
          useValue: {
            entityToDto: jest.fn(),
          },
        },
        {
          provide: PUB_SUB,
          useValue: {
            asyncIterator: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<DownloadManagerResolver>(DownloadManagerResolver);
    appConfigService = module.get(AppConfigService);
    putioService = module.get(PutioService);
    downloadManagerService = module.get(DownloadManagerService);
    groupRepo = module.get(DownloadGroupsRepository);
    pubService = module.get(PublisherService);
    groupMapper = module.get(GroupMapper);
    pubSub = module.get(PUB_SUB);
  });

  describe('createDownloadFromPutio', () => {
    it('should return error when arbitrary downloads are disabled', async () => {
      // Mock the getter to return false
      Object.defineProperty(appConfigService, 'downloaderArbitraryDownloadsEnabled', {
        get: () => false,
        configurable: true,
      });

      const result = await resolver.createDownloadFromPutio(123, '/downloads/test');

      expect(result).toEqual({
        success: false,
        message: 'Arbitrary downloads are disabled by configuration.',
      });
    });

    it('should return error when save path is invalid', async () => {
      const result = await resolver.createDownloadFromPutio(123, '../../../etc/passwd');

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      });
    });

    it('should throw error when putio service fails', async () => {
      putioService.getVolume.mockRejectedValue(new Error('Putio service error'));

      await expect(resolver.createDownloadFromPutio(123, '/downloads/test')).rejects.toThrow('Putio service error');
    });

    it('should return error when download manager service fails', async () => {
      putioService.getVolume.mockResolvedValue(mockVolume);
      downloadManagerService.addVolume.mockResolvedValue({
        success: false,
        message: 'Download manager error',
        analysisCompletedPromise: Promise.resolve(),
      });

      const result = await resolver.createDownloadFromPutio(123, '/downloads/test');

      expect(result).toEqual({
        success: false,
        message: 'Download manager error',
      });
    });

    it('should successfully create download when all conditions are met', async () => {
      const mockAnalysisPromise = Promise.resolve();

      putioService.getVolume.mockResolvedValue(mockVolume);
      downloadManagerService.addVolume.mockResolvedValue({
        success: true,
        groups: 1,
        items: 5,
        analysisCompletedPromise: mockAnalysisPromise,
      });
      groupRepo.find.mockResolvedValue(mockGroup);
      groupMapper.entityToDto.mockReturnValue(mockGroupDto);
      pubService.groupAdded.mockResolvedValue(undefined);

      const result = await resolver.createDownloadFromPutio(123, '/downloads/test');

      expect(result).toEqual({
        success: true,
        group: mockGroup,
      });

      expect(putioService.getVolume).toHaveBeenCalledWith(123);
      expect(downloadManagerService.addVolume).toHaveBeenCalledWith(mockVolume, '/downloads/test');
      expect(groupRepo.find).toHaveBeenCalledWith(expect.any(Function));
      expect(groupMapper.entityToDto).toHaveBeenCalledWith(mockGroup);
      expect(pubService.groupAdded).toHaveBeenCalledWith(mockGroupDto);
    });

    it('should set up state change monitoring when items are present', async () => {
      const mockAnalysisPromise = Promise.resolve();
      const updatedGroup = { ...mockGroup, state: GroupState.Ready };

      putioService.getVolume.mockResolvedValue(mockVolume);
      downloadManagerService.addVolume.mockResolvedValue({
        success: true,
        groups: 1,
        items: 5,
        analysisCompletedPromise: mockAnalysisPromise,
      });
      groupRepo.find
        .mockResolvedValueOnce(mockGroup) // First call for initial group
        .mockResolvedValueOnce(updatedGroup); // Second call in the promise
      groupMapper.entityToDto.mockReturnValue(mockGroupDto);
      pubService.groupAdded.mockResolvedValue(undefined);
      pubService.groupStateChanged.mockResolvedValue(undefined);
      downloadManagerService.start.mockResolvedValue(undefined);

      await resolver.createDownloadFromPutio(123, '/downloads/test');

      // Wait for the analysis promise to complete
      await mockAnalysisPromise;

      expect(pubService.groupStateChanged).toHaveBeenCalledWith({
        id: updatedGroup.id,
        state: updatedGroup.state,
      });
      expect(downloadManagerService.start).toHaveBeenCalled();
    });

    it('should not set up state change monitoring when no items are present', async () => {
      const mockAnalysisPromise = Promise.resolve();

      putioService.getVolume.mockResolvedValue(mockVolume);
      downloadManagerService.addVolume.mockResolvedValue({
        success: true,
        groups: 1,
        items: 0,
        analysisCompletedPromise: mockAnalysisPromise,
      });
      groupRepo.find.mockResolvedValue(mockGroup);
      groupMapper.entityToDto.mockReturnValue(mockGroupDto);
      pubService.groupAdded.mockResolvedValue(undefined);

      await resolver.createDownloadFromPutio(123, '/downloads/test');

      // Wait for the analysis promise to complete
      await mockAnalysisPromise;

      expect(pubService.groupStateChanged).not.toHaveBeenCalled();
      expect(downloadManagerService.start).not.toHaveBeenCalled();
    });
  });

  describe('downloadManagerStats', () => {
    it('should return async iterator for download manager stats subscription', () => {
      const mockAsyncIterator = {
        next: jest.fn(),
        return: jest.fn(),
        throw: jest.fn(),
        [Symbol.asyncIterator]: jest.fn(),
      };
      pubSub.asyncIterator.mockReturnValue(mockAsyncIterator);

      const result = resolver.downloadManagerStats();

      expect(pubSub.asyncIterator).toHaveBeenCalledWith('downloadManagerStats');
      expect(result).toBe(mockAsyncIterator);
    });
  });
});
