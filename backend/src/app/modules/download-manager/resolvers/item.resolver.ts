import { Query, Resolver } from '@nestjs/graphql';
import { ItemModel } from '../models';
import { DownloadItemsRepository } from '../repositories';

@Resolver(() => ItemModel)
export class ItemResolver {
  constructor(
    private readonly itemRepo: DownloadItemsRepository,
  ) {
  }

  @Query(() => [ItemModel])
  async items(): Promise<ItemModel[]> {
    return this.itemRepo.getAll();
  }
}
