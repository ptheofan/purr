import { Args, Int, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { DownloadGroupsRepository, DownloadItemsRepository } from '../repositories';
import { GroupDto, GroupStateChangedDto, GroupStatusChangedDto, ItemDto } from '../dtos';
import { PubKeys } from '../enums';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../../subscriptions';

@Resolver(() => GroupDto)
export class GroupResolver {
  constructor(
    private readonly groupRepo: DownloadGroupsRepository,
    private readonly itemRepo: DownloadItemsRepository,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {
  }

  @Query(() => [GroupDto])
  async getGroups(): Promise<GroupDto[]> {
    return this.groupRepo.getAll();
  }

  @Query(() => GroupDto)
  async getGroup(@Args('id', { type: () => Int }) id: number): Promise<GroupDto|null> {
    return this.groupRepo.find(group => group.id === id);
  }

  @ResolveField()
  async items(@Parent() group: GroupDto): Promise<ItemDto[]> {
    return this.itemRepo.filter(item => item.groupId === group.id);
  }

  @Subscription(() => GroupStateChangedDto)
  groupStateChanged() {
    return this.pubSub.asyncIterator(PubKeys.groupStateChanged);
  }

  @Subscription(() => GroupStatusChangedDto)
  groupStatusChanged() {
    return this.pubSub.asyncIterator(PubKeys.groupStatusChanged);
  }

  @Subscription(() => GroupDto)
  groupAdded() {
    return this.pubSub.asyncIterator(PubKeys.groupAdded);
  }
}
