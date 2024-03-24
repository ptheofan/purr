import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { GroupModel, ItemModel } from '../models';
import { DownloadGroupsRepository, DownloadItemsRepository } from '../repositories';

@Resolver(() => GroupModel)
export class GroupResolver {
  constructor(
    private readonly groupRepo: DownloadGroupsRepository,
    private readonly itemRepo: DownloadItemsRepository,
  ) {
  }

  @Query(() => [GroupModel])
  async groups(): Promise<GroupModel[]> {
    return this.groupRepo.getAll();
  }

  @ResolveField()
  async items(@Parent() group: GroupModel): Promise<ItemModel[]> {
    return this.itemRepo.filter(item => item.groupId === group.id);
  }
}
