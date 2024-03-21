import { getFirstFileOrFolder } from './volume.helper';
import { Volume } from 'memfs';

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
