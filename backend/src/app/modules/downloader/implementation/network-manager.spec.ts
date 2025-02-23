import { NetworkManager } from './network-manager'; // Adjust the import path as needed
import axios from 'axios';
import { createWriteStream } from 'fs';
import { Readable, Writable } from 'stream';

// Mock axios and fs modules
jest.mock('axios');
jest.mock('fs');

describe('NetworkManager', () => {
  let networkManager: NetworkManager;

  beforeEach(() => {
    // Create a new instance before each test
    networkManager = new NetworkManager('http://example.com/check', { timeout: 10000 });

    // Clear all mock calls and implementations between tests
    jest.clearAllMocks();
  });

  // Tests for checkConnectivity
  describe('checkConnectivity', () => {
    it('returns true when axios.head succeeds', async () => {
      // Mock axios.head to resolve successfully
      jest.mocked(axios.head).mockResolvedValueOnce({ status: 200 });

      const result = await networkManager.checkConnectivity();

      expect(result).toBe(true);
      expect(axios.head).toHaveBeenCalledWith('http://example.com/check', {
        timeout: 10000 // From axiosConfig
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
  });

  // Tests for getFileSize
  describe('getFileSize', () => {
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

    it('returns undefined when axios.head fails', async () => {
      // Mock axios.head to reject
      jest.mocked(axios.head).mockRejectedValueOnce(new Error('Network error'));

      const size = await networkManager.getFileSize('http://example.com/file');

      expect(size).toBeUndefined();
      expect(axios.head).toHaveBeenCalledWith('http://example.com/file', { timeout: 10000 });
    });
  });

  // Tests for calculateRetryDelay
  describe('calculateRetryDelay', () => {
    beforeEach(() => {
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

  // Tests for downloadRange
  describe('downloadRange', () => {
    let mockedReadable: Readable;
    let mockedWritable: Writable;
    const range = { start: 0, end: 99 }; // 100 bytes expected
    const url = 'http://example.com/file';
    const fileHandle = { fd: 123 };
    const abortSignal = new AbortController().signal;
    const onProgress = jest.fn();

    beforeEach(() => {
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

      await expect(promise).rejects.toThrow('Range size mismatch: expected 100, got 50');

      // Verify onProgress calls
      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onProgress).toHaveBeenCalledWith(50);
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
});
