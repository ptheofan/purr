import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppConfigService, EnvKeys } from './app-config.service';
import * as process from 'process';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
    set: jest.fn(),
    setEnvFilePaths: jest.fn(),
    changes$: {} as any,
  };

  beforeEach(async () => {
    // Set up minimal required environment variables
    process.env.PUTIO_CLIENT_ID = '1234';
    process.env.PUTIO_CLIENT_SECRET = 'test-secret';
    process.env.PUTIO_AUTH = 'test-auth';

    // Mock the ConfigService to return required values
    mockConfigService.get.mockImplementation((key: string) => {
      switch (key) {
        case EnvKeys.PUTIO_CLIENT_ID:
          return '1234';
        case EnvKeys.PUTIO_CLIENT_SECRET:
          return 'test-secret';
        case EnvKeys.PUTIO_AUTH:
          return 'test-auth';
        case 'NODE_ENV':
          return 'test';
        default:
          return undefined;
      }
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up environment variables
    delete process.env.PUTIO_CLIENT_ID;
    delete process.env.PUTIO_CLIENT_SECRET;
    delete process.env.PUTIO_AUTH;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Environment checks', () => {
    it('should return true for isDev when NODE_ENV is development', () => {
      jest.spyOn(configService, 'get').mockReturnValue('development');
      expect(service.isDev).toBe(true);
      expect(service.isProd).toBe(false);
      expect(service.isTest).toBe(false);
    });

    it('should return true for isProd when NODE_ENV is production', () => {
      jest.spyOn(configService, 'get').mockReturnValue('production');
      expect(service.isDev).toBe(false);
      expect(service.isProd).toBe(true);
      expect(service.isTest).toBe(false);
    });

    it('should return true for isTest when NODE_ENV is test', () => {
      jest.spyOn(configService, 'get').mockReturnValue('test');
      expect(service.isDev).toBe(false);
      expect(service.isProd).toBe(false);
      expect(service.isTest).toBe(true);
    });
  });

  describe('Configuration getters', () => {
    it('should return default port when not set', () => {
      expect(service.port).toBe(3000);
    });

    it('should return default host when not set', () => {
      expect(service.host).toBe('http://localhost');
    });

    it('should return putio client id', () => {
      expect(service.putioClientId).toBe(1234);
    });

    it('should return putio client secret', () => {
      expect(service.putioClientSecret).toBe('test-secret');
    });

    it('should return putio auth', () => {
      expect(service.putioAuth).toBe('test-auth');
    });

    it('should return default watcher enabled', () => {
      expect(service.watcherEnabled).toBe(true);
    });

    it('should return default downloader enabled', () => {
      expect(service.downloaderEnabled).toBe(true);
    });

    it('should return default downloader chunk size', () => {
      expect(service.downloaderChunkSize).toBe(1024 * 1024 * 8);
    });

    it('should return default putio watcher socket', () => {
      expect(service.putioWatcherSocket).toBe(true);
    });

    it('should return default putio webhooks enabled', () => {
      expect(service.putioWebhooksEnabled).toBe(false);
    });

    it('should return default putio check at startup', () => {
      expect(service.putioCheckAtStartup).toBe(true);
    });

    it('should return default ui progress update interval', () => {
      expect(service.uiProgressUpdateInterval).toBe(333);
    });

    it('should return default concurrent groups', () => {
      expect(service.concurrentGroups).toBe(2);
    });

    it('should return default concurrent small files', () => {
      expect(service.concurrentSmallFiles).toBe(8);
    });

    it('should return default concurrent large files', () => {
      expect(service.concurrentLargeFiles).toBe(2);
    });

    it('should return default downloader performance monitoring enabled', () => {
      expect(service.downloaderPerformanceMonitoringEnabled).toBe(true);
    });

    it('should return default downloader performance monitoring time', () => {
      expect(service.downloaderPerformanceMonitoringTime).toBe(10);
    });

    it('should return default downloader arbitrary downloads enabled', () => {
      expect(service.downloaderArbitraryDownloadsEnabled).toBe(false);
    });

    it('should return default downloader arbitrary downloads root folder', () => {
      expect(service.downloaderArbitraryDownloadsRootFolder).toBe('/mnt');
    });

    it('should return default console log levels', () => {
      expect(service.consoleLogLevels).toEqual(['log', 'warn', 'error']);
    });
  });

  describe('Performance monitoring speed calculation', () => {
    it('should auto-calculate speed when set to 0', () => {
      const expectedSpeed = Math.floor(service.downloaderChunkSize * 0.8);
      expect(service.downloaderPerformanceMonitoringSpeed).toBe(expectedSpeed);
    });
  });

  describe('Target loading', () => {
    it('should return empty array when no targets are set', () => {
      expect(service.watcherTargets).toEqual([]);
      expect(service.downloaderTargets).toEqual([]);
    });
  });

  describe('Configuration validation', () => {
    // Note: Validation tests are complex due to process.exit() behavior
    // These would require more sophisticated mocking or integration tests
    it('should validate configuration on initialization', () => {
      // This test verifies that the service initializes successfully with valid config
      expect(service).toBeDefined();
      expect(service.putioClientId).toBe(1234);
      expect(service.putioClientSecret).toBe('test-secret');
      expect(service.putioAuth).toBe('test-auth');
    });

    it('should throw error for invalid configuration in test environment', () => {
      const invalidMockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'NODE_ENV':
              return 'test';
            // Missing required PUTIO_CLIENT_ID
            case EnvKeys.PUTIO_CLIENT_SECRET:
              return 'test-secret';
            case EnvKeys.PUTIO_AUTH:
              return 'test-auth';
            default:
              return undefined;
          }
        }),
      } as any;

      expect(() => new AppConfigService(invalidMockConfigService)).toThrow('Configuration validation failed');
    });
  });

  describe('Environment variable loading', () => {
    it('should load integer values correctly', () => {
      // Test with a properly mocked service
      const testMockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'NODE_ENV':
              return 'test';
            case EnvKeys.PORT:
              return '8080';
            case EnvKeys.PUTIO_CLIENT_ID:
              return '5678';
            case EnvKeys.PUTIO_CLIENT_SECRET:
              return 'test-secret';
            case EnvKeys.PUTIO_AUTH:
              return 'test-auth';
            default:
              return undefined;
          }
        }),
      } as any;

      const newService = new AppConfigService(testMockConfigService);
      expect(newService.port).toBe(8080);
      expect(newService.putioClientId).toBe(5678);
    });

    it('should load boolean values correctly', () => {
      // Test with a properly mocked service
      const testMockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'NODE_ENV':
              return 'test';
            case EnvKeys.WATCHER_ENABLED:
              return 'false';
            case EnvKeys.DOWNLOADER_ENABLED:
              return 'true';
            case EnvKeys.PUTIO_CLIENT_ID:
              return '1234';
            case EnvKeys.PUTIO_CLIENT_SECRET:
              return 'test-secret';
            case EnvKeys.PUTIO_AUTH:
              return 'test-auth';
            default:
              return undefined;
          }
        }),
      } as any;

      const newService = new AppConfigService(testMockConfigService);
      expect(newService.watcherEnabled).toBe(false);
      expect(newService.downloaderEnabled).toBe(true);
    });

    it('should load string values correctly', () => {
      // Test with a properly mocked service
      const testMockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'NODE_ENV':
              return 'test';
            case EnvKeys.HOST:
              return 'https://example.com';
            case EnvKeys.PUTIO_CLIENT_SECRET:
              return 'new-secret';
            case EnvKeys.PUTIO_CLIENT_ID:
              return '1234';
            case EnvKeys.PUTIO_AUTH:
              return 'test-auth';
            default:
              return undefined;
          }
        }),
      } as any;

      const newService = new AppConfigService(testMockConfigService);
      expect(newService.host).toBe('https://example.com');
      expect(newService.putioClientSecret).toBe('new-secret');
    });

    it('should parse array values correctly', () => {
      const testMockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'NODE_ENV':
              return 'test';
            case EnvKeys.CONSOLE_LOG_LEVELS:
              return 'log,error,debug';
            case EnvKeys.PUTIO_CLIENT_ID:
              return '1234';
            case EnvKeys.PUTIO_CLIENT_SECRET:
              return 'test-secret';
            case EnvKeys.PUTIO_AUTH:
              return 'test-auth';
            default:
              return undefined;
          }
        }),
      } as any;

      const newService = new AppConfigService(testMockConfigService);
      expect(newService.consoleLogLevels).toEqual(['log', 'error', 'debug']);
    });

    it('should parse target values correctly', () => {
      const testMockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'NODE_ENV':
              return 'test';
            case EnvKeys.WATCHER_TARGETS:
              return '/path1:123;/path2:456';
            case EnvKeys.DOWNLOADER_TARGETS:
              return '/download1:789';
            case EnvKeys.PUTIO_CLIENT_ID:
              return '1234';
            case EnvKeys.PUTIO_CLIENT_SECRET:
              return 'test-secret';
            case EnvKeys.PUTIO_AUTH:
              return 'test-auth';
            default:
              return undefined;
          }
        }),
      } as any;

      const newService = new AppConfigService(testMockConfigService);
      expect(newService.watcherTargets).toEqual([
        { path: '/path1', targetId: 123 },
        { path: '/path2', targetId: 456 },
      ]);
      expect(newService.downloaderTargets).toEqual([
        { path: '/download1', targetId: 789 },
      ]);
    });
  });
});