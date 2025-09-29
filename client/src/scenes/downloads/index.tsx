import { Box, Typography } from '@mui/material';
import { useQuery, useSubscription } from '@apollo/client';
import { useState, useEffect } from 'react';
import { useTitleStore } from '../../stores/title.store';
import { useToast } from '../../providers/ToastProvider';
import { GroupCard } from './components';
import {
  GET_DOWNLOAD_GROUPS,
  GROUP_STATUS_CHANGED_SUBSCRIPTION,
  type DownloadsQueryResult,
  type GroupStatusChangedSubscriptionResult,
  type Group as GraphQLGroup
} from './index.graphql';

interface DownloadItem {
  id: number;
  name: string;
  relativePath: string;
  size: string;
  status: string;
  error?: string;
}

interface DownloadGroup {
  id: number;
  name: string;
  saveAt: string;
  state: string;
  status: string;
  addedAt: string;
  items?: DownloadItem[];
}

const mapGraphQLGroup = (group: GraphQLGroup): DownloadGroup => ({
  id: group.id,
  name: group.name,
  saveAt: group.saveAt,
  state: group.state,
  status: group.status,
  addedAt: group.addedAt,
  items: group.items?.map(item => ({
    id: item.id,
    name: item.name,
    relativePath: item.relativePath,
    size: item.size,
    status: item.status,
    error: item.error || undefined
  }))
});


const Downloads = () => {
  const { loading, error, data } = useQuery<DownloadsQueryResult>(GET_DOWNLOAD_GROUPS);
  const { data: statusData } = useSubscription<GroupStatusChangedSubscriptionResult>(GROUP_STATUS_CHANGED_SUBSCRIPTION);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const setTitle = useTitleStore((state) => state.setTitle);
  const { showSuccess } = useToast();

  // Set page title when component mounts
  useEffect(() => {
    setTitle('Downloads');
  }, [setTitle]);

  // Show toast notification when status updates
  useEffect(() => {
    if (statusData?.groupStatusChanged) {
      // You can add logic here for status notifications if needed
      // showSuccess(`Status update for group ${statusData.groupStatusChanged.id}: ${statusData.groupStatusChanged.status}`);
    }
  }, [statusData, showSuccess]);

  const toggleGroup = (groupId: string) => {
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
      {/* Groups List */}
      {data?.getGroups?.map((group, index) => {
        const isExpanded = expandedGroups[group.id] !== false; // Default to expanded
        const mappedGroup = mapGraphQLGroup(group);

        return (
          <GroupCard
            key={group.id}
            group={mappedGroup}
            isExpanded={isExpanded}
            onToggle={() => toggleGroup(group.id.toString())}
            isLastItem={index === data.getGroups.length - 1}
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
