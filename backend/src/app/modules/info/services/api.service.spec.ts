import { Test, TestingModule } from '@nestjs/testing';
import { ApiService } from './api.service';
import { AppConfigService } from '../../configuration';
import { PutioService } from '../../putio';
import { AppConfigModel } from '../models';

describe('ApiService', () => {
  let service: ApiService;
  let mockAppConfigService: jest.Mocked<AppConfigService>;
  let mockPutioService: jest.Mocked<PutioService>;

  // Test data builders
  const createMockWatcherTargets = () => [
    { path: '/home/downloads/tv', targetId: 123 },
    { path: '/home/downloads/movies', targetId: 456 },
  ];

  const createMockDownloaderTargets = () => [
    { path: '/home/downloads/completed', targetId: 789 },
  ];

  const createMockPathsResponse = (ids: number[]) =>
    ids.map(id => ({ id, path: `/mnt/files/${id}` }));

  const createMockAppConfigService = (): jest.Mocked<AppConfigService> => {
    const mock = {
      // Basic configuration
      port: 3000,
      host: 'http://localhost',
      putioClientId: 12345,
      putioClientSecret: 'very-secret-client-key-12345',
      putioAuth: 'super-secret-auth-token-67890',

      // Watcher configuration
      watcherEnabled: true,
      watcherTargets: createMockWatcherTargets(),

      // Downloader configuration
      downloaderEnabled: true,
      downloaderTargets: createMockDownloaderTargets(),
      downloaderChunkSize: 8388608, // 8MB

      // Put.io configuration
      putioWatcherSocket: true,
      putioWebhooksEnabled: false,
      putioCheckCronSchedule: '*/5 * * * *',
      putioCheckAtStartup: true,

      // Performance configuration
      uiProgressUpdateInterval: 333,
      concurrentGroups: 2,
      concurrentSmallFiles: 8,
      concurrentLargeFiles: 2,
      downloaderPerformanceMonitoringEnabled: true,
      downloaderPerformanceMonitoringTime: 10,
      downloaderPerformanceMonitoringSpeed: 6710886, // ~80% of chunk size
    };

    // Make properties writable for testing
    Object.defineProperty(mock, 'watcherTargets', {
      writable: true,
      value: createMockWatcherTargets(),
    });
    Object.defineProperty(mock, 'downloaderTargets', {
      writable: true,
      value: createMockDownloaderTargets(),
    });
    Object.defineProperty(mock, 'putioClientSecret', {
      writable: true,
      value: 'very-secret-client-key-12345',
    });
    Object.defineProperty(mock, 'putioAuth', {
      writable: true,
      value: 'super-secret-auth-token-67890',
    });

    return mock as jest.Mocked<AppConfigService>;
  };

  const createMockPutioService = (): jest.Mocked<PutioService> => ({
    getPathsOfFiles: jest.fn(),
  } as unknown as jest.Mocked<PutioService>);

  beforeEach(async () => {
    mockAppConfigService = createMockAppConfigService();
    mockPutioService = createMockPutioService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiService,
        {
          provide: AppConfigService,
          useValue: mockAppConfigService,
        },
        {
          provide: PutioService,
          useValue: mockPutioService,
        },
      ],
    }).compile();

    service = module.get<ApiService>(ApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAppConfig', () => {
    it('should return complete app configuration with masked sensitive fields', async () => {
      // Arrange
      const watcherTargetIds = [123, 456];
      const downloaderTargetIds = [789];
      const mockWatcherPaths = createMockPathsResponse(watcherTargetIds);
      const mockDownloaderPaths = createMockPathsResponse(downloaderTargetIds);

      mockPutioService.getPathsOfFiles
        .mockResolvedValueOnce(mockWatcherPaths)
        .mockResolvedValueOnce(mockDownloaderPaths);

      // Act
      const result = await service.getAppConfig();

      // Assert
      expect(result).toEqual<AppConfigModel>({
        port: 3000,
        host: 'http://localhost',
        putioClientId: 12345,
        putioClientSecret: '************************2345', // Masked except last 4 chars
        putioAuth: '*************************7890', // Masked except last 4 chars
        watcherEnabled: true,
        watcherTargets: [
          {
            path: '/home/downloads/tv',
            targetPath: '/mnt/files/123',
            targetId: 123,
          },
          {
            path: '/home/downloads/movies',
            targetPath: '/mnt/files/456',
            targetId: 456,
          },
        ],
        downloaderEnabled: true,
        downloaderTargets: [
          {
            path: '/home/downloads/completed',
            targetPath: '/mnt/files/789',
            targetId: 789,
          },
        ],
        downloaderChunkSize: 8388608,
        putioWatcherSocket: true,
        putioWebhooksEnabled: false,
        putioCheckCronSchedule: '*/5 * * * *',
        putioCheckAtStartup: true,
        uiProgressUpdateInterval: 333,
        concurrentGroups: 2,
        concurrentSmallFiles: 8,
        concurrentLargeFiles: 2,
        downloaderPerformanceMonitoringEnabled: true,
        downloaderPerformanceMonitoringTime: 10,
        downloaderPerformanceMonitoringSpeed: 6710886,
      });

      // Verify PutioService was called correctly
      expect(mockPutioService.getPathsOfFiles).toHaveBeenCalledTimes(2);
      expect(mockPutioService.getPathsOfFiles).toHaveBeenNthCalledWith(1, watcherTargetIds);
      expect(mockPutioService.getPathsOfFiles).toHaveBeenNthCalledWith(2, downloaderTargetIds);
    });

    it('should handle empty watcher and downloader targets', async () => {
      // Arrange
      Object.defineProperty(mockAppConfigService, 'watcherTargets', {
        value: [],
        writable: true,
      });
      Object.defineProperty(mockAppConfigService, 'downloaderTargets', {
        value: [],
        writable: true,
      });

      mockPutioService.getPathsOfFiles
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.getAppConfig();

      // Assert
      expect(result.watcherTargets).toEqual([]);
      expect(result.downloaderTargets).toEqual([]);
      expect(mockPutioService.getPathsOfFiles).toHaveBeenCalledWith([]);
    });

    it('should properly mask short sensitive fields', async () => {
      // Arrange
      Object.defineProperty(mockAppConfigService, 'putioClientSecret', {
        value: 'short',
        writable: true,
      });
      Object.defineProperty(mockAppConfigService, 'putioAuth', {
        value: '123',
        writable: true,
      });

      mockPutioService.getPathsOfFiles
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.getAppConfig();

      // Assert
      expect(result.putioClientSecret).toBe('*hort'); // 1 char masked, last 4 shown (but string is only 5 chars)
      expect(result.putioAuth).toBe('123'); // String shorter than 4 chars, shows all
    });

    it('should handle single target configurations', async () => {
      // Arrange
      Object.defineProperty(mockAppConfigService, 'watcherTargets', {
        value: [{ path: '/single/path', targetId: 999 }],
        writable: true,
      });
      Object.defineProperty(mockAppConfigService, 'downloaderTargets', {
        value: [{ path: '/single/download', targetId: 888 }],
        writable: true,
      });

      mockPutioService.getPathsOfFiles
        .mockResolvedValueOnce([{ id: 999, path: '/mnt/single/999' }])
        .mockResolvedValueOnce([{ id: 888, path: '/mnt/single/888' }]);

      // Act
      const result = await service.getAppConfig();

      // Assert
      expect(result.watcherTargets).toHaveLength(1);
      expect(result.watcherTargets[0]).toEqual({
        path: '/single/path',
        targetPath: '/mnt/single/999',
        targetId: 999,
      });
      expect(result.downloaderTargets).toHaveLength(1);
      expect(result.downloaderTargets[0]).toEqual({
        path: '/single/download',
        targetPath: '/mnt/single/888',
        targetId: 888,
      });
    });

    it('should handle PutioService errors gracefully', async () => {
      // Arrange
      const error = new Error('Put.io API error');
      mockPutioService.getPathsOfFiles.mockRejectedValue(error);

      // Act & Assert
      await expect(service.getAppConfig()).rejects.toThrow('Put.io API error');
      // Note: Promise.all will call both getPathsOfFiles but the first one fails
      expect(mockPutioService.getPathsOfFiles).toHaveBeenCalledTimes(2);
    });

    it('should handle partial PutioService failures', async () => {
      // Arrange
      const watcherError = new Error('Watcher paths error');
      mockPutioService.getPathsOfFiles
        .mockRejectedValueOnce(watcherError)
        .mockResolvedValueOnce(createMockPathsResponse([789]));

      // Act & Assert
      await expect(service.getAppConfig()).rejects.toThrow('Watcher paths error');
    });

    it('should maintain target order consistency', async () => {
      // Arrange
      const multipleTargets = [
        { path: '/path1', targetId: 1 },
        { path: '/path2', targetId: 2 },
        { path: '/path3', targetId: 3 },
      ];
      Object.defineProperty(mockAppConfigService, 'watcherTargets', {
        value: multipleTargets,
        writable: true,
      });
      Object.defineProperty(mockAppConfigService, 'downloaderTargets', {
        value: [],
        writable: true,
      });

      const responsePaths = [
        { id: 1, path: '/mnt/path1' },
        { id: 2, path: '/mnt/path2' },
        { id: 3, path: '/mnt/path3' },
      ];
      mockPutioService.getPathsOfFiles
        .mockResolvedValueOnce(responsePaths)
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.getAppConfig();

      // Assert
      expect(result.watcherTargets).toHaveLength(3);
      expect(result.watcherTargets[0].path).toBe('/path1');
      expect(result.watcherTargets[0].targetPath).toBe('/mnt/path1');
      expect(result.watcherTargets[1].path).toBe('/path2');
      expect(result.watcherTargets[1].targetPath).toBe('/mnt/path2');
      expect(result.watcherTargets[2].path).toBe('/path3');
      expect(result.watcherTargets[2].targetPath).toBe('/mnt/path3');
    });

    it('should handle concurrent Promise.all execution correctly', async () => {
      // Arrange
      const callOrder: string[] = [];
      mockPutioService.getPathsOfFiles.mockImplementation(async (ids: number[]) => {
        const isWatcher = ids.includes(123);
        callOrder.push(isWatcher ? 'watcher' : 'downloader');
        // Simulate different response times
        await new Promise(resolve => setTimeout(resolve, isWatcher ? 50 : 10));
        return createMockPathsResponse(ids);
      });

      // Act
      const result = await service.getAppConfig();

      // Assert
      expect(result).toBeDefined();
      expect(mockPutioService.getPathsOfFiles).toHaveBeenCalledTimes(2);
      // Verify both calls were made (order may vary due to concurrent execution)
      expect(callOrder).toHaveLength(2);
      expect(callOrder).toContain('watcher');
      expect(callOrder).toContain('downloader');
    });

    it('should return all configuration fields with correct types', async () => {
      // Arrange
      mockPutioService.getPathsOfFiles
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.getAppConfig();

      // Assert - Verify all required fields are present with correct types
      expect(typeof result.port).toBe('number');
      expect(typeof result.host).toBe('string');
      expect(typeof result.putioClientId).toBe('number');
      expect(typeof result.putioClientSecret).toBe('string');
      expect(typeof result.putioAuth).toBe('string');
      expect(typeof result.watcherEnabled).toBe('boolean');
      expect(Array.isArray(result.watcherTargets)).toBe(true);
      expect(typeof result.downloaderEnabled).toBe('boolean');
      expect(Array.isArray(result.downloaderTargets)).toBe(true);
      expect(typeof result.downloaderChunkSize).toBe('number');
      expect(typeof result.putioWatcherSocket).toBe('boolean');
      expect(typeof result.putioWebhooksEnabled).toBe('boolean');
      expect(typeof result.putioCheckCronSchedule).toBe('string');
      expect(typeof result.putioCheckAtStartup).toBe('boolean');
      expect(typeof result.uiProgressUpdateInterval).toBe('number');
      expect(typeof result.concurrentGroups).toBe('number');
      expect(typeof result.concurrentSmallFiles).toBe('number');
      expect(typeof result.concurrentLargeFiles).toBe('number');
      expect(typeof result.downloaderPerformanceMonitoringEnabled).toBe('boolean');
      expect(typeof result.downloaderPerformanceMonitoringTime).toBe('number');
      expect(typeof result.downloaderPerformanceMonitoringSpeed).toBe('number');
    });

    describe('sensitive field masking', () => {
      it('should mask putioClientSecret correctly for various lengths', async () => {
        const testCases = [
          { input: '1234', expected: '1234' }, // Length 4 - show all
          { input: '12345', expected: '*2345' }, // Length 5 - mask 1 char
          { input: '123456789', expected: '*****6789' }, // Length 9 - mask 5 chars
          { input: 'very-long-secret-key-123', expected: '********************-123' }, // Long string (24 chars, mask 20, show last 4)
        ];

        for (const testCase of testCases) {
          Object.defineProperty(mockAppConfigService, 'putioClientSecret', {
            value: testCase.input,
            writable: true,
          });
          mockPutioService.getPathsOfFiles
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

          const result = await service.getAppConfig();
          expect(result.putioClientSecret).toBe(testCase.expected);

          jest.clearAllMocks();
        }
      });

      it('should mask putioAuth correctly for various lengths', async () => {
        const testCases = [
          { input: 'abc', expected: 'abc' }, // Length 3 - show all
          { input: 'abcd', expected: 'abcd' }, // Length 4 - show all
          { input: 'abcde', expected: '*bcde' }, // Length 5 - mask 1 char
          { input: 'super-secret-auth-token', expected: '*******************oken' }, // Long string (23 chars, mask 19, show last 4)
        ];

        for (const testCase of testCases) {
          Object.defineProperty(mockAppConfigService, 'putioAuth', {
            value: testCase.input,
            writable: true,
          });
          mockPutioService.getPathsOfFiles
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);

          const result = await service.getAppConfig();
          expect(result.putioAuth).toBe(testCase.expected);

          jest.clearAllMocks();
        }
      });
    });
  });
});