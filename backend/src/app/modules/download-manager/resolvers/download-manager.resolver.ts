import { Args, Int, Mutation, Resolver, Subscription } from '@nestjs/graphql';
import { DownloadManagerService } from '../services';
import { PutioService } from '../../putio';
import { DownloadGroupsRepository } from '../repositories';
import { CreatePutioDownloadResultDto, DownloadManagerStatsDto } from '../dtos';
import { AppConfigService } from '../../configuration';
import { restrictFolderToRoot } from '../../../helpers';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PublisherService } from '../services/publisher.service';
import { PubKeys } from '../enums';
import { GroupMapper } from '../mappers';
import { PUB_SUB } from '../../subscriptions';

@Resolver()
export class DownloadManagerResolver {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly putioService: PutioService,
    private readonly downloadManagerService: DownloadManagerService,
    private readonly groupRepo: DownloadGroupsRepository,
    private readonly pubService: PublisherService,
    private readonly groupMapper: GroupMapper,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {
  }

  @Mutation(() => CreatePutioDownloadResultDto, { description: 'Create a new download from a put.io fileId' })
  async createDownloadFromPutio(
    @Args({ name: 'putioId', type: () => Int }) putioId: number,
    @Args({ name: 'saveAt', type: () => String }) saveAt: string,
  ): Promise<CreatePutioDownloadResultDto> {
    if (!this.appConfig.downloaderArbitraryDownloadsEnabled) {
      return {
        success: false,
        message: 'Arbitrary downloads are disabled by configuration.',
      };
    }

    let finalSaveAt: string;
    try {
      finalSaveAt = restrictFolderToRoot(saveAt, this.appConfig.downloaderArbitraryDownloadsRootFolder);
    } catch (e) {
      return {
        success: false,
        message: e.message,
      };
    }

    const vfs = await this.putioService.getVolume(putioId);
    const { analysisCompletedPromise, ...result} = await this.downloadManagerService.addVolume(vfs, finalSaveAt);

    if (result.success === false) {
      return {
        success: false,
        message: result.message,
      };
    }

    if (result.items > 0) {
      analysisCompletedPromise.then(async () => {
        const updatedGroup = await this.groupRepo.find(g => g.id === putioId);
        if (updatedGroup.state !== group.state) {
          await this.pubService.groupStateChanged({
            id: updatedGroup.id,
            state: updatedGroup.state
          });
          await this.downloadManagerService.start();
        }
      });
    }

    const group = await this.groupRepo.find(g => g.id === putioId);
    await this.pubService.groupAdded(this.groupMapper.entityToDto(group));
    return {
      success: true,
      group,
    };
  }

  @Subscription(() => DownloadManagerStatsDto)
  downloadManagerStats() {
    return this.pubSub.asyncIterator(PubKeys.downloadManagerStats);
  }
}
