import { Box, IconButton, InputBase, useTheme } from '@mui/material';
import { ColorModeContext, tokens } from '../../../theme.ts';
import { useContext } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import { useLeftbar } from './Leftbar.tsx';

const Topbar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const [isCollapsed, setCollapsed] = useLeftbar();

  return (
    <Box sx={ { display: 'flex', justifyContent: 'space-between', p: 1 } }>
      {/* Search */ }
      <Box sx={ { display: 'flex' } }>
        <IconButton
          type="button"
          sx={ { p: 1 } }
          onClick={ () => setCollapsed(!isCollapsed) }
        >
          <MenuOutlinedIcon/>
        </IconButton>
        <Box sx={ { display: 'flex', backgroundColor: colors.primary[900], borderRadius: '3px', marginLeft: 1 } }>
          <InputBase sx={ { ml: 2, flex: 1 } } placeholder="Search"/>
          <IconButton type="button" sx={ { p: 1 } }>
            <SearchIcon/>
          </IconButton>
        </Box>
      </Box>

      {/* Right Side Icons */ }
      <Box sx={ { display: 'flex', paddingRight: 1 } }>
        <IconButton onClick={ colorMode.toggleColorMode }>
          { theme.palette.mode === 'dark' ? <DarkModeOutlinedIcon/> : <LightModeOutlinedIcon/> }
        </IconButton>
      </Box>
    </Box>
  );
};

export default Topbar;
