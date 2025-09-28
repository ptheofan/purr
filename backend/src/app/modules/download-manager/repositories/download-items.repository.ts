import { Injectable } from '@nestjs/common';
import { Item } from '../entities';
import { Repository } from '../../../generics';

/**
 * Repository for managing download items.
 * 
 * Provides thread-safe operations for storing and retrieving download items.
 * All returned items are deep copies to prevent external mutations.
 * Use the update method to modify stored entities.
 */
@Injectable()
export class DownloadItemsRepository extends Repository<Item, 'id'> {
  /**
   * Checks if an item matches the given ID.
   * @param item The item to check
   * @param id The ID to match against
   * @returns True if the item's ID matches
   */
  protected dataEquals(item: Item, id: number): boolean {
    return item.id === id;
  }

  /**
   * Extracts the unique key from an item.
   * @param item The item to extract the key from
   * @returns The item's ID as the key
   */
  protected getKey(item: Item): number {
    return item.id;
  }

  /**
   * Creates a shallow copy of an item to prevent external mutations.
   * @param item The item to copy
   * @returns A copy of the item
   */
  protected copyItem(item: Item): Item {
    return { ...item };
  }
}
