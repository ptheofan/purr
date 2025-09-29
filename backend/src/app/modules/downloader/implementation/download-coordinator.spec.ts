// import { Test } from '@nestjs/testing';
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
    // Create mocks for dependencies
    mockRanges = {
      findSequenceOfAtLeast: jest.fn(),
      markAs: jest.fn(),
      changeAll: jest.fn(),
      count: jest.fn(),
      ranges: [],
    } as any;

    mockWorkerManager = {
      createWorker: jest.fn(),
      removeWorker: jest.fn(),
      getWorker: jest.fn(),
      restart: jest.fn(),
      activeWorkers: new Map(),
      signal: new AbortController().signal,
      updateWorkerStats: jest.fn(),
      getWorkerStats: jest.fn(),
      waitForWorkersToStop: jest.fn(),
    } as any;

    mockFileManager = {
      configure: jest.fn(),
      openFileForWriting: jest.fn(),
      initializeFile: jest.fn(),
      finalizeDownload: jest.fn().mockResolvedValue(undefined),
      cleanupPartialFile: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockNetworkManager = {
      configure: jest.fn(),
      checkConnectivity: jest.fn(),
      downloadRange: jest.fn(),
      calculateRetryDelay: jest.fn(),
      getFileSize: jest.fn(),
    } as any;

    mockProgressTracker = {
      setStartTime: jest.fn(),
      update: jest.fn(),
      shouldUpdateProgress: jest.fn(),
      getProgress: jest.fn(),
      getBytesSinceLastProgress: jest.fn(),
      resetSpeedTracker: jest.fn(),
    } as any;

    // Create the DownloadCoordinator instance with new constructor signature
    downloadCoordinator = new DownloadCoordinator(
      mockWorkerManager,
      mockFileManager,
      mockNetworkManager,
      mockProgressTracker
    );

    // Configure the coordinator with options and ranges
    downloadCoordinator.configure(mockOptions, mockRanges);
  });

  describe('configuration', () => {
    it('should configure with options and ranges', () => {
      const newCoordinator = new DownloadCoordinator(
        mockWorkerManager,
        mockFileManager,
        mockNetworkManager,
        mockProgressTracker
      );

      expect(() => newCoordinator.configure(mockOptions, mockRanges)).not.toThrow();
      expect(newCoordinator.url).toBe(mockOptions.url);
      expect(newCoordinator.saveAs).toBe(mockOptions.saveAs);
      expect(newCoordinator.sourceObject).toBe(mockOptions.sourceObject);
    });

    it('should throw error when accessing properties before configuration', () => {
      const newCoordinator = new DownloadCoordinator(
        mockWorkerManager,
        mockFileManager,
        mockNetworkManager,
        mockProgressTracker
      );

      expect(() => newCoordinator.url).toThrow('DownloadCoordinator not configured');
      expect(() => newCoordinator.saveAs).toThrow('DownloadCoordinator not configured');
      expect(() => newCoordinator.sourceObject).toThrow('DownloadCoordinator not configured');
    });

    it('should throw error when starting without configuration', async () => {
      const newCoordinator = new DownloadCoordinator(
        mockWorkerManager,
        mockFileManager,
        mockNetworkManager,
        mockProgressTracker
      );

      await expect(newCoordinator.start()).rejects.toThrow('DownloadCoordinator not configured. Call configure() first.');
    });
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

      // Mock ranges to return no available ranges (download complete)
      mockRanges.findSequenceOfAtLeast.mockReturnValue(undefined);

      await downloadCoordinator.start();

      expect(mockProgressTracker.setStartTime).toHaveBeenCalled();
      expect(mockFileManager.openFileForWriting).toHaveBeenCalled();
      expect(mockFileManager.finalizeDownload).toHaveBeenCalled();
      expect(mockOptions.completedCallback).toHaveBeenCalledWith(downloadCoordinator);
      expect(mockFileHandle.close).toHaveBeenCalled();
    });

    it('should handle errors and call error callback', async () => {
      const mockError = new Error('Test error');
      const mockFileHandle = { close: jest.fn() };
      mockFileManager.openFileForWriting.mockResolvedValue(mockFileHandle as any);
      jest.spyOn(downloadCoordinator as any, 'handleNetworkStatus').mockRejectedValue(mockError);
      mockOptions.errorCallback = jest.fn();

      // Spy on the logger to verify error logging and suppress console output
      const loggerSpy = jest.spyOn((downloadCoordinator as any).logger, 'error').mockImplementation(() => {});

      await expect(downloadCoordinator.start()).rejects.toThrow(mockError);
      expect(mockOptions.errorCallback).toHaveBeenCalledWith(downloadCoordinator, mockError);
      expect(mockFileManager.cleanupPartialFile).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('Download failed: Test error', expect.any(String));

      // Restore the logger
      loggerSpy.mockRestore();
    });

    it('should dispose properly when disposed before start', async () => {
      await downloadCoordinator.dispose();

      await expect(downloadCoordinator.start()).rejects.toThrow('Cannot start disposed downloader');
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

    it('should return unique id', () => {
      expect(downloadCoordinator.id).toBeDefined();
      expect(typeof downloadCoordinator.id).toBe('string');
      expect(downloadCoordinator.id.length).toBeGreaterThan(0);
    });
  });

  describe('dispose', () => {
    it('should dispose resources and prevent further operations', async () => {
      mockWorkerManager.restart.mockResolvedValue(undefined);

      await downloadCoordinator.dispose();

      // Should not throw on multiple dispose calls
      await expect(downloadCoordinator.dispose()).resolves.not.toThrow();

      // Should throw when trying to configure after disposal
      expect(() => downloadCoordinator.configure(mockOptions, mockRanges))
        .toThrow('Cannot configure disposed DownloadCoordinator');
    });

    it('should clean up worker manager on dispose', async () => {
      mockWorkerManager.restart.mockResolvedValue(undefined);

      await downloadCoordinator.dispose();

      expect(mockWorkerManager.restart).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('should emit events during download lifecycle', async () => {
      const mockFileHandle = { close: jest.fn() };
      mockFileManager.openFileForWriting.mockResolvedValue(mockFileHandle as any);
      jest.spyOn(downloadCoordinator as any, 'isComplete').mockReturnValue(true);

      const eventSpy = jest.fn();
      downloadCoordinator.on('download.started', eventSpy);

      await downloadCoordinator.start();

      expect(eventSpy).toHaveBeenCalled();
    });
  });
});