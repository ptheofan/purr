import { Field, Int, ObjectType } from '@nestjs/graphql';
import { DownloadStatus } from '../enums';

@ObjectType('Item', { description: 'An item represents a file that should be downloaded.' })
export class ItemDto {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  groupId: number;

  @Field()
  name: string;

  @Field(() => Int)
  size: number;

  @Field({ nullable: true })
  crc32: string | null;

  @Field()
  relativePath: string;

  @Field({ nullable: true })
  downloadLink?: string;

  @Field(() => DownloadStatus)
  status: DownloadStatus;

  @Field({ nullable: true })
  error?: string;
}
