import { GroupModel } from '../models';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CreatePutioDownloadResultDto {
  @Field(() => Boolean)
  success: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => GroupModel, { nullable: true })
  group?: GroupModel;
}
