import { Field, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLBigInt } from 'graphql-scalars';
import { HistogramDto } from './histogram.dto';
import { FragmentDto } from '../../downloader';

@ObjectType()
export class FragmentStatsDto {
  @Field(() => Int)
  start: number;

  @Field(() => Int)
  end: number;

  @Field(() => GraphQLBigInt)
  downloadedBytes: number;
}

@ObjectType()
export class WorkerStatsDto {
  @Field(() => String)
  id: string;

  @Field(() => GraphQLBigInt)
  speed: number;

  @Field(() => GraphQLBigInt)
  downloadedBytes: number;
}

@ObjectType()
export class ItemStatsDto {
  @Field(() => Int)
  itemId: number;

  @Field(() => Date, { nullable: true })
  startedAt?: Date;

  @Field(() => Date, { nullable: true })
  restartedAt?: Date;

  @Field(() => GraphQLBigInt)
  downloadedBytes: number;

  @Field(() => GraphQLBigInt)
  bytesSinceLastEvent: number;

  @Field(() => GraphQLBigInt)
  speed: number;

  @Field(() => [FragmentDto])
  fragments: FragmentDto[];

  @Field(() => HistogramDto, { nullable: true })
  histogram?: HistogramDto;

  @Field(() => [WorkerStatsDto])
  workers: WorkerStatsDto[];
}

