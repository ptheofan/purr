import { forwardRef, Module } from '@nestjs/common';
import { DownloadGroupsRepository, DownloadItemsRepository } from './repositories';
import { DownloadManagerService } from './services';
import { DownloaderFactory } from '../downloader';
import { PutioModule } from '../putio';
import { ConfigurationModule } from '../configuration';
import { DownloadManagerResolver, GroupResolver, ItemResolver } from './resolvers';

@Module({
  imports: [ConfigurationModule, forwardRef(() => PutioModule)],
  controllers: [],
  providers: [
    DownloadManagerService,
    DownloadGroupsRepository,
    DownloaderFactory,
    DownloadGroupsRepository,
    DownloadItemsRepository,
    GroupResolver,
    ItemResolver,
    DownloadManagerResolver,
  ],
  exports: [
    DownloadManagerService,
    DownloadGroupsRepository,
    DownloadItemsRepository,
  ],
})
export class DownloadManagerModule {}
