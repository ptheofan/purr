import { forwardRef, Module } from '@nestjs/common';
import { DownloadGroupsRepository, DownloadItemsRepository } from './repositories';
import { DownloadManagerService } from './services';
import { DownloaderFactory } from '../downloader';
import { PutioModule } from '../putio';
import { ConfigurationModule } from '../configuration';

@Module({
  imports: [ConfigurationModule, forwardRef(() => PutioModule)],
  controllers: [],
  providers: [
    DownloadManagerService,
    DownloadGroupsRepository,
    DownloaderFactory,
    DownloadGroupsRepository,
    DownloadItemsRepository,
  ],
  exports: [
    DownloadManagerService,
    DownloadGroupsRepository,
    DownloadItemsRepository,
  ],
})
export class DownloadManagerModule {}
