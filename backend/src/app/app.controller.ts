import { Controller, Get, Logger, Param } from '@nestjs/common';
import { PutioService } from './modules';
import { DownloadManagerService } from './modules/download-manager/services';

@Controller('/api')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly putioService: PutioService,
    private readonly downloadManagerService: DownloadManagerService,
  ) {
  }

  @Get('download/:objectId')
  async download(@Param('objectId') objectId: number) {
    try {
      this.logger.log(`Downloading ${ objectId }`);
      const vfs = await this.putioService.getVolume(objectId);
      if (!vfs) {
        return { error: 'Could not create volume' };
      }
      this.logger.log(`Adding volume... ${ objectId }`);
      await this.downloadManagerService.addVolume(vfs, '/Users/ptheofan/Sites/purr/data/shows/downloads');

      this.logger.log(`Starting... ${ objectId }`);
      await this.downloadManagerService.start();
    } catch (err) {
      return { error: err.message };
    }
  }

  @Get('link/:objectId')
  async getDownloadLink(@Param('objectId') objectId: number) {
    const link = await this.putioService.getDownloadLinks([objectId]);
    return link;
  }

  @Get('file/delete/:objectId')
  async deleteFile(@Param('objectId') objectId: number) {
    await this.putioService.deleteFile(objectId);
  }

  @Get('file/:objectId')
  async getFileInfo(@Param('objectId') objectId: number) {
    const file = await this.putioService.getFile(objectId);
    return file;
  }

  @Get('fs/:objectId')
  async fs(@Param('objectId') objectId: number) {
    const x = await this.putioService.getVolume(objectId);

    console.log(x.toTree());
    return x.toJSON();
  }

  @Get('queue/:objectId')
  async queue(@Param('objectId') objectId: number) {
    const x = await this.putioService.getVolume(objectId);
    await this.downloadManagerService.addVolume(x, '/Users/ptheofan/Sites/purr/data/shows/downloads');
    return 'ok';
  }
}
