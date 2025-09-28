import { ColorModeContext, useMode } from '../theme.ts';
import { CssBaseline, ThemeProvider } from '@mui/material';
import Topbar from './scenes/global/Topbar.tsx';
import MobileStats from './scenes/global/MobileStats.tsx';
import Downloads from './scenes/downloads';
import { Route, Routes } from 'react-router-dom';
import Leftbar, { LeftbarProvider } from './scenes/global/Leftbar.tsx';
import Config from './scenes/config';
import { useTitleStore } from './stores/title.store';
import { useEffect } from 'react';
import { ToastProvider } from './providers/ToastProvider';

function App() {
  const [theme, colorMode] = useMode();
  const title = useTitleStore((state) => state.title);

  // Update document title when store title changes
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <ColorModeContext.Provider value={ colorMode }>
      <ThemeProvider theme={ theme }>
        <CssBaseline/>
        <ToastProvider>
          <LeftbarProvider>
            <div className="app">
              <Leftbar/>
              <main className="content">
                <Topbar/>
                <MobileStats/>
                <Routes>
                  <Route path="/" element={ <Downloads/> }/>
                  <Route path="/config" element={ <Config/> }/>
                </Routes>
              </main>
            </div>
          </LeftbarProvider>
        </ToastProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
