import { Card, CardContent, Typography, Box, Collapse, Divider } from '@mui/material';
import { groupItemsByParent } from '../utils/group-utils';
import GroupHeader from './GroupHeader';
import GroupItems from './GroupItems';
import DownloadItemDisplay from './DownloadItemDisplay';

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

interface GroupCardProps {
  group: DownloadGroup;
  isExpanded: boolean;
  onToggle: () => void;
  isLastItem?: boolean;
}

const GroupCard = ({ group, isExpanded, onToggle, isLastItem = false }: GroupCardProps) => {

  if (!group.items || group.items.length === 0) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="h6" >{group.name}</Typography>
          <Box sx={{ mt: 1 }}>
            <DownloadItemDisplay item={{
              id: group.id,
              name: group.name,
              relativePath: group.saveAt,
              size: '0',
              status: group.status,
              error: null,
            }} showPath={false} showSize={false} showStatus={false} showError={false} />
          </Box>
          <Typography color="text.secondary" sx={{ mt: 1 }}>No items in this group</Typography>
        </CardContent>
      </Card>
    );
  }

  // Group items by parent directory
  const groupedItems = groupItemsByParent(group.items);

  return (
    <Card sx={{ mb: isLastItem ? 0 : 3 }}>
      <CardContent sx={{ pb: 1 }}>
        <GroupHeader
          group={group}
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
