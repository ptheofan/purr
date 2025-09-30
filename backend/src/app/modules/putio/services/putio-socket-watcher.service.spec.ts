import { Test, TestingModule } from '@nestjs/testing';
import { PutioSocketWatcherService } from './putio-socket-watcher.service';
import { PutioService } from './putio.service';
import { DownloadManagerService } from '../../download-manager';
import { AppConfigService } from '../../configuration';
import { IFile } from '@putdotio/api-client';

describe('PutioSocketWatcherService', () => {
  let service: PutioSocketWatcherService;
  let putioService: jest.Mocked<PutioService>;
  let downloadManagerService: jest.Mocked<DownloadManagerService>;
  let configService: jest.Mocked<AppConfigService>;

  const mockFile: IFile = {
    id: 123,
    name: 'test-file.mkv',
    size: 1000000,
    file_type: 'VIDEO',
    parent_id: 0,
    created_at: '2025-01-01T00:00:00Z',
  } as unknown as IFile;

  const mockVolume = { writeFileSync: jest.fn() } as any;

  const mockTarget = {
    targetId: 456,
    path: '/downloads',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PutioSocketWatcherService,
        {
          provide: PutioService,
          useValue: {
            getFile: jest.fn(),
            getVolume: jest.fn(),
            getAuthToken: jest.fn().mockResolvedValue('mock-token'),
          },
        },
        {
          provide: DownloadManagerService,
          useValue: {
            groupExists: jest.fn(),
            addVolume: jest.fn(),
            start: jest.fn(),
          },
        },
        {
          provide: AppConfigService,
          useValue: {
            putioWatcherSocket: false,
            downloaderTargets: [mockTarget],
          },
        },
      ],
    }).compile();

    service = module.get<PutioSocketWatcherService>(PutioSocketWatcherService);
    putioService = module.get(PutioService) as jest.Mocked<PutioService>;
    downloadManagerService = module.get(DownloadManagerService) as jest.Mocked<DownloadManagerService>;
    configService = module.get(AppConfigService) as jest.Mocked<AppConfigService>;
  });

  describe('getTargetById', () => {
    it('should return target when found', () => {
      const result = service.getTargetById(456);
      expect(result).toEqual(mockTarget);
    });

    it('should return null when target not found', () => {
      const result = service.getTargetById(999);
      expect(result).toBeUndefined();
    });
  });

  describe('putioFileTransferCompleted', () => {
    it('should return early if target not found', async () => {
      await service.putioFileTransferCompleted(999, 123);

      expect(putioService.getFile).not.toHaveBeenCalled();
    });

    it('should process file successfully on first attempt', async () => {
      putioService.getFile.mockResolvedValue(mockFile);
      putioService.getVolume.mockResolvedValue(mockVolume);
      downloadManagerService.groupExists
        .mockResolvedValueOnce(false) // First check: group doesn't exist yet
        .mockResolvedValueOnce(true);  // Second check: group was successfully added

      await service.putioFileTransferCompleted(456, 123);

      expect(putioService.getFile).toHaveBeenCalledWith(123);
      expect(putioService.getFile).toHaveBeenCalledTimes(1);
      expect(putioService.getVolume).toHaveBeenCalledWith(123);
      expect(downloadManagerService.addVolume).toHaveBeenCalledWith(mockVolume, '/downloads');
      expect(downloadManagerService.start).toHaveBeenCalled();
    });

    it('should retry when file not immediately available', async () => {
      jest.useFakeTimers();

      // First attempt returns null, second attempt returns the file
      putioService.getFile
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockFile);
      putioService.getVolume.mockResolvedValue(mockVolume);
      downloadManagerService.groupExists
        .mockResolvedValueOnce(false) // First check: group doesn't exist yet
        .mockResolvedValueOnce(true);  // Second check: group was successfully added

      const promise = service.putioFileTransferCompleted(456, 123);

      // Fast-forward through the first delay (1000ms)
      await jest.advanceTimersByTimeAsync(1000);

      await promise;

      expect(putioService.getFile).toHaveBeenCalledTimes(2);
      expect(putioService.getVolume).toHaveBeenCalledWith(123);
      expect(downloadManagerService.addVolume).toHaveBeenCalledWith(mockVolume, '/downloads');
      expect(downloadManagerService.start).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should give up after max attempts', async () => {
      jest.useFakeTimers();

      putioService.getFile.mockResolvedValue(null);

      const promise = service.putioFileTransferCompleted(456, 123);

      // Fast-forward through all delays
      const delays = [1000, 2000, 3000, 5000, 8000, 13000, 21000, 34000, 55000, 89000];
      for (const delay of delays) {
        await jest.advanceTimersByTimeAsync(delay);
      }

      await promise;

      expect(putioService.getFile).toHaveBeenCalledTimes(10);
      expect(putioService.getVolume).not.toHaveBeenCalled();
      expect(downloadManagerService.addVolume).not.toHaveBeenCalled();
      expect(downloadManagerService.start).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should return early if volume cannot be retrieved', async () => {
      putioService.getFile.mockResolvedValue(mockFile);
      putioService.getVolume.mockResolvedValue(null);

      await service.putioFileTransferCompleted(456, 123);

      expect(putioService.getFile).toHaveBeenCalledWith(123);
      expect(putioService.getVolume).toHaveBeenCalledWith(123);
      expect(downloadManagerService.addVolume).not.toHaveBeenCalled();
      expect(downloadManagerService.start).not.toHaveBeenCalled();
    });

    it('should skip if group already exists', async () => {
      putioService.getFile.mockResolvedValue(mockFile);
      putioService.getVolume.mockResolvedValue(mockVolume);
      downloadManagerService.groupExists.mockResolvedValue(true);

      await service.putioFileTransferCompleted(456, 123);

      expect(putioService.getFile).toHaveBeenCalledWith(123);
      expect(putioService.getVolume).toHaveBeenCalledWith(123);
      expect(downloadManagerService.groupExists).toHaveBeenCalledWith(123);
      expect(downloadManagerService.addVolume).not.toHaveBeenCalled();
      expect(downloadManagerService.start).not.toHaveBeenCalled();
    });

    it('should handle failure to add group', async () => {
      putioService.getFile.mockResolvedValue(mockFile);
      putioService.getVolume.mockResolvedValue(mockVolume);
      downloadManagerService.groupExists
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      await service.putioFileTransferCompleted(456, 123);

      expect(putioService.getFile).toHaveBeenCalledWith(123);
      expect(putioService.getVolume).toHaveBeenCalledWith(123);
      expect(downloadManagerService.addVolume).toHaveBeenCalledWith(mockVolume, '/downloads');
      expect(downloadManagerService.groupExists).toHaveBeenCalledTimes(2);
      expect(downloadManagerService.start).not.toHaveBeenCalled();
    });

    it('should succeed on third retry attempt', async () => {
      jest.useFakeTimers();

      // First two attempts return null, third returns the file
      putioService.getFile
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockFile);
      putioService.getVolume.mockResolvedValue(mockVolume);
      downloadManagerService.groupExists
        .mockResolvedValueOnce(false) // First check: group doesn't exist yet
        .mockResolvedValueOnce(true);  // Second check: group was successfully added

      const promise = service.putioFileTransferCompleted(456, 123);

      // Fast-forward through first two delays
      await jest.advanceTimersByTimeAsync(1000);
      await jest.advanceTimersByTimeAsync(2000);

      await promise;

      expect(putioService.getFile).toHaveBeenCalledTimes(3);
      expect(downloadManagerService.start).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});