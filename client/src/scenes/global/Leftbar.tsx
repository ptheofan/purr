import { Typography, useMediaQuery, useTheme } from '@mui/material';
import { tokens } from '../../../theme.ts';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Menu, MenuItem, MenuItemStyles, Sidebar, sidebarClasses, SubMenu } from 'react-pro-sidebar';
import { Link, useLocation } from 'react-router-dom';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import styled from '@emotion/styled';

interface ItemProps {
  id: string;
  title: string;
  to: string;
  icon: ReactNode;
  selected: string;
  setSelected: (title: string) => void;
}

type NavItem = {
  id?: string;
  title: string;
  to?: string;
  items?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Downloads',
    to: '/',
  },
  {
    title: 'Transfers',
    to: '/putio/transfers',
  },
  {
    title: 'Config',
    to: '/config',
  },
];

const Item = ({ id, title, to, icon, selected, setSelected }: ItemProps) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <MenuItem
      active={ selected === title }
      style={ {
        color: colors.grey[100],
      } }
      onClick={ () => setSelected(id) }
      icon={ icon }
      component={ <Link to={ to }/> }
    >
      <Typography>{ title }</Typography>
    </MenuItem>
  );
};

const submenusToActiveItem = (items: NavItem[], selected: string): string[] => {
  const activeSubmenus: string[] = [];
  function recursiveSearch(item: NavItem): boolean {
    if (item.items!.find((item) => item.id === selected)) {
      activeSubmenus.push(item.id!);
      return true;
    }

    item.items!.filter((item) => item.items).forEach((i) => {
      if (recursiveSearch(i)) {
        activeSubmenus.push(i.id!);
        return true;
      }
    });

    return false;
  }

  if (items.find((item) => item.id === selected)) {
    return [];
  }

  const submenus = items.filter((item) => item.items);
  for (const submenu of submenus) {
      if (recursiveSearch(submenu)) {
        return activeSubmenus;
      }
  }

  return [];
}

// A recursive function to render the menu items
const renderItems = (items: NavItem[], activeSubmenus: string[], selected: string, setSelected: (title: string) => void) => {
  return items.map((item) => {
    if (!item.id) {
      item.id = item.title;
    }
    if (item.items) {
      const active = activeSubmenus.includes(item.id);
      console.log('defaultOpen', active)
      return (
        <SubMenu
          key={ item.title }
          label={ item.title }
          icon={ <HomeOutlinedIcon/> }
          active={ active }
          defaultOpen={ active }
        >
          { renderItems(item.items, activeSubmenus, selected, setSelected) }
        </SubMenu>
      );
    }
    return (
      <Item
        id={ item.id }
        key={ item.id }
        title={ item.title }
        to={ item.to! }
        icon={ <HomeOutlinedIcon/> }
        selected={ selected }
        setSelected={ setSelected }
      />
    );
  });
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

const recursiveFindItemByUrl = (items: NavItem[], to: string): NavItem | undefined => {
  for (const item of items) {
    if (item.to === to) {
      return item;
    }
    if (item.items) {
      const found = recursiveFindItemByUrl(item.items, to);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

const Leftbar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setCollapsed] = useLeftbar();
  const [selected, setSelected] = useState('Dashboard');
  const isBelowBreakpoint = useMediaQuery(theme.breakpoints.down('md'));
  const { pathname } = useLocation();

  useEffect(() => {
    // Match the path to navItems and set the selected item
    const item = recursiveFindItemByUrl(navItems, pathname);
    if (item) {
      setSelected(item.id!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accent1 = colors.accent1[theme.palette.mode === 'dark' ? 400 : 300];
  const menuItemStyles: MenuItemStyles = {
    root: ({ active }) => ({
      fontSize: '13px',
      fontWeight: 400,
      borderRight: isCollapsed ? 0 : (active ? `3px solid ${ colors.primary[500] }` : 'none'),
      borderColor: accent1,
      borderWidth: 2,
    }),
    button: {
      '&:hover': {
        backgroundColor: theme.palette.mode === 'dark' ? `${colors.accent1[700]}18` : `${colors.accent1[500]}15`,
      },
    },
    icon: ({ active }) => ({
      color: active ? accent1 : colors.grey[200],
    }),
    label: ({ open, active }) => ({
      color: active ? accent1 : colors.grey[200],
      fontWeight: open || active ? 600 : undefined,
    }),
    subMenuContent: {
      backgroundColor: theme.palette.mode === 'dark' ? colors.primary[450] : '#e4e4e4',
    },
  };

  const activeSubmenus = submenusToActiveItem(navItems, selected);

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
        borderColor: colors.primary[theme.palette.mode === 'dark' ? 500 : 900],
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

      <Menu menuItemStyles={ menuItemStyles }>
        { renderItems(navItems, activeSubmenus, selected, setSelected) }
      </Menu>
    </Sidebar>
  );
};

export default Leftbar;

