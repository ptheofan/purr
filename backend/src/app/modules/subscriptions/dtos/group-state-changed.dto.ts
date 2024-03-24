import { Field, ObjectType } from '@nestjs/graphql';
import { GroupState } from '../../download-manager/enums/group-state.enum';

@ObjectType()
export class GroupStateChangedDto {
  @Field(() => Number)
  id: number;

  @Field(() => GroupState)
  state: GroupState;
}
