import { Box, Typography, List, ListItem, ListItemText, Chip, Card, CardContent } from '@mui/material';
import { useQuery, useSubscription } from '@apollo/client';
import { GET_GROUPS, DOWNLOAD_MANAGER_STATS_SUBSCRIPTION, GROUP_ADDED_SUBSCRIPTION } from '../../queries';
import { prettyBytes } from '../../helpers/pretty.helper';
import { getFragmentData } from '../../__generated__';
import { GroupWithItemsFragment, GroupBasicInfoFragment, DownloadManagerStatsFragment } from '../../fragments';

const Downloads = () => {
  const { loading, error, data } = useQuery(GET_GROUPS);
  const { data: statsData } = useSubscription(DOWNLOAD_MANAGER_STATS_SUBSCRIPTION);
  const { data: newGroupData } = useSubscription(GROUP_ADDED_SUBSCRIPTION);

  if (loading) return <Typography>Loading downloads...</Typography>;
  if (error) return <Typography color="error">Error loading downloads: {error.message}</Typography>;

  return (
    <Box sx={{ padding: '20px' }}>
      <Typography variant="h4" gutterBottom>Downloads</Typography>
      
      {/* Stats Card */}
      {statsData && (() => {
        const stats = getFragmentData(DownloadManagerStatsFragment, statsData.downloadManagerStats);
        return (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Download Manager Stats</Typography>
              <Typography>Lifetime Bytes: {prettyBytes(parseInt(stats.lifetimeBytes))}</Typography>
              <Typography>Current Speed: {prettyBytes(Number(stats.speed))}/s</Typography>
              <Typography>Started At: {new Date(stats.startedAt).toLocaleString()}</Typography>
            </CardContent>
          </Card>
        );
      })()}

      {/* New Group Notification */}
      {newGroupData && (() => {
        const group = getFragmentData(GroupBasicInfoFragment, newGroupData.groupAdded);
        return (
          <Card sx={{ mb: 2, backgroundColor: 'success.light' }}>
            <CardContent>
              <Typography>New download group added: {group.name}</Typography>
            </CardContent>
          </Card>
        );
      })()}

      {/* Groups List */}
      <Typography variant="h6" gutterBottom>Download Groups</Typography>
      <List>
        {data?.getGroups?.map((group) => {
          const groupBasic = getFragmentData(GroupBasicInfoFragment, group);
          const groupWithItems = getFragmentData(GroupWithItemsFragment, group);
          return (
            <ListItem key={groupBasic.id} divider>
              <ListItemText
                primary={groupBasic.name}
                secondary={
                  <Box>
                    <Typography variant="body2">
                      Status: <Chip 
                        label={groupBasic.status} 
                        size="small" 
                        color={groupBasic.status === 'Completed' ? 'success' : groupBasic.status === 'Error' ? 'error' : 'default'}
                      />
                    </Typography>
                    <Typography variant="body2">
                      State: <Chip label={groupBasic.state} size="small" variant="outlined" />
                    </Typography>
                    <Typography variant="body2">
                      Added: {new Date(groupBasic.addedAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body2">
                      Save to: {groupBasic.saveAt}
                    </Typography>
                    {groupWithItems.items && groupWithItems.items.length > 0 && (
                      <Typography variant="body2">
                        Items: {groupWithItems.items.length} files
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
      
      {(!data?.getGroups || data.getGroups.length === 0) && (
        <Typography color="text.secondary">No download groups found.</Typography>
      )}
    </Box>
  );
};

export default Downloads;
