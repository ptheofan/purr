import { Injectable } from '@nestjs/common';
import { Group } from '../entities';
import { Repository } from '../../../generics';

/**
 * Repository for managing download groups.
 * 
 * This repository provides thread-safe operations for managing Group entities.
 * All returned entities are deep copies to prevent external mutations.
 * Use the update method to modify stored entities.
 * 
 * @extends Repository<Group, 'id'>
 */
@Injectable()
export class DownloadGroupsRepository extends Repository<Group, 'id'> {
  /**
   * Checks if a group matches the given ID.
   * @param item The group to check
   * @param id The ID to match against
   * @returns True if the group ID matches
   */
  protected dataEquals(item: Group, id: number): boolean {
    return item.id === id;
  }

  /**
   * Extracts the key (ID) from a group.
   * @param item The group to extract the key from
   * @returns The group's ID
   */
  protected getKey(item: Group): number {
    return item.id;
  }

  /**
   * Creates a deep copy of a group to prevent external mutations.
   * @param item The group to copy
   * @returns A deep copy of the group with a new Date instance
   */
  protected copyItem(item: Group): Group {
    return { ...item, addedAt: new Date(item.addedAt) };
  }

  /**
   * Gets the sort order (index) of a group by its ID.
   * 
   * This method is optimized to use the internal index map for O(1) lookup
   * instead of O(n) array search when possible.
   * 
   * @param id The group ID to find
   * @returns The index of the group, or -1 if not found
   */
  async getSortOrderOf(id: number): Promise<number> {
    return this.withLock(() => {
      const index = this.index.get(id);
      return index !== undefined ? index : -1;
    });
  }
}
