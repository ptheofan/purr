import { Query, Resolver, Subscription } from '@nestjs/graphql';
import { DownloadItemsRepository } from '../repositories';
import { ItemDto, ItemStatusChangedDto } from '../dtos';
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
  async items(): Promise<ItemDto[]> {
    return this.itemRepo.getAll();
  }

  @Subscription(() => ItemStatusChangedDto)
  itemStatusChanged() {
    return this.pubSub.asyncIterator(PubKeys.itemStatusChanged);
  }
}
