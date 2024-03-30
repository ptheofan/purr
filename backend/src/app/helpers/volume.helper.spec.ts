import { findFileOrFolder, getFirstFileOrFolder } from './volume.helper';
import { Volume } from 'memfs';

describe('Volume Helper', () => {
  describe('getFirstFileOrFolder', () => {
    it('should return the first file or folder in the root of the volume', async () => {
      // Arrange
      const volume = new Volume();
      volume.writeFileSync('/file1.txt', 'File 1 content');
      volume.mkdirSync('/folder1'); // Create the folder first
      volume.writeFileSync('/folder1/file2.txt', 'File 2 content');

      // Act
      const result = await getFirstFileOrFolder(volume);

      // Assert
      expect(result).toBeDefined();
      expect(result).toEqual('/file1.txt');
    });

    it('should return undefined if there are no files or folders in the root of the volume', async () => {
      // Arrange
      const volume = new Volume();

      // Act
      const result = await getFirstFileOrFolder(volume);

      // Assert
      expect(result).toBeUndefined();
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
