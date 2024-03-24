import { Resolver } from '@nestjs/graphql';
import { AppConfig } from '../models';
import { AppConfigService } from '../services';
import { Query } from '@nestjs/graphql';

@Resolver(() => AppConfig)
export class AppConfigResolver {
  constructor(
    private readonly appConfigService: AppConfigService,
  ) {
  }

  @Query(() => AppConfig)
  async appConfig(): Promise<AppConfig> {
    return {
      port: this.appConfigService.port,
      host: this.appConfigService.host,
      putioClientId: this.appConfigService.putioClientId,
      putioClientSecret: this.appConfigService.putioClientSecret,
      putioAuth: this.appConfigService.putioAuth,
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
