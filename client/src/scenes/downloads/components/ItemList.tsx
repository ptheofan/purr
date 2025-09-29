import { List, ListItem, ListItemText } from '@mui/material';
import DownloadItemDisplay from './DownloadItemDisplay';

interface DownloadItem {
  id: number;
  name: string;
  relativePath: string;
  size: string;
  status: string;
  error?: string | null;
}

interface ItemListProps {
  items: DownloadItem[];
}

const ItemList = ({ items }: ItemListProps) => {
  return (
    <List dense sx={{ pb: 0 }}>
      {items.map((item, index) => (
        <ListItem 
          key={item.id} 
          divider={index < items.length - 1}
        >
          <ListItemText
            primary={item.name}
            secondary={<DownloadItemDisplay item={item} />}
          />
        </ListItem>
      ))}
    </List>
  );
};

export default ItemList;
