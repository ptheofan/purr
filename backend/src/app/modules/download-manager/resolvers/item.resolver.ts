import { Args, Int, Query, Resolver, Subscription } from '@nestjs/graphql';
import { DownloadItemsRepository } from '../repositories';
import { ItemDto, ItemStatsDto, ItemStatusChangedDto } from '../dtos';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PubKeys } from '../enums';
import { PUB_SUB } from '../../subscriptions';
import { ItemMapper } from '../mappers';

@Resolver(() => ItemDto)
export class ItemResolver {
  constructor(
    private readonly itemRepo: DownloadItemsRepository,
    private readonly itemMapper: ItemMapper,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => [ItemDto])
  async getItems(): Promise<ItemDto[]> {
    const items = await this.itemRepo.getAll();
    return items.map(item => this.itemMapper.entityToDto(item));
  }

  @Query(() => ItemDto, { nullable: true })
  async getItem(@Args('id', { type: () => Int }) id: number): Promise<ItemDto | null> {
    const item = await this.itemRepo.find(item => item.id === id);
    return item ? this.itemMapper.entityToDto(item) : null;
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
