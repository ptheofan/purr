import { Box, Typography } from '@mui/material';
import ItemList from './ItemList';

interface DownloadItem {
  id: number;
  name: string;
  relativePath: string;
  size: any;
  status: any;
  error?: string | null;
}

interface GroupItemsProps {
  groupedItems: Record<string, DownloadItem[]>;
}

// Utility function to extract parent directory from relativePath
const getParentDirectory = (relativePath: string): string => {
  const pathParts = relativePath.split('/');
  if (pathParts.length <= 1) {
    return 'Root';
  }
  return pathParts[0] || 'Root';
};

// Utility function to group items by parent directory
const groupItemsByParent = (items: DownloadItem[]) => {
  const grouped = items.reduce((acc, item) => {
    const parent = getParentDirectory(item.relativePath);
    if (!acc[parent]) {
      acc[parent] = [];
    }
    acc[parent].push(item);
    return acc;
  }, {} as Record<string, DownloadItem[]>);
  
  return grouped;
};

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

export { GroupItems, groupItemsByParent, getParentDirectory };
export default GroupItems;
