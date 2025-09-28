import { Args, Int, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { DownloadGroupsRepository, DownloadItemsRepository } from '../repositories';
import { GroupDto, GroupStateChangedDto, GroupStatusChangedDto, ItemDto } from '../dtos';
import { PubKeys } from '../enums';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from '../../subscriptions';

/**
 * GraphQL resolver for managing download groups
 * Handles queries, field resolvers, and subscriptions for group-related operations
 */
@Resolver(() => GroupDto)
export class GroupResolver {
  constructor(
    private readonly groupRepo: DownloadGroupsRepository,
    private readonly itemRepo: DownloadItemsRepository,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  /**
   * Retrieves all download groups
   * @returns Promise resolving to an array of all groups
   */
  @Query(() => [GroupDto])
  async getGroups(): Promise<GroupDto[]> {
    return this.groupRepo.getAll();
  }

  /**
   * Retrieves a specific download group by ID
   * @param id - The unique identifier of the group
   * @returns Promise resolving to the group or null if not found
   */
  @Query(() => GroupDto, { nullable: true })
  async getGroup(@Args('id', { type: () => Int }) id: number): Promise<GroupDto | null> {
    const group = await this.groupRepo.find(group => group.id === id);
    return group || null;
  }

  /**
   * Resolves the items field for a group
   * @param group - The parent group object
   * @returns Promise resolving to an array of items belonging to the group
   */
  @ResolveField(() => [ItemDto])
  async items(@Parent() group: GroupDto): Promise<ItemDto[]> {
    return this.itemRepo.filter(item => item.groupId === group.id);
  }

  /**
   * Subscription for group state changes
   * @returns AsyncIterator for group state change events
   */
  @Subscription(() => GroupStateChangedDto)
  groupStateChanged() {
    return this.pubSub.asyncIterator(PubKeys.groupStateChanged);
  }

  /**
   * Subscription for group status changes
   * @returns AsyncIterator for group status change events
   */
  @Subscription(() => GroupStatusChangedDto)
  groupStatusChanged() {
    return this.pubSub.asyncIterator(PubKeys.groupStatusChanged);
  }

  /**
   * Subscription for new group additions
   * @returns AsyncIterator for group added events
   */
  @Subscription(() => GroupDto)
  groupAdded() {
    return this.pubSub.asyncIterator(PubKeys.groupAdded);
  }
}
