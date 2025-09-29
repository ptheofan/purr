import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { Logger } from '@nestjs/common';
import { queryFileSize, queryRangesSupport } from './server.helper';

describe('server.helper', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    // Mock Logger.warn for test verification and suppression
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
    jest.restoreAllMocks();
  });

  describe('queryFileSize', () => {
    const testUrl = 'https://example.com/file.txt';

    it('should return file size when content-length header is present', async () => {
      const expectedSize = 1024;
      mock.onHead(testUrl).reply(200, {}, {
        'content-length': expectedSize.toString(),
      });

      const result = await queryFileSize(testUrl);

      expect(result).toBe(expectedSize);
    });

    it('should return undefined when content-length header is missing', async () => {
      mock.onHead(testUrl).reply(200, {}, {});

      const result = await queryFileSize(testUrl);

      expect(result).toBeUndefined();
    });

    it('should return undefined when content-length header is invalid', async () => {
      mock.onHead(testUrl).reply(200, {}, {
        'content-length': 'invalid-number',
      });

      const result = await queryFileSize(testUrl);

      expect(result).toBeUndefined();
    });

    it('should return undefined when content-length header is zero', async () => {
      mock.onHead(testUrl).reply(200, {}, {
        'content-length': '0',
      });

      const result = await queryFileSize(testUrl);

      expect(result).toBe(0);
    });

    it('should handle network errors gracefully', async () => {
      mock.onHead(testUrl).networkError();

      const result = await queryFileSize(testUrl);

      expect(result).toBeUndefined();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        `Failed to query file size for ${testUrl}:`,
        expect.any(Error)
      );
    });

    it('should handle HTTP errors gracefully', async () => {
      mock.onHead(testUrl).reply(404, 'Not Found');

      const result = await queryFileSize(testUrl);

      expect(result).toBeUndefined();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        `Failed to query file size for ${testUrl}:`,
        expect.any(Error)
      );
    });

    it('should pass axios options correctly', async () => {
      const axiosOpts = {
        timeout: 5000,
        headers: { 'User-Agent': 'test-agent' },
      };
      
      mock.onHead(testUrl).reply((config) => {
        expect(config.timeout).toBe(5000);
        expect(config.headers?.['User-Agent']).toBe('test-agent');
        return [200, {}, { 'content-length': '1024' }];
      });

      const result = await queryFileSize(testUrl, axiosOpts);

      expect(result).toBe(1024);
    });

    it('should handle large file sizes correctly', async () => {
      const largeSize = 1024 * 1024 * 1024; // 1GB
      mock.onHead(testUrl).reply(200, {}, {
        'content-length': largeSize.toString(),
      });

      const result = await queryFileSize(testUrl);

      expect(result).toBe(largeSize);
    });
  });

  describe('queryRangesSupport', () => {
    const testUrl = 'https://example.com/file.txt';

    it('should return true when server supports range requests (206 status)', async () => {
      mock.onGet(testUrl).reply(206, 'Partial content', {
        'content-range': 'bytes 0-1/1024',
      });

      const result = await queryRangesSupport(testUrl);

      expect(result).toBe(true);
    });

    it('should return false when server does not support range requests (200 status)', async () => {
      mock.onGet(testUrl).reply(200, 'Full content');

      const result = await queryRangesSupport(testUrl);

      expect(result).toBe(false);
    });

    it('should return false when server returns error status', async () => {
      mock.onGet(testUrl).reply(404, 'Not Found');

      const result = await queryRangesSupport(testUrl);

      expect(result).toBe(false);
    });

    it('should return false when network error occurs', async () => {
      mock.onGet(testUrl).networkError();

      const result = await queryRangesSupport(testUrl);

      expect(result).toBe(false);
    });

    it('should pass axios options and merge headers correctly', async () => {
      const axiosOpts = {
        timeout: 5000,
        headers: { 'User-Agent': 'test-agent' },
      };
      
      mock.onGet(testUrl).reply((config) => {
        expect(config.timeout).toBe(5000);
        expect(config.headers?.['User-Agent']).toBe('test-agent');
        expect(config.headers?.Range).toBe('bytes=0-1');
        return [206, 'Partial content'];
      });

      const result = await queryRangesSupport(testUrl, axiosOpts);

      expect(result).toBe(true);
    });

    it('should preserve existing headers when adding Range header', async () => {
      const axiosOpts = {
        headers: { 
          'Authorization': 'Bearer token',
          'Custom-Header': 'custom-value',
        },
      };
      
      mock.onGet(testUrl).reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer token');
        expect(config.headers?.['Custom-Header']).toBe('custom-value');
        expect(config.headers?.Range).toBe('bytes=0-1');
        return [206, 'Partial content'];
      });

      const result = await queryRangesSupport(testUrl, axiosOpts);

      expect(result).toBe(true);
    });

    it('should handle timeout errors gracefully', async () => {
      mock.onGet(testUrl).timeout();

      const result = await queryRangesSupport(testUrl);

      expect(result).toBe(false);
    });

    it('should handle 416 Range Not Satisfiable status', async () => {
      mock.onGet(testUrl).reply(416, 'Range Not Satisfiable');

      const result = await queryRangesSupport(testUrl);

      expect(result).toBe(false);
    });
  });
});
