import { Typography, Box } from '@mui/material';
import { prettyBytes } from '../../../helpers/pretty.helper';
import StatusChip from './StatusChip';

interface DownloadItem {
  id: number;
  name: string;
  relativePath: string;
  size: any;
  status: any;
  error?: string | null;
}

interface DownloadItemDisplayProps {
  item: DownloadItem;
  showPath?: boolean;
  showSize?: boolean;
  showStatus?: boolean;
  showError?: boolean;
}

const DownloadItemDisplay = ({ 
  item, 
  showPath = true, 
  showSize = true, 
  showStatus = true, 
  showError = true 
}: DownloadItemDisplayProps) => {
  return (
    <Box>
      <Typography variant="h6" component="div" sx={{ color: 'white', fontSize: '0.75rem' }}>
        {item.name}
      </Typography>
      {showPath && (
        <Typography variant="body2" component="div">
          Path: {item.relativePath}
        </Typography>
      )}
      {showSize && (
        <Typography variant="body2" component="div">
          Size: {prettyBytes(parseInt(item.size))}
        </Typography>
      )}
      {showStatus && (
        <Typography variant="body2" component="div">
          Status: <StatusChip status={item.status} state='Ready' id={item.id} name={item.name} addedAt={null} saveAt="" />
        </Typography>
      )}
      {showError && item.error && (
        <Typography variant="body2" color="error" component="div">
          Error: {item.error}
        </Typography>
      )}
    </Box>
  );
};

export default DownloadItemDisplay;
