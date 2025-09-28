import { Card, CardContent, Typography, Box, Collapse, Divider } from '@mui/material';
import { getFragmentData, FragmentType } from '../../../__generated__';
import { GroupBasicInfoFragment as GroupBasicInfoFragmentDoc, GroupWithItemsFragment as GroupWithItemsFragmentDoc } from '../../../fragments';
import { groupItemsByParent } from './GroupItems';
import GroupHeader from './GroupHeader';
import GroupItems from './GroupItems';
import DownloadItemDisplay from './DownloadItemDisplay';

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
          <Typography variant="h6" >{groupBasic.name}</Typography>
          <Box sx={{ mt: 1 }}>
            <DownloadItemDisplay item={{
              id: groupBasic.id,
              name: groupBasic.name,
              relativePath: groupBasic.saveAt,
              size: 0,
              status: groupBasic.status,
              error: null,
            }} showPath={false} showSize={false} showStatus={false} showError={false} />
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
