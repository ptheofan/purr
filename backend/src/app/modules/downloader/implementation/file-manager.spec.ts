import { FileManager } from './file-manager';
import * as fs from 'fs/promises';
import * as fsp from "node:fs/promises";
import * as path from 'path';
import { FileHandle } from 'fs/promises';
import { Stats } from 'fs';

jest.mock("node:fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  open: jest.fn()
}));

jest.mock('path', () => ({
  dirname: jest.fn()
}));

describe('FileManager', () => {
  let manager: FileManager;
  const mockPath = '/test/path/file.txt';
  const mockedFs = jest.mocked(fs);
  const mockedPath = jest.mocked(path);

  beforeEach(() => {
    jest.resetAllMocks();
    manager = new FileManager();
    mockedPath.dirname.mockReturnValue('/test/path');
  });

  describe('configuration', () => {
    it('should configure with file path', () => {
      expect(() => manager.configure(mockPath)).not.toThrow();
      expect(manager.filePath).toBe(mockPath);
      expect(manager.isConfigured).toBe(true);
    });

    it('should throw error when configuring disposed manager', () => {
      manager.dispose();
      expect(() => manager.configure(mockPath)).toThrow('Cannot configure disposed FileManager');
    });

    it('should return undefined file path when not configured', () => {
      expect(manager.filePath).toBeUndefined();
      expect(manager.isConfigured).toBe(false);
    });
  });

  describe('initializeFile', () => {
    beforeEach(() => {
      manager.configure(mockPath);
    });

    it('should create directory and initialize file', async () => {
      const mockFileHandle = {
        truncate: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
      };
      mockedFs.open.mockResolvedValue(mockFileHandle as unknown as FileHandle);

      await manager.initializeFile(1024);

      expect(fsp.mkdir).toHaveBeenCalledWith('/test/path', { recursive: true });
      expect(mockedFs.open).toHaveBeenCalledWith(mockPath, 'w+');
      expect(mockFileHandle.truncate).toHaveBeenCalledWith(1024);
      expect(mockFileHandle.close).toHaveBeenCalled();
    });

    it('should handle directory creation failure', async () => {
      const error = new Error('Failed to create directory');
      (fsp.mkdir as jest.Mock).mockRejectedValue(error);

      await expect(manager.initializeFile(1024)).rejects.toThrow('Failed to initialize file: Failed to create directory');
      expect(mockedFs.open).not.toHaveBeenCalled();
    });

    it('should handle file creation failure', async () => {
      const error = new Error('Failed to create file');
      mockedFs.open.mockRejectedValue(error);

      await expect(manager.initializeFile(1024)).rejects.toThrow('Failed to initialize file: Failed to create file');
    });

    it('should throw error when not configured', async () => {
      const unconfiguredManager = new FileManager();
      await expect(unconfiguredManager.initializeFile(1024)).rejects.toThrow('FileManager not configured. Call configure() first.');
    });

    it('should throw error when disposed', async () => {
      manager.dispose();
      await expect(manager.initializeFile(1024)).rejects.toThrow('FileManager not configured. Call configure() first.');
    });

    it('should throw error for negative file size', async () => {
      await expect(manager.initializeFile(-100)).rejects.toThrow('Total bytes cannot be negative');
    });
  });

  describe('openFileForWriting', () => {
    beforeEach(() => {
      manager.configure(mockPath);
    });

    it('should open file in read/write mode', async () => {
      const mockFileHandle = {
        fd: 123,
        close: jest.fn().mockResolvedValue(undefined)
      };
      mockedFs.open.mockResolvedValue(mockFileHandle as unknown as FileHandle);

      const result = await manager.openFileForWriting();

      expect(mockedFs.open).toHaveBeenCalledWith(mockPath, 'r+');
      expect(result).toBe(mockFileHandle);
    });

    it('should handle file open failure', async () => {
      const error = new Error('Failed to open file');
      mockedFs.open.mockRejectedValue(error);

      await expect(manager.openFileForWriting()).rejects.toThrow('Failed to open file for writing: Failed to open file');
    });

    it('should throw error when not configured', async () => {
      const unconfiguredManager = new FileManager();
      await expect(unconfiguredManager.openFileForWriting()).rejects.toThrow('FileManager not configured. Call configure() first.');
    });

    it('should throw error when disposed', async () => {
      manager.dispose();
      await expect(manager.openFileForWriting()).rejects.toThrow('FileManager not configured. Call configure() first.');
    });
  });

  describe('getFileInfo', () => {
    beforeEach(() => {
      manager.configure(mockPath);
    });

    it('should return file info when file exists', async () => {
      const mockStats = { size: 2048 } as Stats;
      jest.mocked(fsp.stat).mockResolvedValue(mockStats);

      const result = await manager.getFileInfo();

      expect(result).toEqual({ exists: true, size: 2048 });
    });

    it('should return exists false when file does not exist', async () => {
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      jest.mocked(fsp.stat).mockRejectedValue(error);

      const result = await manager.getFileInfo();

      expect(result).toEqual({ exists: false });
    });

    it('should throw error for other stat failures', async () => {
      const error = new Error('Permission denied');
      jest.mocked(fsp.stat).mockRejectedValue(error);

      await expect(manager.getFileInfo()).rejects.toThrow('Failed to get file info: Permission denied');
    });

    it('should throw error when not configured', async () => {
      const unconfiguredManager = new FileManager();
      await expect(unconfiguredManager.getFileInfo()).rejects.toThrow('FileManager not configured. Call configure() first.');
    });
  });

  describe('dispose', () => {
    beforeEach(() => {
      manager.configure(mockPath);
    });

    it('should dispose and clear file path', () => {
      expect(manager.filePath).toBe(mockPath);
      expect(manager.isConfigured).toBe(true);

      manager.dispose();

      expect(manager.filePath).toBeUndefined();
      expect(manager.isConfigured).toBe(false);
    });

    it('should handle multiple dispose calls gracefully', () => {
      manager.dispose();
      expect(() => manager.dispose()).not.toThrow();
    });

    it('should prevent operations after disposal', () => {
      manager.dispose();
      expect(() => manager.configure('/new/path')).toThrow('Cannot configure disposed FileManager');
    });
  });
});