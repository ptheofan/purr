import { Resolver } from '@nestjs/graphql';
import { AppConfigModel } from '../models';
import { AppConfigService } from '../services';
import { Query } from '@nestjs/graphql';

@Resolver(() => AppConfigModel)
export class AppConfigResolver {
  constructor(
    private readonly appConfigService: AppConfigService,
  ) {
  }

  @Query(() => AppConfigModel)
  async appConfig(): Promise<AppConfigModel> {
    return {
      port: this.appConfigService.port,
      host: this.appConfigService.host,
      putioClientId: this.appConfigService.putioClientId,
      putioClientSecret: this.appConfigService.putioClientSecret.slice(-4).padStart(this.appConfigService.putioClientSecret.length, '*'),
      putioAuth: this.appConfigService.putioAuth.slice(-4).padStart(this.appConfigService.putioAuth.length, '*'),
      watcherEnabled: this.appConfigService.watcherEnabled,
      watcherTargets: this.appConfigService.watcherTargets,
      downloaderEnabled: this.appConfigService.downloaderEnabled,
      downloaderTargets: this.appConfigService.downloaderTargets,
      downloaderChunkSize: this.appConfigService.downloaderChunkSize,
      putioWatcherSocket: this.appConfigService.putioWatcherSocket,
      putioWebhooksEnabled: this.appConfigService.putioWebhooksEnabled,
      putioCheckCronSchedule: this.appConfigService.putioCheckCronSchedule,
      putioCheckAtStartup: this.appConfigService.putioCheckAtStartup,
      uiProgressUpdateInterval: this.appConfigService.uiProgressUpdateInterval,
      concurrentGroups: this.appConfigService.concurrentGroups,
      concurrentSmallFiles: this.appConfigService.concurrentSmallFiles,
      concurrentLargeFiles: this.appConfigService.concurrentLargeFiles,
      downloaderPerformanceMonitoringEnabled: this.appConfigService.downloaderPerformanceMonitoringEnabled,
      downloaderPerformanceMonitoringTime: this.appConfigService.downloaderPerformanceMonitoringTime,
      downloaderPerformanceMonitoringSpeed: this.appConfigService.downloaderPerformanceMonitoringSpeed,
    };
  }
}
