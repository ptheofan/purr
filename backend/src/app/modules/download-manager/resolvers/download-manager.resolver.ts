import { Args, Int, Mutation, Resolver } from '@nestjs/graphql';
import { DownloadManagerService } from '../services';
import { PutioService } from '../../putio';
import { DownloadGroupsRepository } from '../repositories';
import { CreatePutioDownloadResultDto } from '../dtos';

@Resolver()
export class DownloadManagerResolver {
  constructor(
    private readonly putioService: PutioService,
    private readonly downloadManagerService: DownloadManagerService,
    private readonly groupRepo: DownloadGroupsRepository,
  ) {
  }

  @Mutation(() => CreatePutioDownloadResultDto, { description: 'Create a new download from a put.io fileId' })
  async createDownloadFromPutio(
    @Args({ name: 'putioId', type: () => Int }) putioId: number,
    @Args({ name: 'saveAt', type: () => String }) saveAt: string,
  ): Promise<CreatePutioDownloadResultDto> {
    const vfs = await this.putioService.getVolume(putioId);
    const { analysisCompletedPromise, ...result} = await this.downloadManagerService.addVolume(vfs, saveAt);

    if (result.success === false) {
      return {
        success: false,
        message: result.message,
      };
    }

    if (result.items > 0) {
      analysisCompletedPromise.then(async () => {
        await this.downloadManagerService.start();
      });
    }

    const group = await this.groupRepo.find(g => g.id === putioId);
    return {
      success: true,
      group,
    };
  }
}
