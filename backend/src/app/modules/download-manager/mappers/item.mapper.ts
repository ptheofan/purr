import { Injectable } from '@nestjs/common';
import { Item } from '../entities';
import { ItemDto } from '../dtos';

@Injectable()
export class ItemMapper {
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
