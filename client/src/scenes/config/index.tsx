import { Box, List, ListItem, ListItemText, ListSubheader } from '@mui/material';
import { prettyBytes, prettyTime } from '../../helpers/pretty.helper';
import { useAppConfig } from '../../hooks';

const Config = () => {
  const { loading, error, data } = useAppConfig();
  return (
    <Box sx={ {
      padding: '20px',
    } }>
      { loading && <p>Loading...</p> }
      { error && <p>Error :(</p> }
      { data && (
        <List
          sx={ { width: '100%', maxWidth: 360, bgcolor: 'background.paper' } }
          subheader={
            <ListSubheader>Concurrency Settings</ListSubheader>
          }
        >
          <ListItem>
            <ListItemText primary="Concurrent Groups"/>
            { data.appConfig.concurrentGroups }
          </ListItem>
          <ListItem>
            <ListItemText primary="Concurrent Large Files"/>
            { data.appConfig.concurrentLargeFiles }
          </ListItem>
          <ListItem>
            <ListItemText primary="Concurrent Small Files"/>
            { data.appConfig.concurrentSmallFiles }
          </ListItem>
          <ListItem>
            <ListItemText primary="Downloader Chunk Size"/>
            { prettyBytes(data.appConfig.downloaderChunkSize) }
          </ListItem>
          <ListSubheader>Downloader</ListSubheader>
          <ListItem>
            <ListItemText primary="Downloader Enabled"/>
            { data.appConfig.downloaderEnabled ? 'Yes' : 'No' }
          </ListItem>
          <ListItem>
            <ListItemText primary="Downloader Performance Monitoring Enabled"/>
            { data.appConfig.downloaderPerformanceMonitoringEnabled ? 'Yes' : 'No' }
          </ListItem>
          <ListItem>
            <ListItemText primary="Downloader Performance Monitoring Speed"/>
            { prettyBytes(data.appConfig.downloaderPerformanceMonitoringSpeed) }
          </ListItem>
          <ListItem>
            <ListItemText primary="Downloader Performance Monitoring Time"/>
            { prettyTime(data.appConfig.downloaderPerformanceMonitoringTime * 1000) }
          </ListItem>
          <ListSubheader>Put.io</ListSubheader>
          <ListItem>
            <ListItemText primary="Putio Auth"/>
            { data.appConfig.putioAuth }
          </ListItem>
          <ListItem>
            <ListItemText primary="Putio Check At Startup"/>
            { data.appConfig.putioCheckAtStartup }
          </ListItem>
          <ListItem>
            <ListItemText primary="Putio Client Id"/>
            { data.appConfig.putioClientId }
          </ListItem>
          <ListItem>
            <ListItemText primary="Putio Client Secret"/>
            { data.appConfig.putioClientSecret }
          </ListItem>
          <ListItem>
            <ListItemText primary="Putio Socket Enabled"/>
            { data.appConfig.putioWatcherSocket ? 'Yes' : 'No' }
          </ListItem>
          <ListItem>
            <ListItemText primary="Putio Webhooks Enabled"/>
            { data.appConfig.putioWebhooksEnabled ? 'Yes' : 'No' }
          </ListItem>
          <ListSubheader>Download Targets</ListSubheader>
          { data.appConfig.downloaderTargets.map((target) => (
            <ListItem key={ target.targetId }>
              <ListItemText primary={ `putio:${ target.targetPath } => ${ target.path }` }/>
            </ListItem>
          )) }
          <ListSubheader>Server Settings</ListSubheader>
          <ListItem>
            <ListItemText primary="UI Progress Update Interval"/>
            { prettyTime(data.appConfig.uiProgressUpdateInterval) }
          </ListItem>
          <ListItem>
            <ListItemText primary="Host"/>
            { data.appConfig.host }
          </ListItem>
          <ListItem>
            <ListItemText primary="Port"/>
            { data.appConfig.port }
          </ListItem>
          <ListItem>
            <ListItemText primary="Watcher Enabled"/>
            { data.appConfig.watcherEnabled ? 'Yes' : 'No' }
          </ListItem>
          <ListSubheader>Watcher Targets</ListSubheader>
          { data.appConfig.watcherTargets.map((target) => (
            <ListItem key={ target.targetId }>
              <ListItemText primary={ `${ target.path } => putio:${ target.targetPath }` }/>
            </ListItem>
          )) }
        </List>
      ) }
    </Box>
  );
};

export default Config;
