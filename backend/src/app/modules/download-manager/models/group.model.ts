import { Field, ObjectType } from '@nestjs/graphql';
import { DownloadStatus } from '../enums';
import { ItemModel } from './item.model';
import { GroupState } from '../enums/group-state.enum';


@ObjectType('Group', { description: 'A group represents a set of files that should be downloaded together.' })
export class GroupModel {
  @Field(() => Number)
  id: number;

  @Field()
  name: string;

  @Field(() => Date)
  addedAt: Date;

  @Field()
  saveAt: string;

  @Field(() => DownloadStatus)
  status: DownloadStatus;

  @Field(() => GroupState)
  state: GroupState;

  @Field(() => [ItemModel])
  items?: ItemModel[];
}
