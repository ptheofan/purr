import { Box, Typography } from '@mui/material';
import { useQuery, useSubscription } from '@apollo/client';
import { GET_GROUPS, GROUP_ADDED_SUBSCRIPTION } from '../../queries';
import { getFragmentData } from '../../__generated__';
import { GroupWithItemsFragment, GroupBasicInfoFragment } from '../../fragments';
import { useState, useEffect } from 'react';
import { useTitleStore } from '../../stores/title.store';
import { 
  NewGroupNotification, 
  GroupCard 
} from './components';


const Downloads = () => {
  const { loading, error, data } = useQuery(GET_GROUPS);
  const { data: newGroupData } = useSubscription(GROUP_ADDED_SUBSCRIPTION);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const setTitle = useTitleStore((state) => state.setTitle);

  // Set page title when component mounts
  useEffect(() => {
    setTitle('Downloads');
  }, [setTitle]);

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
      {/* New Group Notification */}
      {newGroupData && (() => {
        const group = getFragmentData(GroupBasicInfoFragment, newGroupData.groupAdded);
        return <NewGroupNotification group={group} />;
      })()}

      {/* Groups List */}
      {data?.getGroups?.map((group, index) => {
        const groupBasic = getFragmentData(GroupBasicInfoFragment, group);
        const isExpanded = expandedGroups[groupBasic.id] !== false; // Default to expanded

        return (
          <GroupCard
            key={groupBasic.id}
            group={group}
            isExpanded={isExpanded}
            onToggle={() => toggleGroup(groupBasic.id)}
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
