import { Box, Typography, useTheme } from '@mui/material';
import { useSubscription } from '@apollo/client';
import { DOWNLOAD_MANAGER_STATS_SUBSCRIPTION } from '../../queries';
import { getFragmentData } from '../../__generated__';
import { DownloadManagerStatsFragment } from '../../fragments';
import { prettyBytes, prettyUptime } from '../../helpers/pretty.helper';
import { tokens } from '../../../theme.ts';

const MobileStats = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { data: statsData } = useSubscription(DOWNLOAD_MANAGER_STATS_SUBSCRIPTION);

  if (!statsData) return null;

  const stats = getFragmentData(DownloadManagerStatsFragment, statsData.downloadManagerStats);

  return (
    <Box 
      sx={{ 
        display: { xs: 'block', md: 'none' },
        backgroundColor: colors.primary[theme.palette.mode === 'dark' ? 500 : 100],
        padding: 2,
        margin: 1,
        borderRadius: 2,
        boxShadow: 1
      }}
    >
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: 2,
          textAlign: 'center'
        }}
      >
        {/* Speed Column */}
        <Box>
          <Typography 
            variant="body2" 
            sx={{ 
              color: colors.grey[300], 
              marginBottom: 0.5,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Speed
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: colors.accent1[500],
              fontWeight: 600,
              fontSize: '1rem'
            }}
          >
            {prettyBytes(Number(stats.speed))}/s
          </Typography>
        </Box>

        {/* Total Column */}
        <Box>
          <Typography 
            variant="body2" 
            sx={{ 
              color: colors.grey[300], 
              marginBottom: 0.5,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Total
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: colors.accent1[500],
              fontWeight: 600,
              fontSize: '1rem'
            }}
          >
            {prettyBytes(parseInt(stats.lifetimeBytes))}
          </Typography>
        </Box>

        {/* Uptime Column */}
        <Box>
          <Typography 
            variant="body2" 
            sx={{ 
              color: colors.grey[300], 
              marginBottom: 0.5,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Uptime
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: colors.accent1[500],
              fontWeight: 600,
              fontSize: '1rem'
            }}
          >
            {prettyUptime(stats.startedAt, true)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default MobileStats;
