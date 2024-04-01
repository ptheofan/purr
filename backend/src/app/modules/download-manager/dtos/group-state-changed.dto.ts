import { Field, ObjectType } from '@nestjs/graphql';
import { GroupState } from '../enums';

@ObjectType()
export class GroupStateChangedDto {
  @Field(() => Number)
  id: number;

  @Field(() => GroupState)
  state: GroupState;
}
