import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Target } from './target.model';

@ObjectType()
export class AppConfig {
  @Field(() => Int)
  port: number;

  @Field(() => String)
  host: string;

  @Field(() => Int)
  putioClientId: number;

  @Field(() => String)
  putioClientSecret: string;

  @Field(() => String)
  putioAuth: string;

  @Field(() => Boolean)
  watcherEnabled: boolean;

  @Field(() => [Target])
  watcherTargets: Target[];

  @Field(() => Boolean)
  downloaderEnabled: boolean;

  @Field(() => [Target])
  downloaderTargets: Target[];

  @Field(() => Int)
  downloaderChunkSize: number;

  @Field(() => Int)
  putioWatcherSocket: boolean;

  @Field(() => Int)
  putioWebhooksEnabled: boolean;

  @Field(() => String, { nullable: true })
  putioCheckCronSchedule?: string;

  @Field(() => Int)
  putioCheckAtStartup: boolean;

  @Field(() => Int)
  uiProgressUpdateInterval: number;

  @Field(() => Int)
  concurrentGroups: number;

  @Field(() => Int)
  concurrentSmallFiles: number;

  @Field(() => Int)
  concurrentLargeFiles: number;

  @Field(() => Boolean)
  downloaderPerformanceMonitoringEnabled: boolean;

  @Field(() => Int)
  downloaderPerformanceMonitoringTime: number;

  @Field(() => Int)
  downloaderPerformanceMonitoringSpeed: number;
}
