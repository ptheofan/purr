import { Typography, useMediaQuery, useTheme } from '@mui/material';
import { tokens } from '../../../theme.ts';
import { createContext, ReactNode, useContext, useState } from 'react';
import { Menu, MenuItem, MenuItemStyles, Sidebar, sidebarClasses, SubMenu } from 'react-pro-sidebar';
import { Link } from 'react-router-dom';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import styled from '@emotion/styled';

interface ItemProps {
  title: string;
  to: string;
  icon: ReactNode;
  selected: string;
  setSelected: (title: string) => void;
}

const Item = ({ title, to, icon, selected, setSelected }: ItemProps) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <MenuItem
      active={ selected === title }
      style={ {
        color: colors.grey[100],
      } }
      onClick={ () => setSelected(title) }
      icon={ icon }
    >
      <Typography>{ title }</Typography>
      <Link to={ to }/>
    </MenuItem>
  );
};

const StyledSidebarHeader = styled.div`
    height: 64px;
    min-height: 64px;
    display: flex;
    align-items: center;
    padding: 0 20px;
    margin-bottom: 32px;

    > div {
        width: 100%;
        overflow: hidden;
    }
`;

interface LeftbarStateContextProps {
  isCollapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

export const LeftbarStateContext = createContext<LeftbarStateContextProps>({
  isCollapsed: false,
  setCollapsed: () => {
  },
});

interface LeftbarProviderProps {
  children: ReactNode;
}

export const LeftbarProvider = ({ children }: LeftbarProviderProps) => {
  const [isCollapsed, setCollapsed] = useState(false);
  return (
    <LeftbarStateContext.Provider value={ { isCollapsed, setCollapsed } }>
      { children }
    </LeftbarStateContext.Provider>
  );
};

type TSetCollapsed = (value: boolean) => void;
export const useLeftbar = (): [boolean, TSetCollapsed] => {
  const { isCollapsed, setCollapsed } = useContext(LeftbarStateContext);
  return [isCollapsed, setCollapsed];
};


const Leftbar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setCollapsed] = useLeftbar();
  const [selected, setSelected] = useState('Dashboard');
  const isBelowBreakpoint = useMediaQuery(theme.breakpoints.down('md'));

  const menuItemStyles: MenuItemStyles = {
    root: ({ active }) => ({
      fontSize: '13px',
      fontWeight: 400,
      borderRight: isCollapsed ? 0 : (active ? `3px solid ${ colors.primary[500] }` : 'none'),
      borderColor: colors.accent1[500],
      borderWidth: 2,
    }),
    button: {
      '&:hover': {
        backgroundColor: colors.primary[500],
      },
    },
    icon: ({ active }) => ({
      color: active ? colors.accent1[400] : colors.grey[200],
    }),
    label: ({ open, active }) => ({
      color: active ? colors.accent1[400] : colors.grey[200],
      fontWeight: open || active ? 600 : undefined,
    }),
    subMenuContent: {
      backgroundColor: theme.palette.mode === 'dark' ? colors.primary[450] : '#e4e4e4',
    },
  };

  return (
    <Sidebar
      breakPoint="md"
      toggled={ isCollapsed }
      collapsed={ isBelowBreakpoint ? false : isCollapsed }
      onBackdropClick={ () => setCollapsed(false) }
      rootStyles={ {
        [`.${ sidebarClasses.container }`]: {
          background: `${ colors.primary[400] }`,
        },
        borderColor: colors.primary[500],
      } }
    >
      <StyledSidebarHeader>
        <div style={ { display: 'flex', alignItems: 'center' } }>
          <img src={ `/purrito.png` } alt="logo" style={ {
            height: 40,
          } }/>
          <Typography variant="h4" style={ { color: colors.grey[100], marginLeft: 10 } }>
            Purrito
          </Typography>
        </div>
      </StyledSidebarHeader>

      <div style={ { padding: '0 24px', marginBottom: '8px' } }>
        <Typography
          variant="body2"
          fontWeight={ 600 }
          style={ { opacity: isCollapsed ? 0 : 0.7, letterSpacing: '0.5px' } }
        >
          General
        </Typography>
      </div>

      <Menu
        menuItemStyles={ menuItemStyles }
      >
        <Item
          title="Dashboard"
          to="/"
          icon={ <HomeOutlinedIcon/> }
          selected={ selected }
          setSelected={ setSelected }
        />
        <SubMenu
          label="Put.io"
          icon={ <HomeOutlinedIcon/> }
        >
          <Item
            title="Overview"
            to="/"
            icon={ <HomeOutlinedIcon/> }
            selected={ selected }
            setSelected={ setSelected }
          />
          <Item
            title="Transfers"
            to="/"
            icon={ <HomeOutlinedIcon/> }
            selected={ selected }
            setSelected={ setSelected }
          />
          <Item
            title="Create Download Target"
            to="/"
            icon={ <HomeOutlinedIcon/> }
            selected={ selected }
            setSelected={ setSelected }
          />
          <Item
            title="Create Upload Target"
            to="/"
            icon={ <HomeOutlinedIcon/> }
            selected={ selected }
            setSelected={ setSelected }
          />
        </SubMenu>
      </Menu>
    </Sidebar>
  );
};

export default Leftbar;

