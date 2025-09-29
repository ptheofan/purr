import { Box, List, ListItem, ListItemText, ListSubheader } from '@mui/material';
import { useQuery } from '@apollo/client';
import { prettyBytes, prettyTime } from '../../helpers/pretty.helper';
import { GET_APP_CONFIG, type ConfigQueryResult, type AppConfig } from './index.graphql';

interface ConfigDisplayProps {
  maxConcurrentDownloads: number;
  downloadPath: string;
  chunkSize: number;
  maxRetries: number;
  retryDelay: number;
  autoStartDownloads: boolean;
  putioToken: string;
}

const mapGraphQLToProps = (appConfig: AppConfig): ConfigDisplayProps => ({
  maxConcurrentDownloads: appConfig.concurrentGroups,
  downloadPath: appConfig.downloaderTargets[0]?.path || 'Not configured',
  chunkSize: appConfig.downloaderChunkSize,
  maxRetries: 3, // Default value since not in schema
  retryDelay: 1000, // Default value since not in schema
  autoStartDownloads: appConfig.downloaderEnabled,
  putioToken: appConfig.putioAuth
});

const Config = () => {
  const { loading, error, data } = useQuery<ConfigQueryResult>(GET_APP_CONFIG);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;
  if (!data) return null;

  const config = mapGraphQLToProps(data.appConfig);

  return (
    <Box sx={ {
      padding: '20px',
    } }>
      <List
          sx={ { width: '100%', maxWidth: 360, bgcolor: 'background.paper' } }
          subheader={
            <ListSubheader>Concurrency Settings</ListSubheader>
          }
        >
          <ListItem>
            <ListItemText primary="Concurrent Groups"/>
            { config.maxConcurrentDownloads }
          </ListItem>
          <ListItem>
            <ListItemText primary="Download Path"/>
            { config.downloadPath }
          </ListItem>
          <ListItem>
            <ListItemText primary="Chunk Size"/>
            { prettyBytes(config.chunkSize) }
          </ListItem>
          <ListItem>
            <ListItemText primary="Max Retries"/>
            { config.maxRetries }
          </ListItem>
          <ListItem>
            <ListItemText primary="Retry Delay"/>
            { prettyTime(config.retryDelay) }
          </ListItem>
          <ListSubheader>Settings</ListSubheader>
          <ListItem>
            <ListItemText primary="Auto Start Downloads"/>
            { config.autoStartDownloads ? 'Yes' : 'No' }
          </ListItem>
          <ListItem>
            <ListItemText primary="Put.io Token"/>
            { config.putioToken ? '***configured***' : 'Not configured' }
          </ListItem>
        </List>
    </Box>
  );
};

export default Config;
