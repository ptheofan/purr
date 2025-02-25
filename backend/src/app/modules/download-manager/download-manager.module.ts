import { forwardRef, Module } from '@nestjs/common';
import { DownloadGroupsRepository, DownloadItemsRepository } from './repositories';
import { DownloadManagerService, SubtitlesService } from './services';
import { DownloadFactory } from '../downloader';
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
    SubtitlesService,
    DownloadFactory,
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
    SubtitlesService,
  ],
})
export class DownloadManagerModule {}
