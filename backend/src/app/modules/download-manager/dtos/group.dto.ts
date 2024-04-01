import { Field, ObjectType } from '@nestjs/graphql';
import { DownloadStatus } from '../enums';
import { ItemDto } from './item.dto';
import { GroupState } from '../enums';


@ObjectType('Group', { description: 'A group represents a set of files that should be downloaded together.' })
export class GroupDto {
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

  @Field(() => [ItemDto], { nullable: true })
  items?: ItemDto[];
}
