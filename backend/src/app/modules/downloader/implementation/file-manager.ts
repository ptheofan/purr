import { open, FileHandle } from 'fs/promises';
import * as path from 'path';
import * as fsp from 'node:fs/promises';
import { Logger } from '@nestjs/common';
import { FileSystemError } from '../errors/download.errors';

export class FileManager {
  private readonly logger = new Logger(FileManager.name);
  private finalPath?: string;
  private partialPath?: string;
  private disposed = false;

  constructor() {
    this.logger.debug('FileManager instance created');
  }

  /**
   * Configure the file manager with specific save path
   */
  configure(saveAs: string): void {
    if (this.disposed) {
      throw new Error('Cannot configure disposed FileManager');
    }

    this.finalPath = saveAs;
    this.partialPath = `${saveAs}.partial`;
    this.logger.debug(`FileManager configured for: ${saveAs} (partial: ${this.partialPath})`);
  }

  async initializeFile(totalBytes: number): Promise<void> {
    if (!this.partialPath || !this.finalPath) {
      throw new Error('FileManager not configured. Call configure() first.');
    }
    if (this.disposed) {
      throw new FileSystemError('Cannot initialize file on disposed FileManager', this.partialPath, 'create');
    }

    if (totalBytes < 0) {
      throw new FileSystemError('Total bytes cannot be negative', this.partialPath, 'create');
    }

    try {
      const saveAsDir = path.dirname(this.partialPath);

      // Create directory if it doesn't exist
      await fsp.mkdir(saveAsDir, { recursive: true });
      this.logger.debug(`Created directory: ${saveAsDir}`);

      // Create and initialize partial file with specified size
      const createHandle = await open(this.partialPath, 'w+');
      await createHandle.truncate(totalBytes);
      await createHandle.close();

      this.logger.log(`Initialized partial file: ${this.partialPath} (${totalBytes} bytes)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to initialize file: ${errorMessage}`);

      throw new FileSystemError(
        `Failed to initialize file: ${errorMessage}`,
        this.partialPath,
        'create',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async openFileForWriting(): Promise<FileHandle> {
    if (!this.partialPath) {
      throw new Error('FileManager not configured. Call configure() first.');
    }
    if (this.disposed) {
      throw new FileSystemError('Cannot open file on disposed FileManager', this.partialPath, 'write');
    }

    try {
      const fileHandle = await open(this.partialPath, 'r+');
      this.logger.debug(`Opened partial file for writing: ${this.partialPath}`);
      return fileHandle;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to open file for writing: ${errorMessage}`);

      throw new FileSystemError(
        `Failed to open file for writing: ${errorMessage}`,
        this.partialPath,
        'write',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Check if partial file exists and get its size
   */
  async getFileInfo(): Promise<{ exists: boolean; size?: number }> {
    if (!this.partialPath) {
      throw new Error('FileManager not configured. Call configure() first.');
    }

    try {
      const stats = await fsp.stat(this.partialPath);
      return { exists: true, size: stats.size };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { exists: false };
      }
      throw new FileSystemError(
        `Failed to get file info: ${error.message}`,
        this.partialPath,
        'read',
        undefined,
        error
      );
    }
  }

  /**
   * Finalize download by renaming partial file to final name
   */
  async finalizeDownload(): Promise<void> {
    if (!this.partialPath || !this.finalPath) {
      throw new Error('FileManager not configured. Call configure() first.');
    }
    if (this.disposed) {
      throw new FileSystemError('Cannot finalize on disposed FileManager', this.partialPath, 'write');
    }

    try {
      await fsp.rename(this.partialPath, this.finalPath);
      this.logger.log(`Download finalized: ${this.partialPath} -> ${this.finalPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to finalize download: ${errorMessage}`);

      throw new FileSystemError(
        `Failed to finalize download: ${errorMessage}`,
        this.partialPath,
        'write',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Clean up partial file (for failed downloads)
   */
  async cleanupPartialFile(): Promise<void> {
    if (!this.partialPath) {
      return; // Nothing to clean up
    }

    try {
      await fsp.unlink(this.partialPath);
      this.logger.debug(`Cleaned up partial file: ${this.partialPath}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        this.logger.warn(`Failed to clean up partial file: ${error.message}`);
      }
    }
  }

  /**
   * Dispose of this manager and clean up resources
   */
  dispose(): void {
    if (this.disposed) return;

    this.logger.debug('Disposing FileManager');
    this.disposed = true;

    // Clear sensitive data
    this.finalPath = undefined;
    this.partialPath = undefined;
  }

  get filePath(): string | undefined {
    return this.partialPath;
  }

  get finalFilePath(): string | undefined {
    return this.finalPath;
  }

  get partialFilePath(): string | undefined {
    return this.partialPath;
  }

  /**
   * Check if manager is configured
   */
  get isConfigured(): boolean {
    return !!(this.finalPath && this.partialPath);
  }
}
