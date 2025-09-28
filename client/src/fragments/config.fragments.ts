import { gql } from '../__generated__';

export const AppConfigBasicFragment = gql(`
  fragment AppConfigBasic on AppConfig {
    concurrentGroups
    concurrentLargeFiles
    concurrentSmallFiles
    downloaderChunkSize
    downloaderEnabled
    host
    port
  }
`);

export const AppConfigAdvancedFragment = gql(`
  fragment AppConfigAdvanced on AppConfig {
    downloaderPerformanceMonitoringEnabled
    downloaderPerformanceMonitoringSpeed
    downloaderPerformanceMonitoringTime
    uiProgressUpdateInterval
    watcherEnabled
  }
`);

export const AppConfigPutioFragment = gql(`
  fragment AppConfigPutio on AppConfig {
    putioAuth
    putioCheckAtStartup
    putioCheckCronSchedule
    putioClientId
    putioClientSecret
    putioWatcherSocket
    putioWebhooksEnabled
  }
`);

export const AppConfigTargetsFragment = gql(`
  fragment AppConfigTargets on AppConfig {
    downloaderTargets {
      path
      targetId
      targetPath
    }
    watcherTargets {
      path
      targetId
      targetPath
    }
  }
`);
