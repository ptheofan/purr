import { Card, CardContent, Typography, Box, Chip, Collapse, Divider } from '@mui/material';
import { getFragmentData, FragmentType } from '../../../__generated__';
import { GroupBasicInfoFragment as GroupBasicInfoFragmentDoc, GroupWithItemsFragment as GroupWithItemsFragmentDoc } from '../../../fragments';
import { groupItemsByParent } from './GroupItems';
import GroupHeader from './GroupHeader';
import GroupItems from './GroupItems';

interface GroupCardProps {
  group: FragmentType<typeof GroupBasicInfoFragmentDoc> & FragmentType<typeof GroupWithItemsFragmentDoc>;
  isExpanded: boolean;
  onToggle: () => void;
  isLastItem?: boolean;
}

const GroupCard = ({ group, isExpanded, onToggle, isLastItem = false }: GroupCardProps) => {
  const groupBasic = getFragmentData(GroupBasicInfoFragmentDoc, group);
  const groupWithItems = getFragmentData(GroupWithItemsFragmentDoc, group);

  if (!groupWithItems.items || groupWithItems.items.length === 0) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">{groupBasic.name}</Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" component="div">
              Status: <Chip 
                label={groupBasic.status} 
                size="small" 
                color={groupBasic.status === 'Completed' ? 'success' : groupBasic.status === 'Error' ? 'error' : 'default'}
              />
            </Typography>
            <Typography variant="body2" component="div">
              State: <Chip label={groupBasic.state} size="small" variant="outlined" />
            </Typography>
            <Typography variant="body2" component="div">
              Added: {new Date(groupBasic.addedAt).toLocaleString()}
            </Typography>
            <Typography variant="body2" component="div">
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

  return (
    <Card sx={{ mb: isLastItem ? 0 : 3 }}>
      <CardContent>
        <GroupHeader 
          group={groupBasic}
          isExpanded={isExpanded}
          onToggle={onToggle}
        />
        
        <Divider sx={{ my: 2 }} />
        
        <Collapse in={isExpanded}>
          <GroupItems groupedItems={groupedItems} />
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default GroupCard;
