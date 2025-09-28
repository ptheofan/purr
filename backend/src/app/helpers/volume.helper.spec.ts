import { findFileOrFolder, getFirstFileOrFolder, getMeta } from './volume.helper';
import { Volume } from 'memfs';
import { IFile } from '@putdotio/api-client';

describe('Volume Helper', () => {
  describe('getFirstFileOrFolder', () => {
    it('should return the first file or folder in the root of the volume', () => {
      // Arrange
      const volume = new Volume();
      volume.writeFileSync('/file1.txt', 'File 1 content');
      volume.mkdirSync('/folder1'); // Create the folder first
      volume.writeFileSync('/folder1/file2.txt', 'File 2 content');

      // Act
      const result = getFirstFileOrFolder(volume);

      // Assert
      expect(result).toBeDefined();
      expect(result).toEqual('/file1.txt');
    });

    it('should return undefined if there are no files or folders in the root of the volume', () => {
      // Arrange
      const volume = new Volume();

      // Act
      const result = getFirstFileOrFolder(volume);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('getMeta', () => {
    it('should return metadata for a file', () => {
      // Arrange
      const volume = new Volume();
      const mockFile: IFile = {
        id: 123,
        name: 'test.txt',
        size: 1024,
        content_type: 'text/plain',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        parent_id: 1,
        is_shared: false,
        is_mp4_available: false,
        screenshot: null,
        first_accessed_at: null,
        crc32: 'abc123',
        md5: 'def456',
        file_type: 'FILE',
        extension: 'txt'
      };
      volume.writeFileSync('/test.txt', JSON.stringify(mockFile));

      // Act
      const result = getMeta('/test.txt', volume);

      // Assert
      expect(result).toEqual(mockFile);
    });

    it('should return metadata for a directory from .meta file', () => {
      // Arrange
      const volume = new Volume();
      const mockDir: IFile = {
        id: 456,
        name: 'testdir',
        size: 0,
        content_type: 'application/x-directory',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        parent_id: 1,
        is_shared: false,
        is_mp4_available: false,
        screenshot: null,
        first_accessed_at: null,
        crc32: null,
        md5: null,
        file_type: 'FOLDER',
        extension: null
      };
      volume.mkdirSync('/testdir');
      volume.writeFileSync('/testdir/.meta', JSON.stringify(mockDir));

      // Act
      const result = getMeta('/testdir', volume);

      // Assert
      expect(result).toEqual(mockDir);
    });

    it('should throw error when file does not exist', () => {
      // Arrange
      const volume = new Volume();

      // Act & Assert
      expect(() => getMeta('/nonexistent.txt', volume)).toThrow('Failed to read metadata for /nonexistent.txt');
    });

    it('should throw error when JSON is invalid', () => {
      // Arrange
      const volume = new Volume();
      volume.writeFileSync('/invalid.json', 'invalid json content');

      // Act & Assert
      expect(() => getMeta('/invalid.json', volume)).toThrow('Failed to read metadata for /invalid.json');
    });
  });

  describe('findFileOrFolder', () => {
    it('should return the first file that matches the regex pattern', () => {
      const volume = Volume.fromNestedJSON({
        '/file1.txt': 'File 1 content',
        '/file2.txt': 'File 2 content',
        '/folder1': {
          'file3.txt': 'File 3 content',
          'findme4.txt': 'File 4 content',
        },
      });

      const result = findFileOrFolder(volume, /^findme\d\.txt$/, 'file');
      expect(result).toEqual('/folder1/findme4.txt');
    });

    it('should return the first file that matches the regex pattern in a complex folder', () => {
      const volume = Volume.fromNestedJSON({
        '/file1.txt': 'File 1 content',
        '/file2.txt': 'File 2 content',
        '/folder1': {
          'file3.txt': 'File 3 content',
          'file4.txt': 'File 4 content',
          'folder2': {
            'file5.txt': 'File 5 content',
            'folder3': {
              'findme6.txt': 'File 6 content',
            },
          },
          'folder4': {
            'file7.txt': 'File 6 content',
          },
        },
      });

      const result = findFileOrFolder(volume, /^findme\d\.txt$/, 'file');
      expect(result).toEqual('/folder1/folder2/folder3/findme6.txt');
    });

    it('should return the first folder that matches the regex pattern', () => {
      const volume = Volume.fromNestedJSON({
        '/file1.txt': 'File 1 content',
        '/file2.txt': 'File 2 content',
        '/folder1': {
          'file3.txt': 'File 3 content',
          'file4.txt': 'File 4 content',
          'folder2': {
            'file5.txt': 'File 5 content',
            'folder3': {
              'file6.txt': 'File 6 content',
            },
          },
          'folder4': {
            'file7.txt': 'File 6 content',
          },
        },
      });

      const result = findFileOrFolder(volume, 'folder3', 'folder');
      expect(result).toEqual('/folder1/folder2/folder3');
    });

    it('should return undefined when not found', () => {
      const volume = Volume.fromNestedJSON({
        '/file1.txt': 'File 1 content',
        '/file2.txt': 'File 2 content',
        '/folder1': {
          'file3.txt': 'File 3 content',
          'file4.txt': 'File 4 content',
          'folder2': {
            'file5.txt': 'File 5 content',
            'folder3': {
              'file6.txt': 'File 6 content',
            },
          },
          'folder4': {
            'file7.txt': 'File 6 content',
          },
        },
      });

      const result = findFileOrFolder(volume, 'whatever', 'folder');
      expect(result).toEqual(undefined);
    });
  });
});
