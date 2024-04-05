import { Field, ObjectType } from '@nestjs/graphql';
import { DownloadStatus } from '../enums';

@ObjectType()
export class GroupStatusChangedDto {
  @Field(() => Number)
  id: number;

  @Field(() => DownloadStatus)
  status: DownloadStatus;
}
