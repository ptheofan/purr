import { Module } from '@nestjs/common';
import { DownloadFactory } from './factories';

@Module({
  imports: [],
  controllers: [],
  providers: [DownloadFactory],
  exports: [DownloadFactory],
})
export class DownloaderModule {}
