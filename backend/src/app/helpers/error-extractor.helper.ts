import { AxiosError } from 'axios';
import { IPutioAPIClientError } from '@putdotio/api-client';

/**
 * Comprehensive error information extracted from various error types
 */
export interface ExtractedErrorInfo {
  // Basic error info
  message: string;
  type: 'axios' | 'putio' | 'node' | 'unknown';
  code?: string;
  stack?: string;

  // HTTP specific
  httpStatus?: number;
  httpStatusText?: string;
  httpMethod?: string;
  httpUrl?: string;

  // Rate limiting headers
  rateLimitReset?: number; // Unix timestamp
  rateLimitLimit?: number;
  rateLimitRemaining?: number;
  retryAfter?: string | number; // Can be seconds or HTTP date

  // Put.io specific error fields
  putioErrorId?: string;
  putioErrorType?: string;
  putioErrorMessage?: string;
  putioErrorUri?: string;
  putioTraceId?: string;
  putioExtra?: Record<string, unknown>;

  // Response data
  responseData?: any;
  responseHeaders?: Record<string, string>;

  // Request info
  requestData?: any;
  requestHeaders?: Record<string, string>;

  // Original error reference
  originalError: unknown;
}

/**
 * Extracts comprehensive error information from various error types
 * Handles Axios errors, Put.io API errors, Node errors, and unknown errors
 */
export function extractErrorInfo(error: unknown): ExtractedErrorInfo {
  const info: ExtractedErrorInfo = {
    message: 'Unknown error occurred',
    type: 'unknown',
    originalError: error,
  };

  // Handle null/undefined
  if (error == null) {
    info.message = 'Null or undefined error';
    return info;
  }

  // Extract stack trace if available
  if (error instanceof Error) {
    info.stack = error.stack;
  }

  // Check if it's an Axios error
  if (isAxiosError(error)) {
    info.type = 'axios';
    extractAxiosErrorInfo(error, info);
  }
  // Check if it's a Put.io API client error
  else if (isPutioError(error)) {
    info.type = 'putio';
    extractPutioErrorInfo(error, info);
  }
  // Standard Node.js Error
  else if (error instanceof Error) {
    info.type = 'node';
    info.message = error.message;
    info.code = (error as any).code;
  }
  // Plain object with error-like properties
  else if (typeof error === 'object') {
    extractObjectErrorInfo(error as any, info);
  }
  // String error
  else if (typeof error === 'string') {
    info.message = error;
  }

  return info;
}

/**
 * Type guard for Axios errors
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as any).isAxiosError === true
  );
}

/**
 * Type guard for Put.io API client errors
 */
function isPutioError(error: unknown): error is IPutioAPIClientError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof (error as any).data === 'object' &&
    'error_type' in (error as any).data
  );
}

/**
 * Extract information from Axios errors
 */
function extractAxiosErrorInfo(error: AxiosError, info: ExtractedErrorInfo): void {
  info.message = error.message;
  info.code = error.code;

  // Request information
  if (error.config) {
    info.httpMethod = error.config.method?.toUpperCase();
    info.httpUrl = error.config.url;
    info.requestData = error.config.data;
    info.requestHeaders = error.config.headers as any;
  }

  // Response information
  if (error.response) {
    info.httpStatus = error.response.status;
    info.httpStatusText = error.response.statusText;
    info.responseData = error.response.data;

    // Extract headers (case-insensitive)
    const headers = error.response.headers;
    if (headers) {
      info.responseHeaders = normalizeHeaders(headers);

      // Extract rate limit headers
      extractRateLimitHeaders(info.responseHeaders, info);
    }

    // Extract Put.io error details from response data
    if (error.response.data && typeof error.response.data === 'object') {
      extractPutioDataFields(error.response.data as any, info);
    }
  }
}

/**
 * Extract information from Put.io API client errors
 */
function extractPutioErrorInfo(error: IPutioAPIClientError, info: ExtractedErrorInfo): void {
  // Basic error info
  if (error.message) {
    info.message = error.message;
  }

  // Put.io specific error data
  if (error.data) {
    info.putioErrorType = error.data.error_type;
    info.putioErrorMessage = error.data.error_message;
    info.putioErrorId = error.data.error_id;
    info.putioErrorUri = error.data.error_uri;
    info.putioTraceId = error.data['x-trace-id'];
    info.putioExtra = error.data.extra;
    info.httpStatus = error.data.status_code;

    // Use Put.io error message as primary message if available
    if (error.data.error_message) {
      info.message = error.data.error_message;
    }
  }

  // Also check for Axios properties
  if (isAxiosError(error)) {
    extractAxiosErrorInfo(error, info);
  }
}

/**
 * Extract error info from plain objects
 */
function extractObjectErrorInfo(error: Record<string, any>, info: ExtractedErrorInfo): void {
  // Common error properties
  if (error.message) info.message = String(error.message);
  if (error.code) info.code = String(error.code);
  if (error.status || error.statusCode) {
    info.httpStatus = error.status || error.statusCode;
  }

  // Put.io error properties
  extractPutioDataFields(error, info);

  // Response-like object
  if (error.response && typeof error.response === 'object') {
    const response = error.response;
    if (response.status) info.httpStatus = response.status;
    if (response.statusText) info.httpStatusText = response.statusText;
    if (response.data) info.responseData = response.data;
    if (response.headers) {
      info.responseHeaders = normalizeHeaders(response.headers);
      extractRateLimitHeaders(info.responseHeaders, info);
    }
  }
}

/**
 * Extract Put.io specific fields from data object
 */
function extractPutioDataFields(data: Record<string, any>, info: ExtractedErrorInfo): void {
  if (data.error_type) info.putioErrorType = data.error_type;
  if (data.error_message) {
    info.putioErrorMessage = data.error_message;
    // Use as primary message if we don't have one
    if (info.message === 'Unknown error occurred') {
      info.message = data.error_message;
    }
  }
  if (data.error_id) info.putioErrorId = data.error_id;
  if (data.error_uri) info.putioErrorUri = data.error_uri;
  if (data['x-trace-id']) info.putioTraceId = data['x-trace-id'];
  if (data.extra) info.putioExtra = data.extra;
  if (data.status_code) info.httpStatus = data.status_code;
}

/**
 * Normalize headers to lowercase keys for consistent access
 */
function normalizeHeaders(headers: any): Record<string, string> {
  const normalized: Record<string, string> = {};
  if (headers && typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = String(value);
    }
  }
  return normalized;
}

/**
 * Extract rate limit headers from normalized headers
 *
 * Put.io API Official Rate Limit Headers:
 * - X-RateLimit-Remaining: Number of requests remaining in current window
 * - X-RateLimit-Limit: Total number of requests allowed in the window
 * - X-RateLimit-Reset: Unix timestamp when the rate limit resets
 */
function extractRateLimitHeaders(headers: Record<string, string>, info: ExtractedErrorInfo): void {
  // X-RateLimit headers (Put.io official pattern)
  const resetHeader = headers['x-ratelimit-reset'];
  const limitHeader = headers['x-ratelimit-limit'];
  const remainingHeader = headers['x-ratelimit-remaining'];

  if (resetHeader) {
    const reset = parseInt(resetHeader, 10);
    if (!isNaN(reset)) {
      info.rateLimitReset = reset;
    }
  }

  if (limitHeader) {
    const limit = parseInt(limitHeader, 10);
    if (!isNaN(limit)) {
      info.rateLimitLimit = limit;
    }
  }

  if (remainingHeader) {
    const remaining = parseInt(remainingHeader, 10);
    if (!isNaN(remaining)) {
      info.rateLimitRemaining = remaining;
    }
  }

  // Retry-After header (RFC standard)
  const retryAfter = headers['retry-after'];
  if (retryAfter) {
    // Could be seconds (number) or HTTP date (string)
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      info.retryAfter = seconds;
    } else {
      info.retryAfter = retryAfter;
    }
  }
}

/**
 * Helper to check if error is a rate limit error
 */
export function isRateLimitError(errorInfo: ExtractedErrorInfo): boolean {
  return errorInfo.httpStatus === 429 ||
         errorInfo.rateLimitReset !== undefined ||
         errorInfo.retryAfter !== undefined;
}

/**
 * Calculate wait time from error info
 */
export function calculateWaitTimeFromError(errorInfo: ExtractedErrorInfo, defaultWait: number = 60): number {
  // Check for x-ratelimit-reset header (Unix timestamp)
  if (errorInfo.rateLimitReset) {
    const currentTime = Math.floor(Date.now() / 1000);
    const waitTime = Math.max(errorInfo.rateLimitReset - currentTime + 1, 1);
    return waitTime;
  }

  // Check for Retry-After header
  if (errorInfo.retryAfter) {
    // If it's a number, it's seconds
    if (typeof errorInfo.retryAfter === 'number') {
      return errorInfo.retryAfter;
    }

    // If it's a string number, parse it
    const seconds = parseInt(errorInfo.retryAfter as string, 10);
    if (!isNaN(seconds)) {
      return seconds;
    }

    // Otherwise, it might be an HTTP date
    const retryDate = new Date(errorInfo.retryAfter as string);
    if (!isNaN(retryDate.getTime())) {
      const waitTime = Math.max((retryDate.getTime() - Date.now()) / 1000, 1);
      return waitTime;
    }
  }

  return defaultWait;
}

/**
 * Format error info for logging
 */
export function formatErrorForLogging(errorInfo: ExtractedErrorInfo): string {
  const parts: string[] = [errorInfo.message];

  if (errorInfo.httpStatus) {
    parts.push(`[HTTP ${errorInfo.httpStatus}${errorInfo.httpStatusText ? ` ${errorInfo.httpStatusText}` : ''}]`);
  }

  if (errorInfo.httpMethod && errorInfo.httpUrl) {
    parts.push(`[${errorInfo.httpMethod} ${errorInfo.httpUrl}]`);
  }

  if (errorInfo.putioErrorType) {
    parts.push(`[Put.io: ${errorInfo.putioErrorType}]`);
  }

  if (errorInfo.code) {
    parts.push(`[Code: ${errorInfo.code}]`);
  }

  if (isRateLimitError(errorInfo)) {
    parts.push('[Rate Limited]');
    if (errorInfo.rateLimitRemaining !== undefined && errorInfo.rateLimitLimit !== undefined) {
      parts.push(`[${errorInfo.rateLimitRemaining}/${errorInfo.rateLimitLimit} remaining]`);
    }
  }

  return parts.join(' ');
}