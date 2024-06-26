import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TargetModel } from './target.model';

@ObjectType('AppConfig', { description: 'The app configuration.' })
export class AppConfigModel {
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

  @Field(() => [TargetModel])
  watcherTargets: TargetModel[];

  @Field(() => Boolean)
  downloaderEnabled: boolean;

  @Field(() => [TargetModel])
  downloaderTargets: TargetModel[];

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
