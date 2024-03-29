import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TargetModel {
  @Field(() => Int)
  targetId: number;

  @Field(() => String, { nullable: true })
  targetPath?: string;

  @Field(() => String)
  path: string;
}
