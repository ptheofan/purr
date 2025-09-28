import { Box, IconButton, InputBase, useTheme, Typography } from '@mui/material';
import { ColorModeContext, tokens } from '../../../theme.ts';
import { useContext } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import { useLeftbar } from './Leftbar.tsx';
import { useSubscription } from '@apollo/client';
import { DOWNLOAD_MANAGER_STATS_SUBSCRIPTION } from '../../queries';
import { getFragmentData } from '../../__generated__';
import { DownloadManagerStatsFragment } from '../../fragments';
import { prettyBytes, prettyUptime } from '../../helpers/pretty.helper';

const Topbar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const [isCollapsed, setCollapsed] = useLeftbar();
  const { data: statsData } = useSubscription(DOWNLOAD_MANAGER_STATS_SUBSCRIPTION);

  console.log(theme.palette.mode, colors.primary[900]);
  return (
    <Box sx={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 } }>
      {/* Left Side - Menu Button and Stats */ }
      <Box sx={ { display: 'flex', alignItems: 'center', gap: 2 } }>
        <IconButton
          type="button"
          sx={ { p: 1 } }
          onClick={ () => setCollapsed(!isCollapsed) }
        >
          <MenuOutlinedIcon/>
        </IconButton>
        
        {/* Download Manager Stats - Hidden on mobile */}
        {statsData && (() => {
          const stats = getFragmentData(DownloadManagerStatsFragment, statsData.downloadManagerStats);
          return (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: colors.grey[100] }}>
                Speed: {prettyBytes(Number(stats.speed))}/s
              </Typography>
              <Typography variant="body2" sx={{ color: colors.grey[100] }}>
                Total: {prettyBytes(parseInt(stats.lifetimeBytes))}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.grey[100] }}>
                Uptime: {prettyUptime(stats.startedAt, false)}
              </Typography>
            </Box>
          );
        })()}
      </Box>

      {/* Right Side - Search and Theme Toggle */ }
      <Box sx={ { display: 'flex', alignItems: 'center', gap: 1 } }>
        <Box sx={ { display: 'flex', backgroundColor: colors.primary[theme.palette.mode === 'dark' ? 900 : 1000], borderRadius: '3px' } }>
          <InputBase sx={ { ml: 2, flex: 1 } } placeholder="Search"/>
          <IconButton type="button" sx={ { p: 1 } }>
            <SearchIcon/>
          </IconButton>
        </Box>
        <IconButton onClick={ colorMode.toggleColorMode }>
          { theme.palette.mode === 'dark' ? <DarkModeOutlinedIcon/> : <LightModeOutlinedIcon/> }
        </IconButton>
      </Box>
    </Box>
  );
};

export default Topbar;
