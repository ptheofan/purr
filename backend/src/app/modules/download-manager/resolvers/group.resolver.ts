import { Args, Int, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { DownloadGroupsRepository, DownloadItemsRepository } from '../repositories';
import { GroupDto, GroupStateChangedDto, GroupStatusChangedDto, ItemDto } from '../dtos';
import { PubKeys } from '../enums';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../../subscriptions';
import { GroupMapper } from '../mappers';

@Resolver(() => GroupDto)
export class GroupResolver {
  constructor(
    private readonly groupRepo: DownloadGroupsRepository,
    private readonly itemRepo: DownloadItemsRepository,
    private readonly groupMapper: GroupMapper,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => [GroupDto])
  async getGroups(): Promise<GroupDto[]> {
    const groups = await this.groupRepo.getAll();
    return groups.map(group => this.groupMapper.entityToDto(group));
  }

  @Query(() => GroupDto, { nullable: true })
  async getGroup(@Args('id', { type: () => Int }) id: number): Promise<GroupDto | null> {
    const group = await this.groupRepo.find(group => group.id === id);
    return group ? this.groupMapper.entityToDto(group) : null;
  }

  @ResolveField(() => [ItemDto])
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
