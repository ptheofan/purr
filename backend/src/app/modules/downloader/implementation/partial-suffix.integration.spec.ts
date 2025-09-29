import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DownloadFactory } from '../factories/downloader.factory';
import { FileManager } from './file-manager';
import { DownloaderOptions } from '../implementation';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Partial Suffix Integration', () => {
  let downloadFactory: DownloadFactory;
  let eventEmitter: EventEmitter2;
  let tempDir: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadFactory,
        EventEmitter2,
      ],
    }).compile();

    downloadFactory = module.get<DownloadFactory>(DownloadFactory);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'purr-partial-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('FileManager partial suffix behavior', () => {
    it('should create files with .partial suffix during download', async () => {
      const saveAs = path.join(tempDir, 'test-file.txt');
      const expectedPartialPath = `${saveAs}.partial`;

      const fileManager = new FileManager();
      fileManager.configure(saveAs);

      // Verify the partial path is correctly set
      expect(fileManager.partialFilePath).toBe(expectedPartialPath);
      expect(fileManager.finalFilePath).toBe(saveAs);

      // Initialize the file (this should create the .partial file)
      await fileManager.initializeFile(1024);

      // Check that the partial file exists
      expect(fs.existsSync(expectedPartialPath)).toBe(true);
      expect(fs.existsSync(saveAs)).toBe(false);

      // Check file size
      const stats = fs.statSync(expectedPartialPath);
      expect(stats.size).toBe(1024);
    });

    it('should rename .partial to final name when finalized', async () => {
      const saveAs = path.join(tempDir, 'test-file.txt');
      const expectedPartialPath = `${saveAs}.partial`;

      const fileManager = new FileManager();
      fileManager.configure(saveAs);

      await fileManager.initializeFile(1024);

      // Verify partial exists and final doesn't
      expect(fs.existsSync(expectedPartialPath)).toBe(true);
      expect(fs.existsSync(saveAs)).toBe(false);

      // Finalize the download
      await fileManager.finalizeDownload();

      // Verify final exists and partial doesn't
      expect(fs.existsSync(expectedPartialPath)).toBe(false);
      expect(fs.existsSync(saveAs)).toBe(true);
    });

    it('should clean up .partial file on failure', async () => {
      const saveAs = path.join(tempDir, 'test-file.txt');
      const expectedPartialPath = `${saveAs}.partial`;

      const fileManager = new FileManager();
      fileManager.configure(saveAs);

      await fileManager.initializeFile(1024);

      // Verify partial exists
      expect(fs.existsSync(expectedPartialPath)).toBe(true);

      // Clean up partial file
      await fileManager.cleanupPartialFile();

      // Verify partial is gone
      expect(fs.existsSync(expectedPartialPath)).toBe(false);
      expect(fs.existsSync(saveAs)).toBe(false);
    });
  });

  describe('Download Factory integration', () => {
    it('should use .partial suffix in coordinated downloads', async () => {
      const saveAs = path.join(tempDir, 'factory-test.txt');
      const expectedPartialPath = `${saveAs}.partial`;

      const options: DownloaderOptions<any> = {
        url: 'http://example.com/test.txt',
        saveAs: saveAs,
        sourceObject: { id: 'test', name: 'test.txt' },
        fileSize: 1024,
        chunkSize: 256,
        workersCount: 1
      };

      const coordinator = await downloadFactory.create(options);

      // The coordinator should have initialized the file with .partial suffix
      expect(fs.existsSync(expectedPartialPath)).toBe(true);
      expect(fs.existsSync(saveAs)).toBe(false);

      // Clean up
      await coordinator.dispose();
    });
  });

  describe('Container environment simulation', () => {
    it('should work correctly with various path formats', async () => {
      const testCases = [
        '/mnt/downloads/file.txt',
        '/app/data/nested/dir/file.txt',
        '/tmp/test-file.txt',
        './test-data/file.txt'
      ];

      for (const testPath of testCases) {
        // Create a safe test path in our temp directory
        const safePath = path.join(tempDir, path.basename(testPath));
        const expectedPartialPath = `${safePath}.partial`;

        const fileManager = new FileManager();
        fileManager.configure(safePath);

        expect(fileManager.partialFilePath).toBe(expectedPartialPath);
        expect(fileManager.finalFilePath).toBe(safePath);

        await fileManager.initializeFile(512);
        expect(fs.existsSync(expectedPartialPath)).toBe(true);

        await fileManager.cleanupPartialFile();
      }
    });

    it('should handle nested directory structures', async () => {
      const nestedDir = path.join(tempDir, 'nested', 'deep', 'structure');
      const saveAs = path.join(nestedDir, 'deep-file.txt');
      const expectedPartialPath = `${saveAs}.partial`;

      const fileManager = new FileManager();
      fileManager.configure(saveAs);

      // This should create the nested directories
      await fileManager.initializeFile(1024);

      expect(fs.existsSync(expectedPartialPath)).toBe(true);
      expect(fs.existsSync(nestedDir)).toBe(true);

      await fileManager.cleanupPartialFile();
    });
  });
});