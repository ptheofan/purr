import { Field, ObjectType } from '@nestjs/graphql';
import { GroupDto } from './group.dto';

@ObjectType()
export class CreatePutioDownloadResultDto {
  @Field(() => Boolean)
  success: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => GroupDto, { nullable: true })
  group?: GroupDto;
}
