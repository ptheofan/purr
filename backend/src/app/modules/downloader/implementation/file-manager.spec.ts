import { FileManager } from './file-manager';
import * as fs from 'fs/promises';
import * as fsp from "node:fs/promises";
import * as path from 'path';

jest.mock("node:fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
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
    manager = new FileManager(mockPath);
    mockedPath.dirname.mockReturnValue('/test/path');
  });

  describe('initializeFile', () => {
    it('should create directory and initialize file', async () => {
      const mockFileHandle = {
        truncate: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
      };
      mockedFs.open.mockResolvedValue(mockFileHandle as unknown as fs.FileHandle);

      await manager.initializeFile(1024);

      expect(fsp.mkdir).toHaveBeenCalledWith('/test/path', { recursive: true });
      expect(mockedFs.open).toHaveBeenCalledWith(mockPath, 'w+');
      expect(mockFileHandle.truncate).toHaveBeenCalledWith(1024);
      expect(mockFileHandle.close).toHaveBeenCalled();
    });

    it('should handle directory creation failure', async () => {
      const error = new Error('Failed to create directory');
      (fsp.mkdir as jest.Mock).mockRejectedValue(error);

      await expect(manager.initializeFile(1024)).rejects.toThrow(error);
      expect(mockedFs.open).not.toHaveBeenCalled();
    });

    it('should handle file creation failure', async () => {
      const error = new Error('Failed to create file');
      mockedFs.open.mockRejectedValue(error);

      await expect(manager.initializeFile(1024)).rejects.toThrow(error);
    });
  });

  describe('openFileForWriting', () => {
    it('should open file in read/write mode', async () => {
      const mockFileHandle = {
        fd: 123,
        close: jest.fn().mockResolvedValue(undefined)
      };
      mockedFs.open.mockResolvedValue(mockFileHandle as unknown as fs.FileHandle);

      const result = await manager.openFileForWriting();

      expect(mockedFs.open).toHaveBeenCalledWith(mockPath, 'r+');
      expect(result).toBe(mockFileHandle);
    });

    it('should handle file open failure', async () => {
      const error = new Error('Failed to open file');
      mockedFs.open.mockRejectedValue(error);

      await expect(manager.openFileForWriting()).rejects.toThrow(error);
    });
  });
});
