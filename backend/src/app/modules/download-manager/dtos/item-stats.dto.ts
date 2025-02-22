import { Field, Int, ObjectType } from '@nestjs/graphql';
import { HistogramDto } from './histogram.dto';
import { FragmentDto, FragmentStatus, WorkerState } from '../../downloader';

@ObjectType()
export class FragmentStatsDto {
  @Field(() => Int)
  start: number;

  @Field(() => Int)
  end: number;

  @Field(() => FragmentStatus)
  downloadedBytes: number;
}

@ObjectType()
export class WorkerStatsDto {
  @Field(() => String)
  id: string;

  @Field(() => WorkerState)
  state: WorkerState;

  @Field(() => Int)
  speed: number;

  @Field(() => Int)
  downloadedBytes: number;

  @Field(() => FragmentStatsDto, { nullable: true })
  fragmentStats?: FragmentStatsDto;
}

@ObjectType()
export class ItemStatsDto {
  @Field(() => Int)
  itemId: number;

  @Field(() => Date, { nullable: true })
  startedAt?: Date;

  @Field(() => Date, { nullable: true })
  restartedAt?: Date;

  @Field(() => Int)
  downloadedBytes: number;

  @Field(() => Int)
  bytesSinceLastEvent: number;

  @Field(() => Int)
  speed: number;

  @Field(() => [FragmentDto])
  fragments: FragmentDto[];

  @Field(() => HistogramDto, { nullable: true })
  histogram?: HistogramDto;

  @Field(() => [WorkerStatsDto])
  workers: WorkerStatsDto[];
}

