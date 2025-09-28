import { Injectable } from '@nestjs/common';
import { Item } from '../entities';
import { ItemDto } from '../dtos';

/**
 * Mapper service for converting Item entities to ItemDto objects.
 * Follows NestJS best practices for dependency injection and service design.
 */
@Injectable()
export class ItemMapper {
  /**
   * Converts an Item entity to an ItemDto for GraphQL responses.
   * 
   * @param item - The Item entity to convert
   * @returns The corresponding ItemDto object
   */
  entityToDto(item: Item): ItemDto {
    return {
      id: item.id,
      groupId: item.groupId,
      name: item.name,
      size: item.size,
      crc32: item.crc32,
      relativePath: item.relativePath,
      downloadLink: item.downloadLink,
      status: item.status,
      error: item.error,
    };
  }
}
