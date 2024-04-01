import { Query, Resolver } from '@nestjs/graphql';
import { DownloadItemsRepository } from '../repositories';
import { ItemDto } from '../dtos';

@Resolver(() => ItemDto)
export class ItemResolver {
  constructor(
    private readonly itemRepo: DownloadItemsRepository,
  ) {
  }

  @Query(() => [ItemDto])
  async items(): Promise<ItemDto[]> {
    return this.itemRepo.getAll();
  }
}
