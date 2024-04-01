import { forwardRef, Module } from '@nestjs/common';
import { DownloadGroupsRepository, DownloadItemsRepository } from './repositories';
import { DownloadManagerService } from './services';
import { DownloaderFactory } from '../downloader';
import { PutioModule } from '../putio';
import { ConfigurationModule } from '../configuration';
import { DownloadManagerResolver, GroupResolver, ItemResolver } from './resolvers';
import { SubscriptionsModule } from '../subscriptions';
import { PublisherService } from './services/publisher.service';
import { GroupMapper, ItemMapper } from './mappers';

@Module({
  imports: [
    ConfigurationModule,
    forwardRef(() => PutioModule),
    SubscriptionsModule,
  ],
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
    PublisherService,
    GroupMapper,
    ItemMapper,
  ],
  exports: [
    DownloadManagerService,
    DownloadGroupsRepository,
    DownloadItemsRepository,
  ],
})
export class DownloadManagerModule {}
