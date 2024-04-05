import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum FragmentStatus {
  pending = 'pending', // Work not started (not downloaded)
  finished = 'finished', // Work completed (downloaded)
  reserved = 'reserved', // Work in progress (do not touch)
}

registerEnumType(FragmentStatus, {
  name: 'FragmentStatus',
});

@ObjectType()
export class FragmentDto {
  @Field(() => Int)
  start: number;

  @Field(() => Int)
  end: number;

  @Field(() => FragmentStatus)
  status: FragmentStatus;
}
