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

export const GET_APP_CONFIG_BASIC = gql`
  query GetAppConfigBasic {
    appConfig {
      concurrentGroups
      downloaderEnabled
      watcherEnabled
      host
      port
    }
  }
`;