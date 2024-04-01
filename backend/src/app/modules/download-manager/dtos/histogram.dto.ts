import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class HistogramDto {
  @Field(() => Date)
  since: Date;

  @Field(() => Date)
  until: Date;

  @Field(() => Number, { description: 'The granularity of the histogram in seconds. ie. 60 means each values[x] represents 1 minute of data' })
  granularity: number;

  @Field(() => [Number])
  values: number[];
}
