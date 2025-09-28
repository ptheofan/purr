import { List, ListItem, ListItemText, Typography, Box } from '@mui/material';
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
            secondary={
              <Box>
                <Typography variant="body2" component="div">
                  Path: {item.relativePath}
                </Typography>
                <Typography variant="body2" component="div">
                  Size: {prettyBytes(parseInt(item.size))}
                </Typography>
                <Typography variant="body2" component="div">
                  Status: <StatusChip status={item.status} state='Ready' id={item.id} name={item.name} addedAt={null} saveAt="" />
                </Typography>
                {item.error && (
                  <Typography variant="body2" color="error" component="div">
                    Error: {item.error}
                  </Typography>
                )}
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

export default ItemList;
