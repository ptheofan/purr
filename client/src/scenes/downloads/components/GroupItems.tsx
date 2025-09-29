import { Box, Typography } from '@mui/material';
import ItemList from './ItemList';

interface DownloadItem {
  id: number;
  name: string;
  relativePath: string;
  size: string;
  status: string;
  error?: string | null;
}

interface GroupItemsProps {
  groupedItems: Record<string, DownloadItem[]>;
}

const GroupItems = ({ groupedItems }: GroupItemsProps) => {
  const parentDirectories = Object.keys(groupedItems).sort();

  return (
    <>
      {parentDirectories.map((parentDir) => (
        <Box key={parentDir} sx={{ mb: 0 }}>
          {parentDir !== 'Root' && (
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
              {parentDir} ({groupedItems[parentDir].length} items)
            </Typography>
          )}
          <ItemList items={groupedItems[parentDir]} />
        </Box>
      ))}
    </>
  );
};

export default GroupItems;
