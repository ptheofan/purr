import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Chip, 
  Paper, 
  Typography, 
  IconButton,
  Tooltip,
  Collapse
} from '@mui/material';
import { 
  Settings as SettingsIcon,
  BugReport as BugReportIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { 
  isMockEnabled, 
  getMockStatus, 
  toggleMockData, 
  getMockConfig 
} from '../config/mock';

/**
 * Development toolbar for toggling mock data and other dev features
 * Only shows in development mode
 */
export const DevToolbar: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [mockConfig, setMockConfig] = useState(getMockConfig());

  // Update mock config when it changes
  useEffect(() => {
    const handleStorageChange = () => {
      setMockConfig(getMockConfig());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Only show in development
  if (!import.meta.env.DEV) {
    return null;
  }

  const handleToggleMock = () => {
    toggleMockData();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        zIndex: 9999,
        p: 1,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Toggle Button */}
        <Tooltip title="Toggle Mock Data">
          <IconButton
            onClick={handleToggleMock}
            size="small"
            color={mockConfig.enabled ? 'primary' : 'default'}
          >
            {mockConfig.enabled ? <ToggleOnIcon /> : <ToggleOffIcon />}
          </IconButton>
        </Tooltip>

        {/* Status Chip */}
        <Chip
          label={mockConfig.enabled ? 'MOCK' : 'REAL'}
          size="small"
          color={mockConfig.enabled ? 'primary' : 'default'}
          variant={mockConfig.enabled ? 'filled' : 'outlined'}
        />

        {/* Expand Button */}
        <Tooltip title="Dev Settings">
          <IconButton
            onClick={() => setExpanded(!expanded)}
            size="small"
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        {/* Refresh Button */}
        <Tooltip title="Refresh Page">
          <IconButton
            onClick={handleRefresh}
            size="small"
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Expanded Panel */}
      <Collapse in={expanded}>
        <Paper
          elevation={3}
          sx={{
            mt: 1,
            p: 2,
            minWidth: 300,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <BugReportIcon color="primary" />
            <Typography variant="h6">Development Tools</Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Mock Data Status
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getMockStatus()}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant={mockConfig.enabled ? 'contained' : 'outlined'}
                size="small"
                onClick={handleToggleMock}
                startIcon={mockConfig.enabled ? <ToggleOnIcon /> : <ToggleOffIcon />}
              >
                {mockConfig.enabled ? 'Disable' : 'Enable'} Mock
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleRefresh}
                startIcon={<RefreshIcon />}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              How to Control Mock Data
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <li>URL: <code>?mock=true</code> or <code>?mock=false</code></li>
                <li>Local Storage: <code>useMockData</code> key</li>
                <li>Environment: <code>VITE_USE_MOCK_DATA=true</code></li>
                <li>This toolbar (development only)</li>
              </Box>
            </Typography>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};
