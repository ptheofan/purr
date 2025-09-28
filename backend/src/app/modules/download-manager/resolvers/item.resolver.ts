import { Args, Int, Query, Resolver, Subscription } from '@nestjs/graphql';
import { DownloadItemsRepository } from '../repositories';
import { ItemDto, ItemStatsDto, ItemStatusChangedDto } from '../dtos';
import { Inject, NotFoundException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PubKeys } from '../enums';
import { PUB_SUB } from '../../subscriptions';

/**
 * Resolver for managing download items
 * Handles queries and subscriptions for individual download items
 */
@Resolver(() => ItemDto)
export class ItemResolver {
  constructor(
    private readonly itemRepo: DownloadItemsRepository,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  /**
   * Retrieves all download items
   * @returns Array of all download items
   */
  @Query(() => [ItemDto])
  async getItems(): Promise<ItemDto[]> {
    return this.itemRepo.getAll();
  }

  /**
   * Retrieves a specific download item by ID
   * @param id - The ID of the item to retrieve
   * @returns The download item
   * @throws NotFoundException if item is not found
   */
  @Query(() => ItemDto)
  async getItem(@Args('id', { type: () => Int }) id: number): Promise<ItemDto> {
    const item = await this.itemRepo.find(item => item.id === id);
    
    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }
    
    return item;
  }

  /**
   * Subscription for item status changes
   * @returns Async iterator for item status change events
   */
  @Subscription(() => ItemStatusChangedDto)
  itemStatusChanged() {
    return this.pubSub.asyncIterator(PubKeys.itemStatusChanged);
  }

  /**
   * Subscription for item stats updates
   * @returns Async iterator for item stats update events
   */
  @Subscription(() => ItemStatsDto)
  itemStatsUpdated() {
    return this.pubSub.asyncIterator(PubKeys.itemStatsUpdated);
  }
}
