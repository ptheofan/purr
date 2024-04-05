import { Args, Int, Query, Resolver, Subscription } from '@nestjs/graphql';
import { DownloadItemsRepository } from '../repositories';
import { ItemDto, ItemStatsDto, ItemStatusChangedDto } from '../dtos';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PubKeys } from '../enums';
import { PUB_SUB } from '../../subscriptions';

@Resolver(() => ItemDto)
export class ItemResolver {
  constructor(
    private readonly itemRepo: DownloadItemsRepository,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {
  }

  @Query(() => [ItemDto])
  async getItems(): Promise<ItemDto[]> {
    return this.itemRepo.getAll();
  }

  @Query(() => ItemDto)
  async getItem(@Args('id', { type: () => Int }) id: number): Promise<ItemDto> {
    return this.itemRepo.find(item => item.id === id);
  }

  @Subscription(() => ItemStatusChangedDto)
  itemStatusChanged() {
    return this.pubSub.asyncIterator(PubKeys.itemStatusChanged);
  }

  @Subscription(() => ItemStatsDto)
  itemStatsUpdated() {
    return this.pubSub.asyncIterator(PubKeys.itemStatsUpdated);
  }
}
