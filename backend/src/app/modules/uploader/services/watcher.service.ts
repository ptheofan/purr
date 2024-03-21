import { Injectable, Logger } from '@nestjs/common';
import * as chokidar from 'chokidar';
import { CreateUploadDto, CreateWatcherDto } from '../dtos';
import { UploaderService } from './uploader.service';
import { PutioService } from '../../putio';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class WatcherService {
  private readonly logger = new Logger(WatcherService.name);
  constructor(
    private readonly putio: PutioService,
    private readonly upload: UploaderService,
  ) {}

  /**
   * Monitor a folder for new files and upload them to put.io
   * Will also scan the folder for existing files on startup
   */
  async monitorFolder(dto: CreateWatcherDto): Promise<void> {
    const file = await this.putio.getFile(dto.targetId);
    const absolutePath = path.resolve(dto.path);

    if (!file) {
      throw new Error(`The target upload folderId is invalid (${dto.targetId}).`);
    }

    // Scan the folder for existing files
    await this.scanFolder(dto.targetId, dto.path);

    // Start watching the folder
    this.logger.log(
      `Watching ${absolutePath}`,
    );

    chokidar.watch(dto.path).on('all', async (event, path) => {
      if (event === 'add' || event === 'change') {
        if (this.upload.isAcceptableUploadType(path)) {
          try {
            const uploadDto = new CreateUploadDto();
            uploadDto.file = path;
            uploadDto.targetId = dto.targetId;
            await this.upload.createUpload(uploadDto);
            // delete the file after upload
            fs.unlinkSync(path);
            this.logger.log(`File ${path} uploaded and deleted`);
          } catch (ignored) { }
        }
      }
    });
  }

  protected async scanFolder(targetId: number, localFolder: string): Promise<void> {
    try {
      // Scan the folder for existing files using nodejs fs
      const files = fs.readdirSync(localFolder);
      for (const file of files) {
        const absolutePath = path.resolve(localFolder, file);
        if (this.upload.isAcceptableUploadType(absolutePath)) {
          const uploadDto = new CreateUploadDto();
          uploadDto.file = localFolder;
          uploadDto.targetId = targetId;
          await this.upload.createUpload(uploadDto);
        }
      }
    } catch (err) {
      // log and ignore the error
      this.logger.error(`ScanFolder ${localFolder} failed, error: ${err.message}`, err.stack);
    }
  }
}
