import { ColorModeContext, useMode } from '../theme.ts';
import { CssBaseline, ThemeProvider } from '@mui/material';
import Topbar from './scenes/global/Topbar.tsx';
import Downloads from './scenes/downloads';
import { Route, Routes } from 'react-router-dom';
import Leftbar, { LeftbarProvider } from './scenes/global/Leftbar.tsx';
import Config from './scenes/config';

function App() {
  const [theme, colorMode] = useMode();

  return (
    <ColorModeContext.Provider value={ colorMode }>
      <ThemeProvider theme={ theme }>
        <CssBaseline/>
        <LeftbarProvider>
          <div className="app">
            <Leftbar/>
            <main className="content">
              <Topbar/>
              <Routes>
                <Route path="/" element={ <Downloads/> }/>
                <Route path="/config" element={ <Config/> }/>
              </Routes>
            </main>
          </div>
        </LeftbarProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
