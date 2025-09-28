import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
  let mockEventEmitter: jest.Mocked<EventEmitter2>;
  let mockNetworkManager: jest.Mocked<NetworkManager>;
  let mockFileManager: jest.Mocked<FileManager>;
  let mockWorkerManager: jest.Mocked<WorkerManager>;
  let mockProgressTracker: jest.Mocked<ProgressTracker>;
  let mockDownloadCoordinator: jest.Mocked<DownloadCoordinator<any>>;
  let mockRanges: jest.Mocked<Ranges>;

  const baseOptions: DownloaderOptions<{ id: string }> = {
    sourceObject: { id: 'test-id' },
    url: 'https://example.com/file.zip',
    saveAs: '/tmp/test-file.zip',
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock EventEmitter2
    mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      setMaxListeners: jest.fn(),
      getMaxListeners: jest.fn(),
      listeners: jest.fn(),
      listenerCount: jest.fn(),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      eventNames: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      rawListeners: jest.fn(),
      onAny: jest.fn(),
      offAny: jest.fn(),
      listenersAny: jest.fn(),
    } as any;

    // Create mock instances
    mockNetworkManager = {
      configure: jest.fn(),
      getFileSize: jest.fn(),
      checkConnectivity: jest.fn(),
      downloadRange: jest.fn(),
      calculateRetryDelay: jest.fn(),
    } as any;

    mockFileManager = {
      configure: jest.fn(),
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
      id: 'test-coordinator-id',
      configure: jest.fn(),
      start: jest.fn(),
      pause: jest.fn(),
      cancel: jest.fn(),
      getProgress: jest.fn(),
      dispose: jest.fn(),
      once: jest.fn(),
      onAny: jest.fn(),
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
      providers: [
        DownloadFactory,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    factory = module.get<DownloadFactory>(DownloadFactory);
  });

  describe('create', () => {

    it('should create DownloadCoordinator with provided file size', async () => {
      const options = { ...baseOptions, fileSize: 1024 };
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      const result = await factory.create(options);

      expect(NetworkManager).toHaveBeenCalledWith();
      expect(mockNetworkManager.configure).toHaveBeenCalledWith('https://1.1.1.1', undefined);
      expect(FileManager).toHaveBeenCalledWith();
      expect(mockFileManager.configure).toHaveBeenCalledWith('/tmp/test-file.zip');
      expect(WorkerManager).toHaveBeenCalled();
      expect(ProgressTracker).toHaveBeenCalled();
      expect(Ranges).toHaveBeenCalledWith(1024);
      expect(mockFileManager.initializeFile).toHaveBeenCalledWith(1024);
      expect(DownloadCoordinator).toHaveBeenCalledWith(
        mockWorkerManager,
        mockFileManager,
        mockNetworkManager,
        mockProgressTracker
      );
      expect(mockDownloadCoordinator.configure).toHaveBeenCalledWith(options, mockRanges);
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
      expect(mockDownloadCoordinator.configure).toHaveBeenCalledWith(options, initialRanges);
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

      expect(mockNetworkManager.configure).toHaveBeenCalledWith('https://google.com', undefined);
    });

    it('should pass axios config to NetworkManager', async () => {
      const axiosConfig = { timeout: 5000 };
      const options = { ...baseOptions, axiosConfig };
      mockNetworkManager.getFileSize.mockResolvedValue(1024);
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      await factory.create(options);

      expect(mockNetworkManager.configure).toHaveBeenCalledWith('https://1.1.1.1', axiosConfig);
    });

    it('should setup event forwarding when EventEmitter2 is provided', async () => {
      const options = { ...baseOptions, fileSize: 1024 };
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      const coordinator = await factory.create(options);

      expect(mockDownloadCoordinator.onAny).toHaveBeenCalled();

      // Verify the callback function was set up correctly
      const onAnyCallback = mockDownloadCoordinator.onAny.mock.calls[0][0];
      expect(typeof onAnyCallback).toBe('function');

      // Test the event forwarding behavior
      const testEventName = 'download.progress';
      const testEventData = { progress: 50, bytesDownloaded: 512 };

      // Simulate the coordinator emitting an event
      onAnyCallback(testEventName, testEventData);

      // Verify both scoped and unscoped events were emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        `${testEventName}.${coordinator.id}`,
        testEventData
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        testEventName,
        testEventData
      );
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

  describe('event forwarding', () => {
    it('should forward multiple events with correct scoping', async () => {
      const options = { ...baseOptions, fileSize: 1024 };
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      const coordinator = await factory.create(options);
      const onAnyCallback = mockDownloadCoordinator.onAny.mock.calls[0][0];

      // Test multiple event types
      const events = [
        { name: 'download.started', data: { timestamp: Date.now() } },
        { name: 'download.progress', data: { progress: 25, speed: 1024 } },
        { name: 'download.completed', data: { totalBytes: 1024 } },
      ];

      events.forEach(event => {
        onAnyCallback(event.name, event.data);
      });

      // Verify all events were forwarded correctly
      events.forEach(event => {
        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          `${event.name}.${coordinator.id}`,
          event.data
        );
        expect(mockEventEmitter.emit).toHaveBeenCalledWith(
          event.name,
          event.data
        );
      });

      // Verify total emit calls (2 per event: scoped + unscoped)
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(events.length * 2);
    });

    it('should handle events with multiple arguments', async () => {
      const options = { ...baseOptions, fileSize: 1024 };
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      const coordinator = await factory.create(options);
      const onAnyCallback = mockDownloadCoordinator.onAny.mock.calls[0][0];

      const eventName = 'download.error';
      const errorMsg = 'Network timeout';
      const errorCode = 'TIMEOUT';
      const retry = true;

      onAnyCallback(eventName, errorMsg, errorCode, retry);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        `${eventName}.${coordinator.id}`,
        errorMsg,
        errorCode,
        retry
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        eventName,
        errorMsg,
        errorCode,
        retry
      );
    });

    it('should not setup event forwarding when EventEmitter2 is null', async () => {
      // Create a new factory instance without EventEmitter2
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DownloadFactory,
          {
            provide: EventEmitter2,
            useValue: null,
          },
        ],
      }).compile();

      const factoryWithoutEmitter = module.get<DownloadFactory>(DownloadFactory);

      const options = { ...baseOptions, fileSize: 1024 };
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      await factoryWithoutEmitter.create(options);

      // onAny should not be called when EventEmitter2 is not available
      expect(mockDownloadCoordinator.onAny).not.toHaveBeenCalled();
    });
  });

  describe('factory management', () => {
    it('should track active downloaders', async () => {
      const options = {
        sourceObject: { id: 'test' },
        url: 'https://example.com/file.zip',
        saveAs: '/tmp/test.zip',
        fileSize: 1024,
      };
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      await factory.create(options);

      const stats = factory.getStats();
      expect(stats.activeDownloaders).toBe(1);
      expect(stats.downloaderIds).toContain('test-coordinator-id');
    });

    it('should dispose all active downloaders', async () => {
      const options = {
        sourceObject: { id: 'test' },
        url: 'https://example.com/file.zip',
        saveAs: '/tmp/test.zip',
        fileSize: 1024,
      };
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      await factory.create(options);
      await factory.disposeAll();

      expect(mockDownloadCoordinator.dispose).toHaveBeenCalled();
    });

    it('should remove downloader from tracking on completion', async () => {
      const options = {
        sourceObject: { id: 'test' },
        url: 'https://example.com/file.zip',
        saveAs: '/tmp/test.zip',
        fileSize: 1024,
      };
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      await factory.create(options);

      // Verify downloader is tracked
      let stats = factory.getStats();
      expect(stats.activeDownloaders).toBe(1);
      expect(stats.downloaderIds).toContain('test-coordinator-id');

      // Simulate completion event
      const onceCallsForCompletion = mockDownloadCoordinator.once.mock.calls.find(
        call => call[0] === 'download.completed'
      );
      expect(onceCallsForCompletion).toBeDefined();
      const completionCallback = onceCallsForCompletion![1];

      // Trigger completion
      completionCallback();

      // Verify downloader is removed from tracking
      stats = factory.getStats();
      expect(stats.activeDownloaders).toBe(0);
      expect(stats.downloaderIds).not.toContain('test-coordinator-id');
    });

    it('should remove downloader from tracking on error', async () => {
      const options = {
        sourceObject: { id: 'test' },
        url: 'https://example.com/file.zip',
        saveAs: '/tmp/test.zip',
        fileSize: 1024,
      };
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      await factory.create(options);

      // Verify downloader is tracked
      let stats = factory.getStats();
      expect(stats.activeDownloaders).toBe(1);

      // Simulate error event
      const onceCallsForError = mockDownloadCoordinator.once.mock.calls.find(
        call => call[0] === 'download.error'
      );
      expect(onceCallsForError).toBeDefined();
      const errorCallback = onceCallsForError![1];

      // Trigger error
      errorCallback();

      // Verify downloader is removed from tracking
      stats = factory.getStats();
      expect(stats.activeDownloaders).toBe(0);
    });
  });

  describe('EventEmitter2 dependency injection', () => {
    it('should properly inject EventEmitter2 and use it for event forwarding', async () => {
      // This test verifies the DI setup is working correctly
      expect(factory).toBeDefined();
      expect(mockEventEmitter).toBeDefined();

      const options = { ...baseOptions, fileSize: 1024 };
      mockFileManager.initializeFile.mockResolvedValue(undefined);

      const coordinator = await factory.create(options);

      // Verify EventEmitter2 was injected and used
      expect(mockDownloadCoordinator.onAny).toHaveBeenCalled();

      // Test that the injected EventEmitter2 instance is used
      const onAnyCallback = mockDownloadCoordinator.onAny.mock.calls[0][0];
      onAnyCallback('test.event', { data: 'test' });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        `test.event.${coordinator.id}`,
        { data: 'test' }
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'test.event',
        { data: 'test' }
      );
    });

    it('should have all required EventEmitter2 methods in mock', () => {
      // Verify our mock has all the methods the factory might use
      expect(mockEventEmitter.emit).toBeDefined();
      expect(mockEventEmitter.on).toBeDefined();
      expect(mockEventEmitter.once).toBeDefined();
      expect(mockEventEmitter.off).toBeDefined();
      expect(mockEventEmitter.removeAllListeners).toBeDefined();

      // These are all jest.fn() so they should be callable
      expect(typeof mockEventEmitter.emit).toBe('function');
      expect(typeof mockEventEmitter.on).toBe('function');
    });
  });
});