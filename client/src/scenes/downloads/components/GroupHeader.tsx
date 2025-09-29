import { Box, Typography, IconButton } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import StatusChip from './StatusChip';

interface DownloadGroup {
  id: number;
  name: string;
  saveAt: string;
  state: string;
  status: string;
  addedAt: string;
}

interface GroupHeaderProps {
  group: DownloadGroup;
  isExpanded: boolean;
  onToggle: () => void;
}

const GroupHeader = ({ group, isExpanded, onToggle }: GroupHeaderProps) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Box>
        <Typography variant="h6" gutterBottom>{group.name}</Typography>
        <Box>
          <Typography variant="body2" component="span">
            Status: <StatusChip status={group.status} state={group.state} />
          </Typography>
          <Typography variant="body2" component="span" sx={{ ml: 2 }}>
            Added: {new Date(group.addedAt).toLocaleString()}
          </Typography>
          <Typography variant="body2" component="span" sx={{ ml: 2 }}>
            Save to: {group.saveAt}
          </Typography>
        </Box>
      </Box>
      <IconButton 
        onClick={onToggle}
        sx={{ color: 'text.secondary' }}
      >
        {isExpanded ? <ExpandLess /> : <ExpandMore />}
      </IconButton>
    </Box>
  );
};

export default GroupHeader;
