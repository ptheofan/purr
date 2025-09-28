import { Injectable } from '@nestjs/common';
import { Group } from '../entities';
import { GroupDto } from '../dtos';

/**
 * Maps Group entities to GroupDto objects for GraphQL responses.
 * Handles the transformation between internal domain models and API contracts.
 */
@Injectable()
export class GroupMapper {
  /**
   * Converts a Group entity to a GroupDto for API responses.
   * @param group - The Group entity to convert
   * @returns The corresponding GroupDto object
   * @throws Error if group is null or undefined
   */
  entityToDto(group: Group): GroupDto {
    if (!group) {
      throw new Error('Group entity cannot be null or undefined');
    }

    return {
      id: group.id,
      addedAt: group.addedAt,
      name: group.name,
      saveAt: group.saveAt,
      status: group.status,
      state: group.state,
      // items field is handled separately by resolvers when needed
    };
  }
}
