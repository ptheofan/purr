import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';
import PutioAPIClient, { IFile, IPutioAPIClientResponse, Transfer } from '@putdotio/api-client';
import { memfs } from 'memfs';
import { Volume } from 'memfs/lib/volume';

import { PutioService } from './putio.service';
import { AppConfigService } from '../../configuration';
import { waitFor } from '../../../helpers/promises.helper';
import {
  extractErrorInfo,
  isRateLimitError,
  calculateWaitTimeFromError,
  formatErrorForLogging,
  ExtractedErrorInfo,
} from '../../../helpers/error-extractor.helper';

// Mock external dependencies
jest.mock('@putdotio/api-client');
jest.mock('memfs');
jest.mock('../../../helpers/promises.helper');
jest.mock('../../../helpers/error-extractor.helper');

describe('PutioService', () => {
  let service: PutioService;
  let mockConfig: jest.Mocked<AppConfigService>;
  let mockLogger: jest.Mocked<Logger>;
  let mockApiClient: jest.Mocked<PutioAPIClient>;

  // Mock data
  const mockAuthToken = 'test-auth-token';
  const mockClientId = 12345;
  const mockClientSecret = 'test-client-secret';

  const mockTransfer: Transfer = {
    id: 1,
    name: 'test-transfer',
    status: 'COMPLETED',
    size: 1024,
    progress: 100,
  } as unknown as Transfer;

  const mockFile: IFile = {
    id: 1,
    name: 'test-file.txt',
    size: 1024,
    file_type: 'FILE',
    parent_id: 0,
    created_at: '2023-01-01T00:00:00Z',
  } as unknown as IFile;

  const mockFolder: IFile = {
    id: 2,
    name: 'test-folder',
    size: 0,
    file_type: 'FOLDER',
    parent_id: 0,
    created_at: '2023-01-01T00:00:00Z',
  } as unknown as IFile;

  const mockApiResponse = <T>(data: T): IPutioAPIClientResponse<T> => ({
    data,
    status: 200,
    headers: {},
  } as unknown as IPutioAPIClientResponse<T>);

  const mockErrorInfo: ExtractedErrorInfo = {
    message: 'Test error',
    type: 'axios',
    httpStatus: 500,
    originalError: new Error('Test error'),
  };

  const mockRateLimitErrorInfo: ExtractedErrorInfo = {
    message: 'Rate limited',
    type: 'axios',
    httpStatus: 429,
    rateLimitReset: Math.floor(Date.now() / 1000) + 60,
    rateLimitLimit: 100,
    rateLimitRemaining: 0,
    originalError: new Error('Rate limited'),
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock config service
    mockConfig = {
      putioAuth: mockAuthToken,
      putioClientId: mockClientId,
      putioClientSecret: mockClientSecret,
    } as unknown as jest.Mocked<AppConfigService>;

    // Mock API client constructor
    mockApiClient = {
      setToken: jest.fn(),
      Transfers: {
        Get: jest.fn(),
      },
      Files: {
        Query: jest.fn(),
        Delete: jest.fn(),
      },
      DownloadLinks: {
        Create: jest.fn(),
        Get: jest.fn(),
      },
    } as unknown as jest.Mocked<PutioAPIClient>;

    (PutioAPIClient as jest.MockedClass<typeof PutioAPIClient>).mockImplementation(
      () => mockApiClient
    );

    // Mock helper functions
    (extractErrorInfo as jest.MockedFunction<typeof extractErrorInfo>).mockReturnValue(mockErrorInfo);
    (isRateLimitError as jest.MockedFunction<typeof isRateLimitError>).mockReturnValue(false);
    (calculateWaitTimeFromError as jest.MockedFunction<typeof calculateWaitTimeFromError>).mockReturnValue(60);
    (formatErrorForLogging as jest.MockedFunction<typeof formatErrorForLogging>).mockReturnValue('Formatted error');
    (waitFor as jest.MockedFunction<typeof waitFor>).mockResolvedValue();

    // Mock memfs
    const mockVolume = { writeFileSync: jest.fn() } as unknown as Volume;
    const mockFs = {} as unknown as any;
    (memfs as jest.MockedFunction<typeof memfs>).mockReturnValue({ vol: mockVolume, fs: mockFs });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PutioService,
        {
          provide: AppConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<PutioService>(PutioService);

    // Mock logger to avoid console output in tests
    mockLogger = {
      error: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Methods', () => {
    describe('getAuthToken', () => {
      it('should return auth token from config', async () => {
        const result = await service.getAuthToken();

        expect(result).toBe(mockAuthToken);
      });
    });

    describe('getClientId', () => {
      it('should return client ID from config', async () => {
        const result = await service.getClientId();

        expect(result).toBe(mockClientId);
      });
    });

    describe('getClientSecret', () => {
      it('should return client secret from config', async () => {
        const result = await service.getClientSecret();

        expect(result).toBe(mockClientSecret);
      });
    });
  });

  describe('getApi', () => {
    it('should create and configure API client on first call', async () => {
      const result = await service.getApi();

      expect(PutioAPIClient).toHaveBeenCalledWith({
        clientID: mockClientId,
      });
      expect(mockApiClient.setToken).toHaveBeenCalledWith(mockAuthToken);
      expect(result).toBe(mockApiClient);
    });

    it('should return existing API client on subsequent calls (singleton pattern)', async () => {
      const firstCall = await service.getApi();
      const secondCall = await service.getApi();

      expect(PutioAPIClient).toHaveBeenCalledTimes(1);
      expect(mockApiClient.setToken).toHaveBeenCalledTimes(1);
      expect(firstCall).toBe(secondCall);
      expect(firstCall).toBe(mockApiClient);
    });
  });

  describe('getTransfer', () => {
    it('should get transfer successfully', async () => {
      const transferResponse = { transfer: mockTransfer };
      (mockApiClient.Transfers.Get as jest.MockedFunction<any>).mockResolvedValue(mockApiResponse(transferResponse));
      jest.spyOn(service, 'rateLimitSafeCall').mockResolvedValue(transferResponse);

      const result = await service.getTransfer(1);

      expect(service.rateLimitSafeCall).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toBe(mockTransfer);
    });

    it('should return null and log error on failure', async () => {
      const error = new Error('API error');
      jest.spyOn(service, 'rateLimitSafeCall').mockRejectedValue(error);

      const result = await service.getTransfer(1);

      expect(extractErrorInfo).toHaveBeenCalledWith(error);
      expect(formatErrorForLogging).toHaveBeenCalledWith(mockErrorInfo);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get transfer 1: Formatted error'
      );
      expect(result).toBeNull();
    });
  });

  describe('getFile', () => {
    it('should get file successfully', async () => {
      const fileResponse = { parent: mockFile };
      (mockApiClient.Files.Query as jest.MockedFunction<any>).mockResolvedValue(mockApiResponse(fileResponse));
      jest.spyOn(service, 'rateLimitSafeCall').mockResolvedValue(fileResponse);

      const result = await service.getFile(1);

      expect(service.rateLimitSafeCall).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toBe(mockFile);
    });

    it('should return null and log error on failure', async () => {
      const error = new Error('API error');
      jest.spyOn(service, 'rateLimitSafeCall').mockRejectedValue(error);

      const result = await service.getFile(1);

      expect(extractErrorInfo).toHaveBeenCalledWith(error);
      expect(formatErrorForLogging).toHaveBeenCalledWith(mockErrorInfo);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get file 1: Formatted error'
      );
      expect(result).toBeNull();
    });
  });

  describe('getPathsOfFiles', () => {
    it('should return empty array for empty input', async () => {
      const result = await service.getPathsOfFiles([]);

      expect(result).toEqual([]);
    });

    it('should build file paths correctly for single file', async () => {
      jest.spyOn(service, 'getFile').mockResolvedValue(mockFile);

      const result = await service.getPathsOfFiles([1]);

      expect(service.getFile).toHaveBeenCalledWith(1);
      expect(result).toEqual([
        { id: 1, path: '/test-file.txt' },
      ]);
    });

    it('should build nested file paths correctly', async () => {
      const parentFolder: IFile = {
        id: 3,
        name: 'parent',
        file_type: 'FOLDER',
        parent_id: 0,
      } as unknown as IFile;

      const childFile: IFile = {
        id: 4,
        name: 'child.txt',
        file_type: 'FILE',
        parent_id: 3,
      } as unknown as IFile;

      jest.spyOn(service, 'getFile')
        .mockImplementation(async (id: number) => {
          if (id === 4) return childFile;
          if (id === 3) return parentFolder;
          return null;
        });

      const result = await service.getPathsOfFiles([4]);

      expect(service.getFile).toHaveBeenCalledWith(4);
      expect(service.getFile).toHaveBeenCalledWith(3);
      expect(result).toEqual([
        { id: 4, path: '/parent/child.txt' },
      ]);
    });

    it('should handle multiple files and deduplicate parent requests', async () => {
      const file1: IFile = {
        id: 1,
        name: 'file1.txt',
        file_type: 'FILE',
        parent_id: 3,
      } as unknown as IFile;

      const file2: IFile = {
        id: 2,
        name: 'file2.txt',
        file_type: 'FILE',
        parent_id: 3,
      } as unknown as IFile;

      const parentFolder: IFile = {
        id: 3,
        name: 'shared-parent',
        file_type: 'FOLDER',
        parent_id: 0,
      } as unknown as IFile;

      jest.spyOn(service, 'getFile')
        .mockImplementation(async (id: number) => {
          if (id === 1) return file1;
          if (id === 2) return file2;
          if (id === 3) return parentFolder;
          return null;
        });

      const result = await service.getPathsOfFiles([1, 2]);

      expect(service.getFile).toHaveBeenCalledTimes(3); // file1, file2, parent (only once)
      expect(result).toEqual([
        { id: 1, path: '/shared-parent/file1.txt' },
        { id: 2, path: '/shared-parent/file2.txt' },
      ]);
    });

    it('should handle null files gracefully', async () => {
      jest.spyOn(service, 'getFile').mockResolvedValue(null);

      const result = await service.getPathsOfFiles([999]);

      expect(result).toEqual([]);
    });
  });

  describe('rateLimitSafeCall', () => {
    const mockApiCall = jest.fn();

    beforeEach(() => {
      mockApiCall.mockClear();
    });

    it('should return data on successful API call', async () => {
      const mockData = { test: 'data' };
      mockApiCall.mockResolvedValue(mockApiResponse(mockData));

      const result = await service.rateLimitSafeCall(mockApiCall);

      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockData);
    });

    it('should throw immediately on non-rate-limit errors', async () => {
      const error = new Error('API error');
      mockApiCall.mockRejectedValue(error);
      (isRateLimitError as jest.MockedFunction<typeof isRateLimitError>).mockReturnValue(false);

      await expect(service.rateLimitSafeCall(mockApiCall)).rejects.toThrow(error);

      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(extractErrorInfo).toHaveBeenCalledWith(error);
      expect(isRateLimitError).toHaveBeenCalledWith(mockErrorInfo);
      expect(mockLogger.error).toHaveBeenCalledWith('API call failed: Formatted error');
    });

    it('should retry on rate limit errors with exponential backoff', async () => {
      const error = new Error('Rate limited');
      const successData = { test: 'data' };

      mockApiCall
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue(mockApiResponse(successData));

      (extractErrorInfo as jest.MockedFunction<typeof extractErrorInfo>).mockReturnValue(mockRateLimitErrorInfo);
      (isRateLimitError as jest.MockedFunction<typeof isRateLimitError>).mockReturnValue(true);
      (calculateWaitTimeFromError as jest.MockedFunction<typeof calculateWaitTimeFromError>).mockReturnValue(1);

      const result = await service.rateLimitSafeCall(mockApiCall);

      expect(mockApiCall).toHaveBeenCalledTimes(3);
      expect(waitFor).toHaveBeenCalledTimes(2);
      expect(waitFor).toHaveBeenNthCalledWith(1, { sec: 1 }); // First retry: 1 * 1.1^0 = 1
      expect(waitFor).toHaveBeenNthCalledWith(2, { sec: 1.1 }); // Second retry: 1 * 1.1^1 = 1.1
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
      expect(result).toBe(successData);
    });

    it('should respect exponential backoff cap at 5 minutes', async () => {
      const error = new Error('Rate limited');
      mockApiCall.mockRejectedValue(error);

      (extractErrorInfo as jest.MockedFunction<typeof extractErrorInfo>).mockReturnValue(mockRateLimitErrorInfo);
      (isRateLimitError as jest.MockedFunction<typeof isRateLimitError>).mockReturnValue(true);
      (calculateWaitTimeFromError as jest.MockedFunction<typeof calculateWaitTimeFromError>).mockReturnValue(400); // High wait time

      await expect(service.rateLimitSafeCall(mockApiCall)).rejects.toThrow();

      // Should cap the wait time at 300 seconds (5 minutes)
      expect(waitFor).toHaveBeenCalledWith({ sec: 300 });
    });

    it('should throw after exhausting max retry attempts', async () => {
      const error = new Error('Rate limited');
      mockApiCall.mockRejectedValue(error);

      (extractErrorInfo as jest.MockedFunction<typeof extractErrorInfo>).mockReturnValue(mockRateLimitErrorInfo);
      (isRateLimitError as jest.MockedFunction<typeof isRateLimitError>).mockReturnValue(true);
      (calculateWaitTimeFromError as jest.MockedFunction<typeof calculateWaitTimeFromError>).mockReturnValue(1);

      await expect(service.rateLimitSafeCall(mockApiCall)).rejects.toThrow(error);

      expect(mockApiCall).toHaveBeenCalledTimes(10); // MAX_RETRY_ATTEMPTS
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed after 10 attempts: Formatted error'
      );
    });

    it('should log rate limit information during retries', async () => {
      const error = new Error('Rate limited');
      mockApiCall.mockRejectedValue(error);

      (extractErrorInfo as jest.MockedFunction<typeof extractErrorInfo>).mockReturnValue(mockRateLimitErrorInfo);
      (isRateLimitError as jest.MockedFunction<typeof isRateLimitError>).mockReturnValue(true);
      (calculateWaitTimeFromError as jest.MockedFunction<typeof calculateWaitTimeFromError>).mockReturnValue(30);

      await expect(service.rateLimitSafeCall(mockApiCall)).rejects.toThrow();

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit hit (attempt 1/10). Waiting 30.0 seconds before retrying... [0/100 remaining]')
      );
    });
  });

  describe('deleteItem', () => {
    it('should delete item successfully', async () => {
      jest.spyOn(service, 'rateLimitSafeCall').mockResolvedValue(undefined);

      await service.deleteItem(1);

      expect(service.rateLimitSafeCall).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should log error on failure but not throw', async () => {
      const error = new Error('Delete failed');
      jest.spyOn(service, 'rateLimitSafeCall').mockRejectedValue(error);

      await expect(service.deleteItem(1)).resolves.toBeUndefined();

      expect(extractErrorInfo).toHaveBeenCalledWith(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete file 1: Formatted error'
      );
    });
  });

  describe('getDownloadLinks', () => {
    const mockCreateResponse = { id: 'download-link-id' };
    const mockGetResponse = {
      links: {
        download_links: [
          'https://example.com/files/1/download',
          'https://example.com/files/2/download',
        ],
      },
    };

    it('should throw error for empty putio IDs', async () => {
      await expect(service.getDownloadLinks([])).rejects.toThrow(
        new RuntimeException('No putio ids provided, cannot get download links.')
      );
    });

    it('should get download links successfully and return in correct order', async () => {
      jest.spyOn(service, 'rateLimitSafeCall')
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(mockGetResponse);

      const result = await service.getDownloadLinks([1, 2]);

      expect(service.rateLimitSafeCall).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        'https://example.com/files/1/download',
        'https://example.com/files/2/download',
      ]);
    });

    it('should handle unordered links from Put.io and return in requested order', async () => {
      const unorderedResponse = {
        links: {
          download_links: [
            'https://example.com/files/2/download',
            'https://example.com/files/1/download',
            'https://example.com/files/3/download',
          ],
        },
      };

      jest.spyOn(service, 'rateLimitSafeCall')
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(unorderedResponse);

      const result = await service.getDownloadLinks([1, 2, 3]);

      expect(result).toEqual([
        'https://example.com/files/1/download',
        'https://example.com/files/2/download',
        'https://example.com/files/3/download',
      ]);
    });

    it('should retry on failure up to maxAttempts', async () => {
      const error = new Error('API error');
      jest.spyOn(service, 'rateLimitSafeCall').mockRejectedValue(error);

      await expect(service.getDownloadLinks([1], 3)).rejects.toThrow(
        new RuntimeException('Failed to get download links for 1 after 3 attempts')
      );

      expect(service.rateLimitSafeCall).toHaveBeenCalledTimes(3); // 3 attempts * 1 call each (first call fails immediately)
      expect(waitFor).toHaveBeenCalledTimes(3);
      expect(waitFor).toHaveBeenCalledWith({ sec: 2 });
      expect(mockLogger.error).toHaveBeenCalledTimes(3);
    });

    it('should retry when create response has no ID', async () => {
      jest.spyOn(service, 'rateLimitSafeCall')
        .mockResolvedValueOnce({ id: null })
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(mockGetResponse);

      const result = await service.getDownloadLinks([1, 2], 3);

      expect(result).toEqual([
        'https://example.com/files/1/download',
        'https://example.com/files/2/download',
      ]);
      expect(waitFor).toHaveBeenCalledTimes(1);
    });

    it('should retry when get response has no links', async () => {
      jest.spyOn(service, 'rateLimitSafeCall')
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce({ links: null })
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(mockGetResponse);

      const result = await service.getDownloadLinks([1, 2], 3);

      expect(result).toEqual([
        'https://example.com/files/1/download',
        'https://example.com/files/2/download',
      ]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Download Links response has no links (1, 2)!',
        { links: null }
      );
      expect(waitFor).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed URLs gracefully', async () => {
      const malformedResponse = {
        links: {
          download_links: [
            'https://example.com/invalid-url',
            'https://example.com/files/2/download',
          ],
        },
      };

      jest.spyOn(service, 'rateLimitSafeCall')
        .mockResolvedValueOnce(mockCreateResponse)
        .mockResolvedValueOnce(malformedResponse);

      const result = await service.getDownloadLinks([1, 2]);

      // Should only include valid URL in correct position
      expect(result).toEqual([
        undefined, // No match for ID 1
        'https://example.com/files/2/download',
      ]);
    });
  });

  describe('getVolume', () => {
    it('should return null when getVolumeInternal returns null', async () => {
      jest.spyOn(service as any, 'getVolumeInternal').mockResolvedValue(null);

      const result = await service.getVolume(1);

      expect(result).toBeNull();
    });

    it('should create and return volume when getVolumeInternal succeeds', async () => {
      const mockVFSNode = {
        'test-file.txt': JSON.stringify(mockFile),
      };
      const mockVolume = { writeFileSync: jest.fn() } as unknown as Volume;
      const mockFs = {} as unknown as any;

      jest.spyOn(service as any, 'getVolumeInternal').mockResolvedValue(mockVFSNode);
      (memfs as jest.MockedFunction<typeof memfs>).mockReturnValue({ vol: mockVolume, fs: mockFs });

      const result = await service.getVolume(1);

      expect(service['getVolumeInternal']).toHaveBeenCalledWith(1);
      expect(memfs).toHaveBeenCalledWith(mockVFSNode);
      expect(result).toBe(mockVolume);
    });
  });

  describe('getVolumeInternal', () => {
    it('should throw error when file is not found', async () => {
      jest.spyOn(service, 'getFile').mockResolvedValue(null);

      await expect(service['getVolumeInternal'](999)).rejects.toThrow(
        new RuntimeException('File with id 999 not found')
      );
    });

    it('should return simple file structure for non-folder files', async () => {
      jest.spyOn(service, 'getFile').mockResolvedValue(mockFile);

      const result = await service['getVolumeInternal'](1);

      expect(result).toEqual({
        'test-file.txt': JSON.stringify(mockFile),
      });
    });

    it('should use provided file info when knownIdFileInfo is passed', async () => {
      jest.spyOn(service, 'getFile');

      const result = await service['getVolumeInternal'](1, mockFile);

      expect(service.getFile).not.toHaveBeenCalled();
      expect(result).toEqual({
        'test-file.txt': JSON.stringify(mockFile),
      });
    });

    it('should build folder structure recursively', async () => {
      const subfolder = { ...mockFolder, id: 3, name: 'subfolder' };
      const folderContents = {
        files: [
          mockFile,
          subfolder,
        ],
      };

      const subfolderContents = {
        files: [
          { ...mockFile, id: 4, name: 'subfile.txt' },
        ],
      };

      jest.spyOn(service, 'getFile').mockResolvedValue(mockFolder);
      jest.spyOn(service, 'rateLimitSafeCall')
        .mockResolvedValueOnce(folderContents)
        .mockResolvedValueOnce(subfolderContents);

      // Mock getVolumeInternal to return the subfolder structure when called recursively
      const originalGetVolumeInternal = service['getVolumeInternal'].bind(service);
      jest.spyOn(service as any, 'getVolumeInternal').mockImplementation(async (id: number, knownFileInfo?: any) => {
        if (id === 2 && !knownFileInfo) {
          // First call - return the main folder structure
          return originalGetVolumeInternal(id, knownFileInfo);
        } else if (id === 3) {
          // Recursive call for subfolder
          return {
            'subfolder': {
              '.meta': JSON.stringify(subfolder),
              'subfile.txt': JSON.stringify({ ...mockFile, id: 4, name: 'subfile.txt' }),
            },
          };
        }
        return originalGetVolumeInternal(id, knownFileInfo);
      });

      const result = await service['getVolumeInternal'](2);

      expect(result).toEqual({
        'test-folder': {
          '.meta': JSON.stringify(mockFolder),
          'test-file.txt': JSON.stringify(mockFile),
          'subfolder': {
            '.meta': JSON.stringify(subfolder),
            'subfile.txt': JSON.stringify({ ...mockFile, id: 4, name: 'subfile.txt' }),
          },
        },
      });
    });

    it('should handle API errors gracefully when querying folder contents', async () => {
      const error = new Error('API error');
      jest.spyOn(service, 'getFile').mockResolvedValue(mockFolder);
      jest.spyOn(service, 'rateLimitSafeCall').mockRejectedValue(error);

      const result = await service['getVolumeInternal'](2);

      expect(result).toEqual({
        'test-folder': {
          '.meta': JSON.stringify(mockFolder),
        },
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error while attempting to get files from folder 2: API error',
        expect.any(String)
      );
    });

    it('should handle complex error objects when logging', async () => {
      const complexError = {
        data: { error_message: 'Put.io error' },
        error_message: 'API error',
        message: 'Generic error',
        stack: 'Error stack trace',
      };

      jest.spyOn(service, 'getFile').mockResolvedValue(mockFolder);
      jest.spyOn(service, 'rateLimitSafeCall').mockRejectedValue(complexError);

      await service['getVolumeInternal'](2);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error while attempting to get files from folder 2: Put.io error',
        'Error stack trace'
      );
    });

    it('should build complex nested folder structure', async () => {
      const rootFolder: IFile = {
        id: 1,
        name: 'root',
        file_type: 'FOLDER',
        parent_id: 0,
      } as unknown as IFile;

      const subFolder1: IFile = {
        id: 2,
        name: 'sub1',
        file_type: 'FOLDER',
        parent_id: 1,
      } as unknown as IFile;

      const subFolder2: IFile = {
        id: 3,
        name: 'sub2',
        file_type: 'FOLDER',
        parent_id: 1,
      } as unknown as IFile;

      const file1: IFile = {
        id: 4,
        name: 'file1.txt',
        file_type: 'FILE',
        parent_id: 1,
      } as unknown as IFile;

      const file2: IFile = {
        id: 5,
        name: 'file2.txt',
        file_type: 'FILE',
        parent_id: 2,
      } as unknown as IFile;

      jest.spyOn(service, 'getFile').mockResolvedValue(rootFolder);
      jest.spyOn(service, 'rateLimitSafeCall')
        .mockResolvedValueOnce({
          files: [subFolder1, subFolder2, file1],
        })
        .mockResolvedValueOnce({
          files: [file2],
        })
        .mockResolvedValueOnce({
          files: [],
        });

      // Mock recursive calls properly
      const originalGetVolumeInternal = service['getVolumeInternal'].bind(service);
      jest.spyOn(service as any, 'getVolumeInternal').mockImplementation(async (id: number, knownFileInfo?: any) => {
        if (id === 1 && !knownFileInfo) {
          // Root folder call
          return originalGetVolumeInternal(id, knownFileInfo);
        } else if (id === 2) {
          // sub1 folder call
          return {
            'sub1': {
              '.meta': JSON.stringify(subFolder1),
              'file2.txt': JSON.stringify(file2),
            },
          };
        } else if (id === 3) {
          // sub2 folder call
          return {
            'sub2': {
              '.meta': JSON.stringify(subFolder2),
            },
          };
        }
        return originalGetVolumeInternal(id, knownFileInfo);
      });

      const result = await service['getVolumeInternal'](1);

      expect(result).toEqual({
        'root': {
          '.meta': JSON.stringify(rootFolder),
          'file1.txt': JSON.stringify(file1),
          'sub1': {
            '.meta': JSON.stringify(subFolder1),
            'file2.txt': JSON.stringify(file2),
          },
          'sub2': {
            '.meta': JSON.stringify(subFolder2),
          },
        },
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle undefined error in getVolumeInternal', async () => {
      jest.spyOn(service, 'getFile').mockResolvedValue(mockFolder);
      jest.spyOn(service, 'rateLimitSafeCall').mockRejectedValue(undefined);

      const result = await service['getVolumeInternal'](2);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error while attempting to get files from folder 2: Unknown error',
        undefined
      );
      expect(result).toEqual({
        'test-folder': {
          '.meta': JSON.stringify(mockFolder),
        },
      });
    });

    it('should handle error with only message property', async () => {
      const simpleError = { message: 'Simple error' };
      jest.spyOn(service, 'getFile').mockResolvedValue(mockFolder);
      jest.spyOn(service, 'rateLimitSafeCall').mockRejectedValue(simpleError);

      await service['getVolumeInternal'](2);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error while attempting to get files from folder 2: Simple error',
        undefined
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow for getting transfer, file, and download links', async () => {
      // Setup mocks for complete workflow
      const transferResponse = { transfer: mockTransfer };
      const fileResponse = { parent: mockFile };
      const createResponse = { id: 'download-id' };
      const getResponse = {
        links: {
          download_links: ['https://example.com/files/1/download'],
        },
      };

      jest.spyOn(service, 'rateLimitSafeCall')
        .mockResolvedValueOnce(transferResponse)
        .mockResolvedValueOnce(fileResponse)
        .mockResolvedValueOnce(createResponse)
        .mockResolvedValueOnce(getResponse);

      // Execute workflow
      const transfer = await service.getTransfer(1);
      const file = await service.getFile(1);
      const downloadLinks = await service.getDownloadLinks([1]);

      // Verify results
      expect(transfer).toBe(mockTransfer);
      expect(file).toBe(mockFile);
      expect(downloadLinks).toEqual(['https://example.com/files/1/download']);
      expect(service.rateLimitSafeCall).toHaveBeenCalledTimes(4);
    });
  });

  describe('Rate Limiting Scenarios', () => {
    it('should handle mixed rate limit and success responses', async () => {
      const error = new Error('Rate limited');
      const successData = { test: 'data' };

      (extractErrorInfo as jest.MockedFunction<typeof extractErrorInfo>).mockReturnValue(mockRateLimitErrorInfo);
      (isRateLimitError as jest.MockedFunction<typeof isRateLimitError>).mockReturnValue(true);
      (calculateWaitTimeFromError as jest.MockedFunction<typeof calculateWaitTimeFromError>).mockReturnValue(5);

      const mockApiCall = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockApiResponse(successData));

      const result = await service.rateLimitSafeCall(mockApiCall);

      expect(result).toBe(successData);
      expect(waitFor).toHaveBeenCalledWith({ sec: 5 });
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit hit (attempt 1/10). Waiting 5.0 seconds')
      );
    });

    it('should handle rate limit with missing headers gracefully', async () => {
      const rateLimitErrorWithoutHeaders: ExtractedErrorInfo = {
        message: 'Rate limited',
        type: 'axios',
        httpStatus: 429,
        originalError: new Error('Rate limited'),
      };

      const error = new Error('Rate limited');
      (extractErrorInfo as jest.MockedFunction<typeof extractErrorInfo>).mockReturnValue(rateLimitErrorWithoutHeaders);
      (isRateLimitError as jest.MockedFunction<typeof isRateLimitError>).mockReturnValue(true);
      (calculateWaitTimeFromError as jest.MockedFunction<typeof calculateWaitTimeFromError>).mockReturnValue(60);

      const mockApiCall = jest.fn().mockRejectedValue(error);

      await expect(service.rateLimitSafeCall(mockApiCall)).rejects.toThrow();

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit hit (attempt 1/10). Waiting 60.0 seconds before retrying... [?/? remaining]')
      );
    });
  });
});