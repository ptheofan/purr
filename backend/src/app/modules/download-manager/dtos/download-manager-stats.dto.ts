import { Field, Int, ObjectType } from '@nestjs/graphql';
import { HistogramDto } from './histogram.dto';

@ObjectType()
export class DownloadManagerStatsDto {
  @Field(() => Date)
  startedAt: Date;

  @Field(() => Int)
  lifetimeBytes: number;

  @Field(() => Int)
  speed: number;

  @Field(() => HistogramDto, { nullable: true })
  histogram?: HistogramDto;
}
