import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DownloadFactory } from './downloader.factory';
import { DownloaderOptions } from '../implementation';
import { DownloadCoordinator } from '../implementation';
import { NetworkManager } from '../implementation/network-manager';
import { FileManager } from '../implementation/file-manager';
import { WorkerManager } from '../implementation/worker-manager';
import { ProgressTracker } from '../implementation/progress-tracker';
import { Ranges } from '../implementation';
import { FragmentStatus } from '../dtos';

// Mock the implementation classes
jest.mock('../implementation/network-manager');
jest.mock('../implementation/file-manager');
jest.mock('../implementation/worker-manager');
jest.mock('../implementation/progress-tracker');
jest.mock('../implementation/download-coordinator');
jest.mock('../implementation/ranges');

describe('DownloadFactory', () => {
  let factory: DownloadFactory;
  let mockNetworkManager: jest.Mocked<NetworkManager>;
  let mockFileManager: jest.Mocked<FileManager>;
  let mockWorkerManager: jest.Mocked<WorkerManager>;
  let mockProgressTracker: jest.Mocked<ProgressTracker>;
  let mockDownloadCoordinator: jest.Mocked<DownloadCoordinator<any>>;
  let mockRanges: jest.Mocked<Ranges>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockNetworkManager = {
      getFileSize: jest.fn(),
      checkConnectivity: jest.fn(),
      downloadRange: jest.fn(),
      calculateRetryDelay: jest.fn(),
    } as any;

    mockFileManager = {
      initializeFile: jest.fn(),
      openFileForWriting: jest.fn(),
    } as any;

    mockWorkerManager = {
      createWorker: jest.fn(),
      removeWorker: jest.fn(),
      getWorker: jest.fn(),
      restart: jest.fn(),
      activeWorkers: new Map(),
      signal: new AbortController().signal,
      getWorkerStats: jest.fn(),
      updateWorkerStats: jest.fn(),
    } as any;

    mockProgressTracker = {
      setStartTime: jest.fn(),
      update: jest.fn(),
      shouldUpdateProgress: jest.fn(),
      getProgress: jest.fn(),
      getBytesSinceLastProgress: jest.fn(),
      resetSpeedTracker: jest.fn(),
    } as any;

    mockDownloadCoordinator = {
      start: jest.fn(),
      pause: jest.fn(),
      cancel: jest.fn(),
      getProgress: jest.fn(),
    } as any;

    mockRanges = {
      changeAll: jest.fn(),
      count: jest.fn(),
      markAs: jest.fn(),
      findSequenceOfAtLeast: jest.fn(),
      findFirst: jest.fn(),
      toSaveData: jest.fn(),
      isFinite: jest.fn(),
      setSize: jest.fn(),
      ranges: [],
    } as any;

    // Mock constructors
    (NetworkManager as jest.MockedClass<typeof NetworkManager>).mockImplementation(() => mockNetworkManager);
    (FileManager as jest.MockedClass<typeof FileManager>).mockImplementation(() => mockFileManager);
    (WorkerManager as jest.MockedClass<typeof WorkerManager>).mockImplementation(() => mockWorkerManager);
    (ProgressTracker as jest.MockedClass<typeof ProgressTracker>).mockImplementation(() => mockProgressTracker);
    (DownloadCoordinator as jest.MockedClass<typeof DownloadCoordinator>).mockImplementation(() => mockDownloadCoordinator);
    (Ranges as jest.MockedClass<typeof Ranges>).mockImplementation(() => mockRanges);

    const module: TestingModule = await Test.createTestingModule({
      providers: [DownloadFactory],
    }).compile();

    factory = module.get<DownloadFactory>(DownloadFactory);
  });

  describe('create', () => {
    const baseOptions: DownloaderOptions<{ id: string }> = {
      sourceObject: { id: 'test-id' },
      url: 'https://example.com/file.zip',
      saveAs: '/tmp/test-file.zip',
    };

    it('should create DownloadCoordinator with provided file size', async () => {
      const options = { ...baseOptions, fileSize: 1024 };
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      const result = await factory.create(options);

      expect(NetworkManager).toHaveBeenCalledWith('https://1.1.1.1', undefined);
      expect(FileManager).toHaveBeenCalledWith('/tmp/test-file.zip');
      expect(WorkerManager).toHaveBeenCalled();
      expect(ProgressTracker).toHaveBeenCalled();
      expect(Ranges).toHaveBeenCalledWith(1024);
      expect(mockFileManager.initializeFile).toHaveBeenCalledWith(1024);
      expect(DownloadCoordinator).toHaveBeenCalledWith(
        options,
        mockRanges,
        mockWorkerManager,
        mockFileManager,
        mockNetworkManager,
        mockProgressTracker
      );
      expect(result).toBe(mockDownloadCoordinator);
    });

    it('should create DownloadCoordinator with initial ranges', async () => {
      const initialRanges = new Ranges(2048);
      const options = { ...baseOptions, initialRanges };
      // Mock count to return 2048 for each status (total would be 6144, but we want 2048 per status)
      mockRanges.count.mockReturnValue(2048);
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      const result = await factory.create(options);

      expect(mockRanges.changeAll).toHaveBeenCalledWith(FragmentStatus.reserved, FragmentStatus.pending);
      // The total size is calculated as the sum of all status counts, so 2048 * 3 = 6144
      expect(mockFileManager.initializeFile).toHaveBeenCalledWith(6144);
      expect(DownloadCoordinator).toHaveBeenCalledWith(
        options,
        initialRanges,
        mockWorkerManager,
        mockFileManager,
        mockNetworkManager,
        mockProgressTracker
      );
      expect(result).toBe(mockDownloadCoordinator);
    });

    it('should fetch file size from network when not provided', async () => {
      const options = { ...baseOptions };
      mockNetworkManager.getFileSize.mockResolvedValue(4096);
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      const result = await factory.create(options);

      expect(mockNetworkManager.getFileSize).toHaveBeenCalledWith('https://example.com/file.zip');
      expect(Ranges).toHaveBeenCalledWith(4096);
      expect(mockFileManager.initializeFile).toHaveBeenCalledWith(4096);
      expect(result).toBe(mockDownloadCoordinator);
    });

    it('should use custom network check URL when provided', async () => {
      const options = { ...baseOptions, networkCheckUrl: 'https://google.com' };
      mockNetworkManager.getFileSize.mockResolvedValue(1024);
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      await factory.create(options);

      expect(NetworkManager).toHaveBeenCalledWith('https://google.com', undefined);
    });

    it('should pass axios config to NetworkManager', async () => {
      const axiosConfig = { timeout: 5000 };
      const options = { ...baseOptions, axiosConfig };
      mockNetworkManager.getFileSize.mockResolvedValue(1024);
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      await factory.create(options);

      expect(NetworkManager).toHaveBeenCalledWith('https://1.1.1.1', axiosConfig);
    });
  });

  describe('validation', () => {
    it('should throw BadRequestException when URL is missing', async () => {
      const options = {
        sourceObject: { id: 'test' },
        saveAs: '/tmp/test.zip',
      } as DownloaderOptions<{ id: string }>;

      await expect(factory.create(options)).rejects.toThrow(BadRequestException);
      await expect(factory.create(options)).rejects.toThrow('URL is required for download');
    });

    it('should throw BadRequestException when saveAs is missing', async () => {
      const options = {
        sourceObject: { id: 'test' },
        url: 'https://example.com/file.zip',
      } as DownloaderOptions<{ id: string }>;

      await expect(factory.create(options)).rejects.toThrow(BadRequestException);
      await expect(factory.create(options)).rejects.toThrow('Save path is required for download');
    });

    it('should throw BadRequestException when sourceObject is missing', async () => {
      const options = {
        url: 'https://example.com/file.zip',
        saveAs: '/tmp/test.zip',
      } as DownloaderOptions<{ id: string }>;

      await expect(factory.create(options)).rejects.toThrow(BadRequestException);
      await expect(factory.create(options)).rejects.toThrow('Source object is required for download');
    });
  });

  describe('error handling', () => {
    it('should throw InternalServerErrorException when network file size fetch fails', async () => {
      const options = {
        sourceObject: { id: 'test' },
        url: 'https://example.com/file.zip',
        saveAs: '/tmp/test.zip',
      };
      mockNetworkManager.getFileSize.mockRejectedValue(new Error('Network error'));

      await expect(factory.create(options)).rejects.toThrow(InternalServerErrorException);
      await expect(factory.create(options)).rejects.toThrow('Failed to determine file size: Network error');
    });

    it('should throw BadRequestException when file size is invalid', async () => {
      const options = {
        sourceObject: { id: 'test' },
        url: 'https://example.com/file.zip',
        saveAs: '/tmp/test.zip',
      };
      mockNetworkManager.getFileSize.mockResolvedValue(0);

      await expect(factory.create(options)).rejects.toThrow(BadRequestException);
      await expect(factory.create(options)).rejects.toThrow('Invalid file size received from server');
    });

    it('should throw BadRequestException when file size is negative', async () => {
      const options = {
        sourceObject: { id: 'test' },
        url: 'https://example.com/file.zip',
        saveAs: '/tmp/test.zip',
      };
      mockNetworkManager.getFileSize.mockResolvedValue(-100);

      await expect(factory.create(options)).rejects.toThrow(BadRequestException);
      await expect(factory.create(options)).rejects.toThrow('Invalid file size received from server');
    });

    it('should throw BadRequestException when initial ranges have invalid total size', async () => {
      const initialRanges = new Ranges();
      const options = {
        sourceObject: { id: 'test' },
        url: 'https://example.com/file.zip',
        saveAs: '/tmp/test.zip',
        initialRanges,
      };
      mockRanges.count.mockReturnValue(0);

      await expect(factory.create(options)).rejects.toThrow(BadRequestException);
      await expect(factory.create(options)).rejects.toThrow('Invalid ranges: total size is zero or negative');
    });

    it('should throw InternalServerErrorException for unknown error types in file size determination', async () => {
      const options = {
        sourceObject: { id: 'test' },
        url: 'https://example.com/file.zip',
        saveAs: '/tmp/test.zip',
      };
      mockNetworkManager.getFileSize.mockRejectedValue('Unknown error');

      await expect(factory.create(options)).rejects.toThrow(InternalServerErrorException);
      await expect(factory.create(options)).rejects.toThrow('Failed to determine file size: Unknown error');
    });
  });

  describe('file manager initialization', () => {
    it('should initialize file manager with correct size', async () => {
      const options = {
        sourceObject: { id: 'test' },
        url: 'https://example.com/file.zip',
        saveAs: '/tmp/test.zip',
        fileSize: 8192,
      };
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      await factory.create(options);

      expect(mockFileManager.initializeFile).toHaveBeenCalledWith(8192);
    });

    it('should handle file manager initialization errors', async () => {
      const options = {
        sourceObject: { id: 'test' },
        url: 'https://example.com/file.zip',
        saveAs: '/tmp/test.zip',
        fileSize: 1024,
      };
      mockFileManager.initializeFile.mockRejectedValue(new Error('File system error'));

      await expect(factory.create(options)).rejects.toThrow('File system error');
    });
  });
});
