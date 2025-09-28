import { Card, CardContent, Typography } from '@mui/material';
import { getFragmentData } from '../../../__generated__';
import { GroupBasicInfoFragment } from '../../../fragments';

interface NewGroupNotificationProps {
  group: GroupBasicInfoFragment;
}

const NewGroupNotification = ({ group }: NewGroupNotificationProps) => {
  return (
    <Card sx={{ mb: 2, backgroundColor: 'success.light' }}>
      <CardContent>
        <Typography>New download group added: {group.name}</Typography>
      </CardContent>
    </Card>
  );
};

export default NewGroupNotification;
