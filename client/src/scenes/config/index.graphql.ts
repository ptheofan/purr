import { gql } from '@apollo/client';

export const GET_APP_CONFIG = gql`
  query GetAppConfig {
    appConfig {
      concurrentGroups
      concurrentLargeFiles
      concurrentSmallFiles
      downloaderChunkSize
      downloaderEnabled
      downloaderPerformanceMonitoringEnabled
      downloaderPerformanceMonitoringSpeed
      downloaderPerformanceMonitoringTime
      downloaderTargets {
        path
        targetId
        targetPath
      }
      host
      port
      putioAuth
      putioCheckAtStartup
      putioCheckCronSchedule
      putioClientId
      putioClientSecret
      putioWatcherSocket
      putioWebhooksEnabled
      uiProgressUpdateInterval
      watcherEnabled
      watcherTargets {
        path
        targetId
        targetPath
      }
    }
  }
`;

export interface TargetModel {
  path: string;
  targetId: number;
  targetPath?: string;
}

export interface AppConfig {
  concurrentGroups: number;
  concurrentLargeFiles: number;
  concurrentSmallFiles: number;
  downloaderChunkSize: number;
  downloaderEnabled: boolean;
  downloaderPerformanceMonitoringEnabled: boolean;
  downloaderPerformanceMonitoringSpeed: number;
  downloaderPerformanceMonitoringTime: number;
  downloaderTargets: TargetModel[];
  host: string;
  port: number;
  putioAuth: string;
  putioCheckAtStartup: number;
  putioCheckCronSchedule?: string;
  putioClientId: number;
  putioClientSecret: string;
  putioWatcherSocket: number;
  putioWebhooksEnabled: number;
  uiProgressUpdateInterval: number;
  watcherEnabled: boolean;
  watcherTargets: TargetModel[];
}

export interface ConfigQueryResult {
  appConfig: AppConfig;
}