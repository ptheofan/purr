import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLBigInt } from 'graphql-scalars';
import { HistogramDto } from './histogram.dto';

@ObjectType()
export class DownloadManagerStatsDto {
  @Field(() => Date)
  startedAt: Date;

  @Field(() => String)
  lifetimeBytes: string;

  @Field(() => GraphQLBigInt)
  speed: number;

  @Field(() => HistogramDto, { nullable: true })
  histogram?: HistogramDto;
}
