import { Module } from '@nestjs/common';
import { DownloaderFactory } from './factories';

@Module({
  imports: [],
  controllers: [],
  providers: [DownloaderFactory],
  exports: [DownloaderFactory],
})
export class DownloaderModule {}
