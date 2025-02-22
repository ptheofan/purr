import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { AppConfigModel } from '../models';
import { PutioService } from '../../putio';

@Injectable()
export class ApiService {
  constructor(
    private readonly appConfigService: AppConfigService,
    @Inject(forwardRef(() => PutioService)) private readonly putioService: PutioService,
  ) {}

  async getAppConfig(): Promise<AppConfigModel> {
    const [watcherTargets, downloaderTargets] = await Promise.all([
      this.putioService.getPathsOfFiles(this.appConfigService.watcherTargets.map(target => target.targetId)),
      this.putioService.getPathsOfFiles(this.appConfigService.downloaderTargets.map(target => target.targetId)),
    ]);

    return {
      port: this.appConfigService.port,
      host: this.appConfigService.host,
      putioClientId: this.appConfigService.putioClientId,
      putioClientSecret: this.appConfigService.putioClientSecret.slice(-4).padStart(this.appConfigService.putioClientSecret.length, '*'),
      putioAuth: this.appConfigService.putioAuth.slice(-4).padStart(this.appConfigService.putioAuth.length, '*'),
      watcherEnabled: this.appConfigService.watcherEnabled,
      watcherTargets: watcherTargets.map((target, index) => ({
        path: this.appConfigService.watcherTargets[index].path,
        targetPath: target.path,
        targetId: this.appConfigService.watcherTargets[index].targetId,
      })),
      downloaderEnabled: this.appConfigService.downloaderEnabled,
      downloaderTargets: downloaderTargets.map((target, index) => ({
        path: this.appConfigService.downloaderTargets[index].path,
        targetPath: target.path,
        targetId: this.appConfigService.downloaderTargets[index].targetId,
      })),
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
