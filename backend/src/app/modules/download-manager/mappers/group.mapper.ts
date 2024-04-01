import { Injectable } from '@nestjs/common';
import { Group } from '../entities';
import { GroupDto } from '../dtos';

@Injectable()
export class GroupMapper {
  entityToDto(group: Group): GroupDto {
    return {
      id: group.id,
      addedAt: group.addedAt,
      name: group.name,
      saveAt: group.saveAt,
      status: group.status,
      state: group.state,
    };
  }
}
