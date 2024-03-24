import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Target {
  @Field(() => Int)
  targetId: number;

  @Field(() => String)
  path: string;
}
