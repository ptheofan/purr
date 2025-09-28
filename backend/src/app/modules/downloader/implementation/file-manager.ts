import { open, FileHandle } from 'fs/promises';
import * as path from 'path';
import * as fsp from 'node:fs/promises';
import { Logger } from '@nestjs/common';
import { FileSystemError } from '../errors/download.errors';

export class FileManager {
  private readonly logger = new Logger(FileManager.name);
  private saveAs?: string;
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

    this.saveAs = saveAs;
    this.logger.debug(`FileManager configured for: ${saveAs}`);
  }

  async initializeFile(totalBytes: number): Promise<void> {
    if (!this.saveAs) {
      throw new Error('FileManager not configured. Call configure() first.');
    }
    if (this.disposed) {
      throw new FileSystemError('Cannot initialize file on disposed FileManager', this.saveAs, 'create');
    }

    if (totalBytes < 0) {
      throw new FileSystemError('Total bytes cannot be negative', this.saveAs, 'create');
    }

    try {
      const saveAsDir = path.dirname(this.saveAs);

      // Create directory if it doesn't exist
      await fsp.mkdir(saveAsDir, { recursive: true });
      this.logger.debug(`Created directory: ${saveAsDir}`);

      // Create and initialize file with specified size
      const createHandle = await open(this.saveAs, 'w+');
      await createHandle.truncate(totalBytes);
      await createHandle.close();

      this.logger.log(`Initialized file: ${this.saveAs} (${totalBytes} bytes)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to initialize file: ${errorMessage}`);

      throw new FileSystemError(
        `Failed to initialize file: ${errorMessage}`,
        this.saveAs,
        'create',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async openFileForWriting(): Promise<FileHandle> {
    if (!this.saveAs) {
      throw new Error('FileManager not configured. Call configure() first.');
    }
    if (this.disposed) {
      throw new FileSystemError('Cannot open file on disposed FileManager', this.saveAs, 'write');
    }

    try {
      const fileHandle = await open(this.saveAs, 'r+');
      this.logger.debug(`Opened file for writing: ${this.saveAs}`);
      return fileHandle;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to open file for writing: ${errorMessage}`);

      throw new FileSystemError(
        `Failed to open file for writing: ${errorMessage}`,
        this.saveAs,
        'write',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Check if file exists and get its size
   */
  async getFileInfo(): Promise<{ exists: boolean; size?: number }> {
    if (!this.saveAs) {
      throw new Error('FileManager not configured. Call configure() first.');
    }

    try {
      const stats = await fsp.stat(this.saveAs);
      return { exists: true, size: stats.size };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { exists: false };
      }
      throw new FileSystemError(
        `Failed to get file info: ${error.message}`,
        this.saveAs,
        'read',
        undefined,
        error
      );
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
    this.saveAs = undefined;
  }

  get filePath(): string | undefined {
    return this.saveAs;
  }

  /**
   * Check if manager is configured
   */
  get isConfigured(): boolean {
    return !!this.saveAs;
  }
}
