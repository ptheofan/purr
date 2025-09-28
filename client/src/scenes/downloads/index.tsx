import { Box, Typography } from '@mui/material';
import { useQuery, useSubscription } from '@apollo/client';
import { GET_GROUPS, DOWNLOAD_MANAGER_STATS_SUBSCRIPTION, GROUP_ADDED_SUBSCRIPTION } from '../../queries';
import { getFragmentData } from '../../__generated__';
import { GroupWithItemsFragment, GroupBasicInfoFragment, DownloadManagerStatsFragment } from '../../fragments';
import { useState } from 'react';
import { 
  DownloadManagerStats, 
  NewGroupNotification, 
  GroupCard 
} from './components';


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
        return <DownloadManagerStats stats={stats} />;
      })()}

      {/* New Group Notification */}
      {newGroupData && (() => {
        const group = getFragmentData(GroupBasicInfoFragment, newGroupData.groupAdded);
        return <NewGroupNotification group={group} />;
      })()}

      {/* Groups List */}
      <Typography variant="h6" gutterBottom>Download Groups</Typography>
      {data?.getGroups?.map((group) => {
        const groupBasic = getFragmentData(GroupBasicInfoFragment, group);
        const groupWithItems = getFragmentData(GroupWithItemsFragment, group);
        const isExpanded = expandedGroups[groupBasic.id] !== false; // Default to expanded

        return (
          <GroupCard
            key={groupBasic.id}
            group={{ ...groupBasic, ...groupWithItems }}
            isExpanded={isExpanded}
            onToggle={() => toggleGroup(groupBasic.id)}
          />
        );
      })}
      
      {(!data?.getGroups || data.getGroups.length === 0) && (
        <Typography color="text.secondary">No download groups found.</Typography>
      )}
    </Box>
  );
};

export default Downloads;
