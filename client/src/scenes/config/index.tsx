import { gql } from '../../__generated__';
import { useQuery } from '@apollo/client';

const Config = () => {
  const { loading, error, data } = useQuery(getAppConfig);
  return (
    <div>
      { loading && <p>Loading...</p> }
      { error && <p>Error :(</p> }
      { data && (
        <div>
          <div>Concurrent Groups: { data.appConfig.concurrentGroups }</div>
          <div>Concurrent Large Files: { data.appConfig.concurrentLargeFiles }</div>
          <div>Concurrent Small Files: { data.appConfig.concurrentSmallFiles }</div>
          <div>Downloader Chunk Size: { data.appConfig.downloaderChunkSize }</div>
          <div>Downloader Enabled: { data.appConfig.downloaderEnabled }</div>
          <div>Downloader Performance Monitoring
            Enabled: { data.appConfig.downloaderPerformanceMonitoringEnabled }</div>
          <div>Downloader Performance Monitoring Speed: { data.appConfig.downloaderPerformanceMonitoringSpeed }</div>
          <div>Downloader Performance Monitoring Time: { data.appConfig.downloaderPerformanceMonitoringTime }</div>
          <div>Host: { data.appConfig.host }</div>
          <div>Port: { data.appConfig.port }</div>
          <div>Putio Auth: { data.appConfig.putioAuth }</div>
          <div>Putio Check At Startup: { data.appConfig.putioCheckAtStartup }</div>
          <div>Putio Client Id: { data.appConfig.putioClientId }</div>
          <div>Putio Client Secret: { data.appConfig.putioClientSecret }</div>
          <div>Putio Watcher Socket: { data.appConfig.putioWatcherSocket }</div>
          <div>Putio Webhooks Enabled: { data.appConfig.putioWebhooksEnabled }</div>
          <div>UI Progress Update Interval: { data.appConfig.uiProgressUpdateInterval }</div>
          <div>Watcher Enabled: { data.appConfig.watcherEnabled }</div>
          <div>
            Downloader Targets
            <ul>
              { data.appConfig.downloaderTargets.map((target) => (
                <li key={ target.targetId }>{ target.path } ({target.targetId})</li>
              )) }
            </ul>
          </div>
          <div>
            Watcher Targets
            <ul>
              { data.appConfig.watcherTargets.map((target) => (
                <li key={ target.targetId }>{ target.path } ({target.targetId})</li>
              )) }
            </ul>
          </div>
        </div>
      ) }
    </div>
  );
};

export default Config;


const getAppConfig = gql(/* GraphQL */ `
    query AppConfig {
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
            }
        }
    }
`);
