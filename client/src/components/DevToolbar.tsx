import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Chip, 
  Paper, 
  Typography, 
  IconButton,
  Tooltip,
  Collapse,
  useTheme
} from '@mui/material';
import { 
  Settings as SettingsIcon,
  BugReport as BugReportIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  getMockStatus,
  toggleMockData,
  getMockConfig
} from '../config/mock';
import { tokens } from '../../theme';

/**
 * Development toolbar for toggling mock data and other dev features
 * Only shows in development mode
 */
export const DevToolbar: React.FC = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
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
        width: '100%',
        p: 1,
      }}
    >
      <Paper
        elevation={1}
        sx={{
          p: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          backgroundColor: theme.palette.mode === 'dark' 
            ? colors.primary[450] 
            : colors.primary[100],
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' 
            ? colors.grey[700] 
            : colors.grey[300],
          borderRadius: 1,
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
          elevation={2}
          sx={{
            mt: 1,
            p: 2,
            width: '100%',
            backgroundColor: theme.palette.mode === 'dark'
              ? colors.primary[500]
              : colors.primary[100],
            border: '1px solid',
            borderColor: theme.palette.mode === 'dark' 
              ? colors.grey[600] 
              : colors.grey[200],
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <BugReportIcon sx={{ color: colors.accent1[theme.palette.mode === 'dark' ? 400 : 500] }} />
            <Typography variant="h6" sx={{ color: colors.grey[theme.palette.mode === 'dark' ? 100 : 800] }}>
              Development Tools
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: colors.grey[theme.palette.mode === 'dark' ? 200 : 700] }}>
              Mock Data Status
            </Typography>
            <Typography variant="body2" sx={{ color: colors.grey[theme.palette.mode === 'dark' ? 300 : 600] }}>
              {getMockStatus()}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: colors.grey[theme.palette.mode === 'dark' ? 200 : 700] }}>
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
            <Typography variant="subtitle2" gutterBottom sx={{ color: colors.grey[theme.palette.mode === 'dark' ? 200 : 700] }}>
              How to Control Mock Data
            </Typography>
            <Typography variant="body2" sx={{ color: colors.grey[theme.palette.mode === 'dark' ? 300 : 600] }} component="div">
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <li>URL: <code style={{ 
                  backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.grey[200],
                  color: theme.palette.mode === 'dark' ? colors.accent1[400] : colors.accent1[600],
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontSize: '0.85em'
                }}>?mock=true</code> or <code style={{ 
                  backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.grey[200],
                  color: theme.palette.mode === 'dark' ? colors.accent1[400] : colors.accent1[600],
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontSize: '0.85em'
                }}>?mock=false</code></li>
                <li>Local Storage: <code style={{ 
                  backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.grey[200],
                  color: theme.palette.mode === 'dark' ? colors.accent1[400] : colors.accent1[600],
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontSize: '0.85em'
                }}>useMockData</code> key</li>
                <li>Environment: <code style={{ 
                  backgroundColor: theme.palette.mode === 'dark' ? colors.primary[600] : colors.grey[200],
                  color: theme.palette.mode === 'dark' ? colors.accent1[400] : colors.accent1[600],
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontSize: '0.85em'
                }}>VITE_USE_MOCK_DATA=true</code></li>
                <li>This toolbar (development only)</li>
              </Box>
            </Typography>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};
