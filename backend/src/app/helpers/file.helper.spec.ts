import { restrictFolderToRoot, crc32File } from './file.helper';
import * as path from 'path';
import * as fs from 'fs';

describe('restrictFolderToRoot', () => {
  it('should restrict target path to root folder', () => {
    const root = '/tmp';
    const targetPath = '/tmp/subfolder';

    const result = restrictFolderToRoot(targetPath, root);

    expect(result).toEqual(targetPath);
  });

  it('should prefix target path with root folder if not a subfolder', () => {
    const root = '/tmp';
    const targetPath = '/subfolder';

    const result = restrictFolderToRoot(targetPath, root);

    expect(result).toEqual(path.join(root, targetPath));
  });

  it('should throw an error if resulting target path is not a subfolder of root', () => {
    const root = '/tmp';
    const targetPath = '/tmp/../subfolder';

    expect(() => restrictFolderToRoot(targetPath, root)).toThrow();
  });
});

describe('crc32File', () => {
  const tempDir = '/tmp';
  let tempFile: string;

  beforeEach(() => {
    tempFile = path.join(tempDir, `test-file-${Date.now()}.txt`);
  });

  afterEach(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });

  it('should calculate CRC32 for an empty file', async () => {
    fs.writeFileSync(tempFile, '');
    
    const result = await crc32File(tempFile);
    
    expect(result).toBe('00000000');
  });

  it('should calculate CRC32 for a simple text file', async () => {
    const content = 'Hello, World!';
    fs.writeFileSync(tempFile, content);
    
    const result = await crc32File(tempFile);
    
    expect(result).toMatch(/^[0-9a-f]{8}$/);
    expect(result).not.toBe('00000000');
  });

  it('should calculate CRC32 for a binary file', async () => {
    const content = Buffer.from([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello" in bytes
    fs.writeFileSync(tempFile, content);
    
    const result = await crc32File(tempFile);
    
    expect(result).toMatch(/^[0-9a-f]{8}$/);
    expect(result).not.toBe('00000000');
  });

  it('should calculate CRC32 for a large file', async () => {
    const largeContent = 'A'.repeat(1024 * 1024); // 1MB of 'A's
    fs.writeFileSync(tempFile, largeContent);
    
    const result = await crc32File(tempFile);
    
    expect(result).toMatch(/^[0-9a-f]{8}$/);
    expect(result).not.toBe('00000000');
  });

  it('should return consistent results for the same file content', async () => {
    const content = 'Consistent test content';
    fs.writeFileSync(tempFile, content);
    
    const result1 = await crc32File(tempFile);
    const result2 = await crc32File(tempFile);
    
    expect(result1).toBe(result2);
  });

  it('should return different results for different file contents', async () => {
    const content1 = 'Content 1';
    const content2 = 'Content 2';
    
    fs.writeFileSync(tempFile, content1);
    const result1 = await crc32File(tempFile);
    
    fs.writeFileSync(tempFile, content2);
    const result2 = await crc32File(tempFile);
    
    expect(result1).not.toBe(result2);
  });

  it('should throw an error for non-existent file', async () => {
    const nonExistentFile = path.join(tempDir, 'non-existent-file.txt');
    
    await expect(crc32File(nonExistentFile)).rejects.toThrow();
  });

  it('should throw an error for directory path', async () => {
    await expect(crc32File(tempDir)).rejects.toThrow();
  });
});
