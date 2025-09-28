import { Box, Typography, List, ListItem, ListItemText, Chip, Card, CardContent, Divider, IconButton, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { useQuery, useSubscription } from '@apollo/client';
import { GET_GROUPS, DOWNLOAD_MANAGER_STATS_SUBSCRIPTION, GROUP_ADDED_SUBSCRIPTION } from '../../queries';
import { prettyBytes } from '../../helpers/pretty.helper';
import { getFragmentData } from '../../__generated__';
import { GroupWithItemsFragment, GroupBasicInfoFragment, DownloadManagerStatsFragment } from '../../fragments';
import { useState } from 'react';

// Utility function to extract parent directory from relativePath
const getParentDirectory = (relativePath: string): string => {
  const pathParts = relativePath.split('/');
  if (pathParts.length <= 1) {
    return 'Root';
  }
  return pathParts[0] || 'Root';
};

// Utility function to group items by parent directory
const groupItemsByParent = (items: Array<{ id: number; name: string; relativePath: string; size: any; status: any; error?: string | null }>) => {
  const grouped = items.reduce((acc, item) => {
    const parent = getParentDirectory(item.relativePath);
    if (!acc[parent]) {
      acc[parent] = [];
    }
    acc[parent].push(item);
    return acc;
  }, {} as Record<string, Array<{ id: number; name: string; relativePath: string; size: any; status: any; error?: string | null }>>);
  
  return grouped;
};

const Downloads = () => {
  const { loading, error, data } = useQuery(GET_GROUPS);
  const { data: statsData } = useSubscription(DOWNLOAD_MANAGER_STATS_SUBSCRIPTION);
  const { data: newGroupData } = useSubscription(GROUP_ADDED_SUBSCRIPTION);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

  const toggleGroup = (groupId: number) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  if (loading) return <Typography>Loading downloads...</Typography>;
  if (error) return <Typography color="error">Error loading downloads: {error.message}</Typography>;

  return (
    <Box sx={{ 
      padding: '20px', 
      flex: 1, 
      overflow: 'auto',
      height: '100%'
    }}>
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
      {data?.getGroups?.map((group) => {
        const groupBasic = getFragmentData(GroupBasicInfoFragment, group);
        const groupWithItems = getFragmentData(GroupWithItemsFragment, group);
        
        if (!groupWithItems.items || groupWithItems.items.length === 0) {
          return (
            <Card key={groupBasic.id} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6">{groupBasic.name}</Typography>
                <Box sx={{ mt: 1 }}>
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
                </Box>
                <Typography color="text.secondary" sx={{ mt: 1 }}>No items in this group</Typography>
              </CardContent>
            </Card>
          );
        }

        // Group items by parent directory
        const groupedItems = groupItemsByParent(groupWithItems.items);
        const parentDirectories = Object.keys(groupedItems).sort();

        const isExpanded = expandedGroups[groupBasic.id] !== false; // Default to expanded

        return (
          <Card key={groupBasic.id} sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>{groupBasic.name}</Typography>
                  <Box>
                    <Typography variant="body2" component="span">
                      Status: <Chip 
                        label={groupBasic.status} 
                        size="small" 
                        color={groupBasic.status === 'Completed' ? 'success' : groupBasic.status === 'Error' ? 'error' : 'default'}
                      />
                    </Typography>
                    <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                      State: <Chip label={groupBasic.state} size="small" variant="outlined" />
                    </Typography>
                    <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                      Added: {new Date(groupBasic.addedAt).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" component="span" sx={{ ml: 2 }}>
                      Save to: {groupBasic.saveAt}
                    </Typography>
                  </Box>
                </Box>
                <IconButton 
                  onClick={() => toggleGroup(groupBasic.id)}
                  sx={{ color: 'text.secondary' }}
                >
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Collapse in={isExpanded}>
                {/* Grouped Items by Parent Directory */}
                {parentDirectories.map((parentDir) => (
                  <Box key={parentDir} sx={{ mb: 2 }}>
                    {parentDir !== 'Root' && (
                      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
                        {parentDir} ({groupedItems[parentDir].length} items)
                      </Typography>
                    )}
                    <List dense>
                      {groupedItems[parentDir].map((item, index) => (
                        <ListItem 
                          key={item.id} 
                          divider={index < groupedItems[parentDir].length - 1}
                        >
                          <ListItemText
                            primary={item.name}
                            secondary={
                              <Box>
                                <Typography variant="body2">
                                  Path: {item.relativePath}
                                </Typography>
                                <Typography variant="body2">
                                  Size: {prettyBytes(parseInt(item.size))}
                                </Typography>
                                <Typography variant="body2">
                                  Status: <Chip 
                                    label={item.status} 
                                    size="small" 
                                    color={item.status === 'Completed' ? 'success' : item.status === 'Error' ? 'error' : 'default'}
                                  />
                                </Typography>
                                {item.error && (
                                  <Typography variant="body2" color="error">
                                    Error: {item.error}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ))}
              </Collapse>
            </CardContent>
          </Card>
        );
      })}
      
      {(!data?.getGroups || data.getGroups.length === 0) && (
        <Typography color="text.secondary">No download groups found.</Typography>
      )}
    </Box>
  );
};

export default Downloads;
