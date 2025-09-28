import { Card, CardContent, Typography } from '@mui/material';
import { getFragmentData } from '../../../__generated__';
import { DownloadManagerStatsFragment } from '../../../fragments';
import { prettyBytes } from '../../../helpers/pretty.helper';

interface DownloadManagerStatsProps {
  stats: DownloadManagerStatsFragment;
}

const DownloadManagerStats = ({ stats }: DownloadManagerStatsProps) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Download Manager Stats</Typography>
        <Typography>Lifetime Bytes: {prettyBytes(parseInt(stats.lifetimeBytes))}</Typography>
        <Typography>Current Speed: {prettyBytes(Number(stats.speed))}/s</Typography>
        <Typography>Started At: {new Date(stats.startedAt).toLocaleString()}</Typography>
      </CardContent>
    </Card>
  );
};

export default DownloadManagerStats;
