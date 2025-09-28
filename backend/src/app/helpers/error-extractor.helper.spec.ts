import { AxiosError, AxiosHeaders } from 'axios';
import {
  extractErrorInfo,
  isRateLimitError,
  calculateWaitTimeFromError,
  formatErrorForLogging,
  ExtractedErrorInfo,
} from './error-extractor.helper';

describe('error-extractor.helper', () => {
  describe('extractErrorInfo', () => {
    it('should handle null/undefined errors', () => {
      const nullInfo = extractErrorInfo(null);
      expect(nullInfo.message).toBe('Null or undefined error');
      expect(nullInfo.type).toBe('unknown');

      const undefinedInfo = extractErrorInfo(undefined);
      expect(undefinedInfo.message).toBe('Null or undefined error');
      expect(undefinedInfo.type).toBe('unknown');
    });

    it('should handle string errors', () => {
      const info = extractErrorInfo('Something went wrong');
      expect(info.message).toBe('Something went wrong');
      expect(info.type).toBe('unknown');
    });

    it('should handle standard Node.js errors', () => {
      const error = new Error('Test error');
      (error as any).code = 'ENOENT';
      const info = extractErrorInfo(error);

      expect(info.message).toBe('Test error');
      expect(info.type).toBe('node');
      expect(info.code).toBe('ENOENT');
      expect(info.stack).toBeDefined();
    });

    it('should handle Axios errors with response', () => {
      const axiosError = new AxiosError('Request failed');
      axiosError.code = 'ERR_BAD_REQUEST';
      axiosError.config = {
        method: 'get',
        url: 'https://api.example.com/test',
        data: { test: 'data' },
        headers: new AxiosHeaders({ 'Content-Type': 'application/json' }),
      };
      axiosError.response = {
        status: 429,
        statusText: 'Too Many Requests',
        data: {
          error: 'Rate limit exceeded',
          error_type: 'rate_limit',
          error_message: 'You have exceeded the rate limit',
        },
        headers: {
          'x-ratelimit-reset': '1234567890',
          'x-ratelimit-limit': '100',
          'x-ratelimit-remaining': '0',
          'retry-after': '60',
        },
        config: axiosError.config as any,
      };

      const info = extractErrorInfo(axiosError);

      expect(info.type).toBe('axios');
      expect(info.message).toBe('Request failed');
      expect(info.code).toBe('ERR_BAD_REQUEST');
      expect(info.httpStatus).toBe(429);
      expect(info.httpStatusText).toBe('Too Many Requests');
      expect(info.httpMethod).toBe('GET');
      expect(info.httpUrl).toBe('https://api.example.com/test');
      expect(info.rateLimitReset).toBe(1234567890);
      expect(info.rateLimitLimit).toBe(100);
      expect(info.rateLimitRemaining).toBe(0);
      expect(info.retryAfter).toBe(60);
    });

    it('should handle Put.io API client errors', () => {
      const putioError = {
        message: 'Put.io API error',
        data: {
          error_type: 'invalid_grant',
          error_message: 'Invalid OAuth token',
          error_id: 'err123',
          error_uri: 'https://api.put.io/v2/docs#errors',
          'x-trace-id': 'trace123',
          status_code: 401,
          extra: { field: 'oauth_token' },
        },
      };

      const info = extractErrorInfo(putioError);

      expect(info.type).toBe('putio');
      expect(info.message).toBe('Invalid OAuth token');
      expect(info.putioErrorType).toBe('invalid_grant');
      expect(info.putioErrorMessage).toBe('Invalid OAuth token');
      expect(info.putioErrorId).toBe('err123');
      expect(info.putioErrorUri).toBe('https://api.put.io/v2/docs#errors');
      expect(info.putioTraceId).toBe('trace123');
      expect(info.httpStatus).toBe(401);
      expect(info.putioExtra).toEqual({ field: 'oauth_token' });
    });

    it('should handle plain objects with error properties', () => {
      const error = {
        message: 'Custom error',
        code: 'CUSTOM_ERR',
        status: 500,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Server error' },
          headers: {
            'content-type': 'application/json',
          },
        },
      };

      const info = extractErrorInfo(error);

      expect(info.message).toBe('Custom error');
      expect(info.code).toBe('CUSTOM_ERR');
      expect(info.httpStatus).toBe(500);
      expect(info.httpStatusText).toBe('Internal Server Error');
      expect(info.responseData).toEqual({ error: 'Server error' });
    });

    it('should normalize headers to lowercase', () => {
      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        status: 429,
        statusText: 'Too Many Requests',
        data: {},
        headers: {
          'X-RateLimit-Reset': '1234567890',
          'X-RATELIMIT-LIMIT': '100',
          'x-ratelimit-remaining': '0',
          'Retry-After': '60',
        },
        config: {} as any,
      };

      const info = extractErrorInfo(axiosError);

      expect(info.rateLimitReset).toBe(1234567890);
      expect(info.rateLimitLimit).toBe(100);
      expect(info.rateLimitRemaining).toBe(0);
      expect(info.retryAfter).toBe(60);
    });
  });

  describe('isRateLimitError', () => {
    it('should identify rate limit errors by status code', () => {
      const info: ExtractedErrorInfo = {
        message: 'Rate limited',
        type: 'axios',
        httpStatus: 429,
        originalError: {},
      };

      expect(isRateLimitError(info)).toBe(true);
    });

    it('should identify rate limit errors by headers', () => {
      const info1: ExtractedErrorInfo = {
        message: 'Some error',
        type: 'axios',
        rateLimitReset: 1234567890,
        originalError: {},
      };

      const info2: ExtractedErrorInfo = {
        message: 'Some error',
        type: 'axios',
        retryAfter: 60,
        originalError: {},
      };

      expect(isRateLimitError(info1)).toBe(true);
      expect(isRateLimitError(info2)).toBe(true);
    });

    it('should return false for non-rate-limit errors', () => {
      const info: ExtractedErrorInfo = {
        message: 'Not found',
        type: 'axios',
        httpStatus: 404,
        originalError: {},
      };

      expect(isRateLimitError(info)).toBe(false);
    });
  });

  describe('calculateWaitTimeFromError', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T00:00:00Z').getTime());
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate wait time from rateLimitReset', () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const resetTime = currentTime + 30;

      const info: ExtractedErrorInfo = {
        message: 'Rate limited',
        type: 'axios',
        rateLimitReset: resetTime,
        originalError: {},
      };

      const waitTime = calculateWaitTimeFromError(info);
      expect(waitTime).toBe(31); // 30 seconds + 1 second buffer
    });

    it('should handle retryAfter as number (seconds)', () => {
      const info: ExtractedErrorInfo = {
        message: 'Rate limited',
        type: 'axios',
        retryAfter: 45,
        originalError: {},
      };

      const waitTime = calculateWaitTimeFromError(info);
      expect(waitTime).toBe(45);
    });

    it('should handle retryAfter as string number', () => {
      const info: ExtractedErrorInfo = {
        message: 'Rate limited',
        type: 'axios',
        retryAfter: '30',
        originalError: {},
      };

      const waitTime = calculateWaitTimeFromError(info);
      expect(waitTime).toBe(30);
    });

    it('should handle retryAfter as HTTP date', () => {
      const futureDate = new Date(Date.now() + 60000); // 60 seconds from now
      const info: ExtractedErrorInfo = {
        message: 'Rate limited',
        type: 'axios',
        retryAfter: futureDate.toUTCString(),
        originalError: {},
      };

      const waitTime = calculateWaitTimeFromError(info);
      expect(waitTime).toBeCloseTo(60, 0);
    });

    it('should use default wait time when no rate limit info', () => {
      const info: ExtractedErrorInfo = {
        message: 'Some error',
        type: 'axios',
        originalError: {},
      };

      const waitTime = calculateWaitTimeFromError(info, 120);
      expect(waitTime).toBe(120);
    });
  });

  describe('formatErrorForLogging', () => {
    it('should format basic error', () => {
      const info: ExtractedErrorInfo = {
        message: 'Something went wrong',
        type: 'node',
        code: 'ERR_CODE',
        originalError: {},
      };

      const formatted = formatErrorForLogging(info);
      expect(formatted).toBe('Something went wrong [Code: ERR_CODE]');
    });

    it('should format HTTP error with full details', () => {
      const info: ExtractedErrorInfo = {
        message: 'Request failed',
        type: 'axios',
        httpStatus: 404,
        httpStatusText: 'Not Found',
        httpMethod: 'GET',
        httpUrl: 'https://api.example.com/resource',
        code: 'ENOTFOUND',
        originalError: {},
      };

      const formatted = formatErrorForLogging(info);
      expect(formatted).toBe(
        'Request failed [HTTP 404 Not Found] [GET https://api.example.com/resource] [Code: ENOTFOUND]'
      );
    });

    it('should format Put.io error', () => {
      const info: ExtractedErrorInfo = {
        message: 'Invalid token',
        type: 'putio',
        httpStatus: 401,
        putioErrorType: 'invalid_grant',
        originalError: {},
      };

      const formatted = formatErrorForLogging(info);
      expect(formatted).toBe('Invalid token [HTTP 401] [Put.io: invalid_grant]');
    });

    it('should format rate limit error with details', () => {
      const info: ExtractedErrorInfo = {
        message: 'Too many requests',
        type: 'axios',
        httpStatus: 429,
        rateLimitRemaining: 0,
        rateLimitLimit: 100,
        rateLimitReset: 1234567890,
        originalError: {},
      };

      const formatted = formatErrorForLogging(info);
      expect(formatted).toBe('Too many requests [HTTP 429] [Rate Limited] [0/100 remaining]');
    });
  });
});