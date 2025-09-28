import { NetworkManager } from './network-manager'; // Adjust the import path as needed
import axios, { AxiosError } from 'axios';
import { createWriteStream } from 'fs';
import { Readable, Writable } from 'stream';

// Mock axios and fs modules
jest.mock('axios');
jest.mock('fs');

describe('NetworkManager', () => {
  let networkManager: NetworkManager;

  beforeEach(() => {
    // Create a new instance before each test
    networkManager = new NetworkManager();

    // Clear all mock calls and implementations between tests
    jest.clearAllMocks();
  });

  describe('configuration', () => {
    it('should configure with network check URL and axios config', () => {
      const networkCheckUrl = 'http://example.com/check';
      const axiosConfig = { timeout: 10000 };
      const bytesTolerance = 0.5;

      expect(() => networkManager.configure(networkCheckUrl, axiosConfig, bytesTolerance)).not.toThrow();
    });

    it('should throw error when configuring disposed manager', () => {
      networkManager.dispose();
      expect(() => networkManager.configure('http://example.com')).toThrow('Cannot configure disposed NetworkManager');
    });

    it('should use default tolerance when not specified', () => {
      expect(() => networkManager.configure('http://example.com', { timeout: 5000 })).not.toThrow();
    });
  });

  describe('checkConnectivity', () => {
    beforeEach(() => {
      networkManager.configure('http://example.com/check', { timeout: 10000 });
    });

    it('returns true when axios.head succeeds', async () => {
      // Mock axios.head to resolve successfully
      jest.mocked(axios.head).mockResolvedValueOnce({ status: 200 });

      const result = await networkManager.checkConnectivity();

      expect(result).toBe(true);
      expect(axios.head).toHaveBeenCalledWith('http://example.com/check', {
        timeout: 10000
      });
    });

    it('returns false when axios.head fails', async () => {
      // Mock axios.head to reject with an error
      jest.mocked(axios.head).mockRejectedValueOnce(new Error('Network error'));

      const result = await networkManager.checkConnectivity();

      expect(result).toBe(false);
      expect(axios.head).toHaveBeenCalledWith('http://example.com/check', {
        timeout: 10000
      });
    });

    it('should throw error when not configured', async () => {
      const unconfiguredManager = new NetworkManager();
      await expect(unconfiguredManager.checkConnectivity()).rejects.toThrow('NetworkManager not configured. Call configure() first.');
    });

    it('should throw error when disposed', async () => {
      networkManager.dispose();
      await expect(networkManager.checkConnectivity()).rejects.toThrow('NetworkManager not configured. Call configure() first.');
    });
  });

  describe('getFileSize', () => {
    beforeEach(() => {
      networkManager.configure('http://example.com/check', { timeout: 10000 });
    });

    it('returns size when content-length is valid', async () => {
      // Mock axios.head to return a valid content-length
      jest.mocked(axios.head).mockResolvedValueOnce({
        headers: { 'content-length': '100' }
      });

      const size = await networkManager.getFileSize('http://example.com/file');

      expect(size).toBe(100);
      expect(axios.head).toHaveBeenCalledWith('http://example.com/file', { timeout: 10000 });
    });

    it('returns undefined when content-length is missing', async () => {
      // Mock axios.head to return headers without content-length
      jest.mocked(axios.head).mockResolvedValueOnce({ headers: {} });

      const size = await networkManager.getFileSize('http://example.com/file');

      expect(size).toBeUndefined();
      expect(axios.head).toHaveBeenCalledWith('http://example.com/file', { timeout: 10000 });
    });

    it('returns undefined when content-length is invalid', async () => {
      // Mock axios.head to return invalid content-length
      jest.mocked(axios.head).mockResolvedValueOnce({
        headers: { 'content-length': 'invalid' }
      });

      const size = await networkManager.getFileSize('http://example.com/file');

      expect(size).toBeUndefined();
      expect(axios.head).toHaveBeenCalledWith('http://example.com/file', { timeout: 10000 });
    });

    it('throws NetworkError when axios.head fails', async () => {
      // Mock axios.head to reject with AxiosError
      const axiosError = Object.create(AxiosError.prototype);
      axiosError.message = 'Network error';
      axiosError.response = { status: 404 };
      jest.mocked(axios.head).mockRejectedValueOnce(axiosError);

      await expect(networkManager.getFileSize('http://example.com/file')).rejects.toThrow('Failed to get file size: Network error');
    });

    it('should throw error when disposed', async () => {
      networkManager.dispose();
      await expect(networkManager.getFileSize('http://example.com/file')).rejects.toThrow('Cannot get file size on disposed NetworkManager');
    });
  });

  describe('calculateRetryDelay', () => {
    beforeEach(() => {
      networkManager.configure('http://example.com/check');
      // Mock Math.random for deterministic testing
      jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // Adds 500ms jitter
    });

    afterEach(() => {
      // Restore Math.random after each test
      jest.spyOn(global.Math, 'random').mockRestore();
    });

    it('calculates delay for retryCount 0', () => {
      const delay = networkManager.calculateRetryDelay(0, 1000, 10000);
      // Expected: initialDelay * 2^0 + 500 = 1000 + 500
      expect(delay).toBe(1500);
    });

    it('calculates delay for retryCount 1', () => {
      const delay = networkManager.calculateRetryDelay(1, 1000, 10000);
      // Expected: initialDelay * 2^1 + 500 = 2000 + 500
      expect(delay).toBe(2500);
    });

    it('caps delay at maxDelay', () => {
      const delay = networkManager.calculateRetryDelay(10, 1000, 2000);
      // Expected: min(1000 * 2^10, 2000) + 500 = 2000 + 500
      expect(delay).toBe(2500);
    });
  });

  describe('downloadRange', () => {
    let mockedReadable: Readable;
    let mockedWritable: Writable;
    const range = { start: 0, end: 99 }; // 100 bytes expected
    const url = 'http://example.com/file';
    const fileHandle = { fd: 123 };
    const abortSignal = new AbortController().signal;
    const onProgress = jest.fn();

    beforeEach(() => {
      networkManager.configure('http://example.com/check', { timeout: 10000 }, 0.1);

      // Reset mocks and set up streams
      onProgress.mockClear();

      // Create mock readable stream for axios response
      mockedReadable = new Readable({
        read() {} // No-op read function
      });

      // Create mock writable stream for fs.createWriteStream
      mockedWritable = new Writable({
        write(chunk, encoding, callback) {
          callback(); // Simulate successful write
        }
      });

      // Mock axios.get to return the readable stream
      jest.mocked(axios).mockResolvedValueOnce({ data: mockedReadable });

      // Mock fs.createWriteStream to return the writable stream
      jest.mocked(createWriteStream).mockReturnValueOnce(mockedWritable as any);
    });

    it('succeeds when bytes written match expected size', async () => {
      const promise = networkManager.downloadRange(range, url, fileHandle, abortSignal, onProgress);

      // Simulate data flow asynchronously
      setImmediate(() => {
        mockedReadable.push(Buffer.alloc(50)); // First chunk
        mockedReadable.push(Buffer.alloc(50)); // Second chunk
        mockedReadable.push(null); // End the stream
      });

      await promise;

      // Verify onProgress calls
      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, 50);
      expect(onProgress).toHaveBeenNthCalledWith(2, 50);

      // Verify createWriteStream options
      expect(createWriteStream).toHaveBeenCalledWith(null, {
        fd: 123,
        start: 0,
        autoClose: false
      });

      // Verify axios request configuration
      expect(axios).toHaveBeenCalledWith({
        method: 'GET',
        url: url,
        responseType: 'stream',
        headers: {
          Range: 'bytes=0-99'
        },
        signal: abortSignal,
        timeout: 10000
      });
    });

    it('rejects when bytes written do not match expected size', async () => {
      const promise = networkManager.downloadRange(range, url, fileHandle, abortSignal, onProgress);

      // Simulate insufficient data
      setImmediate(() => {
        mockedReadable.push(Buffer.alloc(50)); // Only 50 bytes, expected 100
        mockedReadable.push(null); // End the stream
      });

      await expect(promise).rejects.toThrow(/Range size mismatch: expected 100, got 50/);

      // Verify onProgress calls
      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onProgress).toHaveBeenCalledWith(50);
    });

    it('accepts bytes within tolerance threshold', async () => {
      // Use 2% tolerance
      const tolerantNetworkManager = new NetworkManager();
      tolerantNetworkManager.configure('http://example.com/check', { timeout: 10000 }, 2);

      const promise = tolerantNetworkManager.downloadRange(range, url, fileHandle, abortSignal, onProgress);

      // Simulate data within 2% tolerance (expected 100, got 98)
      setImmediate(() => {
        mockedReadable.push(Buffer.alloc(98));
        mockedReadable.push(null);
      });

      await expect(promise).resolves.toBeUndefined();

      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onProgress).toHaveBeenCalledWith(98);
    });

    it('rejects on readable stream error', async () => {
      const promise = networkManager.downloadRange(range, url, fileHandle, abortSignal, onProgress);

      // Simulate stream error
      setImmediate(() => {
        mockedReadable.emit('error', new Error('Stream error'));
      });

      await expect(promise).rejects.toThrow('Stream error');
    });

    it('rejects on writable stream error', async () => {
      // Override writable stream to simulate error
      const errorWritable = new Writable({
        write(chunk, encoding, callback) {
          callback(new Error('Write error'));
        }
      });
      jest.mocked(createWriteStream).mockReturnValueOnce(errorWritable as any);

      const promise = networkManager.downloadRange(range, url, fileHandle, abortSignal, onProgress);

      // Push some data to trigger the write error
      setImmediate(() => {
        mockedReadable.push(Buffer.alloc(50));
        mockedReadable.push(null);
      });

      await expect(promise).rejects.toThrow('Range size mismatch: expected 100, got 50');
    });
  });

  describe('dispose', () => {
    beforeEach(() => {
      networkManager.configure('http://example.com/check', { timeout: 5000 });
    });

    it('should dispose and prevent further operations', () => {
      expect(networkManager.isDisposed).toBe(false);

      networkManager.dispose();

      expect(networkManager.isDisposed).toBe(true);
    });

    it('should handle multiple dispose calls gracefully', () => {
      networkManager.dispose();
      expect(() => networkManager.dispose()).not.toThrow();
      expect(networkManager.isDisposed).toBe(true);
    });

    it('should prevent operations after disposal', () => {
      networkManager.dispose();
      expect(() => networkManager.configure('http://new.com')).toThrow('Cannot configure disposed NetworkManager');
    });
  });
});