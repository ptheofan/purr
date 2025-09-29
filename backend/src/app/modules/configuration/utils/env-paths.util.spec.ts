import { getEnvFilePaths } from './env-paths.util';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { fileExistsSync } from 'tsconfig-paths/lib/filesystem';
import { Logger } from '@nestjs/common';

// Mock dependencies
jest.mock('fs');
jest.mock('tsconfig-paths/lib/filesystem');

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockFileExistsSync = fileExistsSync as jest.MockedFunction<typeof fileExistsSync>;

describe('env-paths.util', () => {
  const originalCwd = process.cwd;
  const mockCwd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.cwd
    process.cwd = mockCwd;
    
    // Mock Logger methods for test verification and noise suppression
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore original process.cwd
    process.cwd = originalCwd;
    jest.restoreAllMocks();
  });

  describe('getEnvFilePaths', () => {
    it('should return empty array when monorepo root is not found', () => {
      mockCwd.mockReturnValue('/some/directory');
      mockExistsSync.mockReturnValue(false);

      const result = getEnvFilePaths();

      expect(result).toEqual([]);
      expect(Logger.prototype.warn).toHaveBeenCalledWith('Could not find monorepo root with @purr/monorepo package.json');
    });

    it('should find monorepo root by package name', () => {
      const monorepoPath = '/project/root';
      mockCwd.mockReturnValue('/project/root/backend/src');
      
      // Mock the directory traversal - first two calls return false, third returns true
      mockExistsSync
        .mockReturnValueOnce(false) // /project/root/backend/src/package.json
        .mockReturnValueOnce(false) // /project/root/backend/package.json
        .mockReturnValueOnce(true); // /project/root/package.json

      mockReadFileSync.mockReturnValue(JSON.stringify({
        name: '@purr/monorepo'
      }));

      mockFileExistsSync.mockReturnValue(true);

      const result = getEnvFilePaths();

      expect(result).toHaveLength(3); // .env.local, .env.test, .env
      expect(result[0]).toBe(resolve(monorepoPath, '.env.local'));
      expect(result[1]).toBe(resolve(monorepoPath, '.env.test'));
      expect(result[2]).toBe(resolve(monorepoPath, '.env'));
    });

    it('should find monorepo root by workspaces configuration', () => {
      const monorepoPath = '/project/root';
      mockCwd.mockReturnValue('/project/root/backend/src');
      
      // Mock the directory traversal
      mockExistsSync
        .mockReturnValueOnce(false) // /project/root/backend/src/package.json
        .mockReturnValueOnce(false) // /project/root/backend/package.json
        .mockReturnValueOnce(true); // /project/root/package.json

      mockReadFileSync.mockReturnValue(JSON.stringify({
        name: 'some-other-name',
        workspaces: ['backend', 'frontend']
      }));

      mockFileExistsSync.mockReturnValue(true);

      const result = getEnvFilePaths();

      expect(result).toHaveLength(3);
      expect(result.every(path => path.startsWith(monorepoPath))).toBe(true);
    });

    it('should only return existing env files', () => {
      const monorepoPath = '/project/root';
      mockCwd.mockReturnValue(monorepoPath);
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        name: '@purr/monorepo'
      }));

      // Only .env.local and .env exist, .env.test does not
      mockFileExistsSync
        .mockReturnValueOnce(true)  // .env.local exists
        .mockReturnValueOnce(false) // .env.test does not exist
        .mockReturnValueOnce(true); // .env exists

      const result = getEnvFilePaths();

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(resolve(monorepoPath, '.env.local'));
      expect(result[1]).toBe(resolve(monorepoPath, '.env'));
    });

    it('should handle JSON parsing errors gracefully', () => {
      const monorepoPath = '/project/root';
      mockCwd.mockReturnValue(monorepoPath);
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const result = getEnvFilePaths();

      expect(result).toEqual([]);
      expect(Logger.prototype.error).toHaveBeenCalledWith('Error reading package.json:', expect.any(Error));
    });

    it('should traverse up directory tree correctly', () => {
      mockCwd.mockReturnValue('/deep/nested/directory');
      
      // Mock multiple directory levels - only the third one should return true
      mockExistsSync
        .mockReturnValueOnce(false) // /deep/nested/directory/package.json
        .mockReturnValueOnce(false) // /deep/nested/package.json
        .mockReturnValueOnce(true); // /deep/package.json (found monorepo root)

      mockReadFileSync.mockReturnValue(JSON.stringify({
        name: '@purr/monorepo'
      }));

      mockFileExistsSync.mockReturnValue(true);

      const result = getEnvFilePaths();

      expect(result).toHaveLength(3);
      expect(result.every(path => path.startsWith('/deep'))).toBe(true);
    });

    it('should handle missing NODE_ENV environment variable', () => {
      // This test verifies that when NODE_ENV is undefined, 
      // the envFiles array still works correctly
      const monorepoPath = '/project/root';
      mockCwd.mockReturnValue(monorepoPath);
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        name: '@purr/monorepo'
      }));

      // Only .env.local and .env exist, the NODE_ENV specific file doesn't
      mockFileExistsSync
        .mockReturnValueOnce(true)  // .env.local exists
        .mockReturnValueOnce(false) // .env.test does not exist (NODE_ENV is undefined)
        .mockReturnValueOnce(true); // .env exists

      const result = getEnvFilePaths();

      // Should have .env.local and .env (NODE_ENV specific file filtered out)
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(resolve(monorepoPath, '.env.local'));
      expect(result[1]).toBe(resolve(monorepoPath, '.env'));
    });
  });
});
