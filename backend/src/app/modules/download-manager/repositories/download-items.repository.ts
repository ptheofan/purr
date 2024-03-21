import { Injectable } from '@nestjs/common';
import { Item } from '../entities';
import { Repository } from '../../../generics';

/**
 * A repository for managing download groups
 * Will always return a deep copy of the entity.
 * Modifying the returned entity will not affect the stored entity.
 * Use the update method to modify the stored entity.
 */
@Injectable()
export class DownloadItemsRepository extends Repository<Item, 'id'>{
  protected dataEquals(item: Item, id: number): boolean {
    return item.id === id;
  }
}
