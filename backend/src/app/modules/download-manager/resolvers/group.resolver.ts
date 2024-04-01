import { Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { DownloadGroupsRepository, DownloadItemsRepository } from '../repositories';
import { GroupDto, GroupStateChangedDto, ItemDto } from '../dtos';
import { PubKeys } from '../enums';
import { Inject } from '@nestjs/common';
import { PUB_SUB } from '../../../helpers';
import { PubSub } from 'graphql-subscriptions';

@Resolver(() => GroupDto)
export class GroupResolver {
  constructor(
    private readonly groupRepo: DownloadGroupsRepository,
    private readonly itemRepo: DownloadItemsRepository,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {
  }

  @Query(() => [GroupDto])
  async groups(): Promise<GroupDto[]> {
    return this.groupRepo.getAll();
  }

  @ResolveField()
  async items(@Parent() group: GroupDto): Promise<ItemDto[]> {
    return this.itemRepo.filter(item => item.groupId === group.id);
  }

  @Subscription(() => GroupStateChangedDto)
  groupStateChanged() {
    return this.pubSub.asyncIterator(PubKeys.groupStateChanged);
  }

  @Subscription(() => GroupDto)
  groupAdded() {
    return this.pubSub.asyncIterator(PubKeys.groupAdded);
  }
}
