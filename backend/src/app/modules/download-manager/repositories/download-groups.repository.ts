import { Injectable } from '@nestjs/common';
import { Group } from '../entities';
import { Repository } from '../../../generics';

/**
 * A repository for managing download groups
 * Will always return a deep copy of the entity.
 * Modifying the returned entity will not affect the stored entity.
 * Use the update method to modify the stored entity.
 */
@Injectable()
export class DownloadGroupsRepository extends Repository<Group, 'id'> {
  protected dataEquals(item: Group, id: number): boolean {
      return item.id === id;
  }

  async getSortOrderOf(id: number): Promise<number> {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) {
      return -1;
    }

    return index;
  }
}
