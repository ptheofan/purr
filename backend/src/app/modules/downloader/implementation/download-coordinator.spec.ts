import { DownloadCoordinator } from './download-coordinator';
import { Ranges } from './ranges';
import { WorkerManager } from './worker-manager';
import { FileManager } from './file-manager';
import { NetworkManager } from './network-manager';
import { ProgressTracker } from './progress-tracker';
import { DownloaderOptions } from './downloader.interface';

jest.mock('../../../helpers/promises.helper', () => ({
  waitFor: jest.fn().mockResolvedValue(undefined),
}));

describe('DownloadCoordinator', () => {
  let downloadCoordinator: DownloadCoordinator<any>;
  let mockRanges: jest.Mocked<Ranges>;
  let mockWorkerManager: jest.Mocked<WorkerManager>;
  let mockFileManager: jest.Mocked<FileManager>;
  let mockNetworkManager: jest.Mocked<NetworkManager>;
  let mockProgressTracker: jest.Mocked<ProgressTracker>;

  const mockOptions: DownloaderOptions<any> = {
    url: 'http://test.com',
    saveAs: 'test.file',
    sourceObject: {},
    chunkSize: 1024,
    workersCount: 2,
    maxRetries: 3,
    initialRetryDelay: 100,
    maxRetryDelay: 1000,
  };

  beforeEach(async () => {
    mockRanges = {
      findSequenceOfAtLeast: jest.fn(),
      markAs: jest.fn(),
      changeAll: jest.fn(),
      count: jest.fn(),
    } as any;

    mockWorkerManager = {
      createWorker: jest.fn(),
      removeWorker: jest.fn(),
      getWorker: jest.fn(),
      restart: jest.fn(),
      activeWorkers: new Map(),
      signal: {},
      updateWorkerStats: jest.fn(),
      getWorkerStats: jest.fn(),
      waitForWorkersToStop: jest.fn(),
    } as any;

    mockFileManager = {
      openFileForWriting: jest.fn(),
    } as any;

    mockNetworkManager = {
      checkConnectivity: jest.fn(),
      downloadRange: jest.fn(),
      calculateRetryDelay: jest.fn(),
    } as any;

    mockProgressTracker = {
      setStartTime: jest.fn(),
      update: jest.fn(),
      shouldUpdateProgress: jest.fn(),
      getProgress: jest.fn(),
      getBytesSinceLastProgress: jest.fn(),
      resetSpeedTracker: jest.fn(),
    } as any;

    downloadCoordinator = new DownloadCoordinator(
      mockOptions,
      mockRanges,
      mockWorkerManager,
      mockFileManager,
      mockNetworkManager,
      mockProgressTracker
    );
  });

  describe('start', () => {
    it('should throw error if already running', async () => {
      (downloadCoordinator as any).isRunning = true;
      await expect(downloadCoordinator.start()).rejects.toThrow('Download already in progress');
    });

    it('should initialize download process', async () => {
      const mockFileHandle = { close: jest.fn() };
      mockFileManager.openFileForWriting.mockResolvedValue(mockFileHandle as any);
      jest.spyOn(downloadCoordinator as any, 'isComplete').mockReturnValue(true);
      mockOptions.completedCallback = jest.fn();

      await downloadCoordinator.start();

      expect(mockProgressTracker.setStartTime).toHaveBeenCalled();
      expect(mockFileManager.openFileForWriting).toHaveBeenCalled();
      expect(mockOptions.completedCallback).toHaveBeenCalledWith(downloadCoordinator);
      expect(mockFileHandle.close).toHaveBeenCalled();
    });

    it('should handle errors and call error callback', async () => {
      const mockError = new Error('Test error');
      const mockFileHandle = { close: jest.fn() };
      mockFileManager.openFileForWriting.mockResolvedValue(mockFileHandle as any);
      jest.spyOn(downloadCoordinator as any, 'handleNetworkStatus').mockRejectedValue(mockError);
      mockOptions.errorCallback = jest.fn();

      await expect(downloadCoordinator.start()).rejects.toThrow(mockError);
      expect(mockOptions.errorCallback).toHaveBeenCalledWith(downloadCoordinator, mockError);
    });
  });

  describe('pause', () => {
    it('should pause the download and return ranges', async () => {
      mockWorkerManager.restart.mockResolvedValue(undefined);
      mockOptions.progressCallback = jest.fn();
      mockWorkerManager.getWorkerStats.mockReturnValue([]);

      const result = await downloadCoordinator.pause();

      expect(mockWorkerManager.restart).toHaveBeenCalled();
      expect(mockProgressTracker.resetSpeedTracker).toHaveBeenCalled();
      expect(mockOptions.progressCallback).toHaveBeenCalled();
      expect(result).toBe(mockRanges);
    });
  });

  describe('cancel', () => {
    it('should cancel the download', async () => {
      mockWorkerManager.restart.mockResolvedValue(undefined);
      mockOptions.progressCallback = jest.fn();
      mockWorkerManager.getWorkerStats.mockReturnValue([]);

      await downloadCoordinator.cancel();

      expect(mockWorkerManager.restart).toHaveBeenCalled();
      expect(mockProgressTracker.resetSpeedTracker).toHaveBeenCalled();
      expect(mockOptions.progressCallback).toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    it('should return sourceObject', () => {
      expect(downloadCoordinator.sourceObject).toBe(mockOptions.sourceObject);
    });

    it('should return saveAs', () => {
      expect(downloadCoordinator.saveAs).toBe(mockOptions.saveAs);
    });

    it('should return url', () => {
      expect(downloadCoordinator.url).toBe(mockOptions.url);
    });

    it('should return progress', () => {
      mockWorkerManager.getWorkerStats.mockReturnValue([]);

      downloadCoordinator.getProgress();
      expect(mockProgressTracker.getProgress).toHaveBeenCalledWith(mockRanges, expect.any(Array));
    });
  });
});
