# Mock Data Setup

This document explains how to use mock data for development purposes, allowing you to build UI components without needing the backend to download files.

## Quick Start

### Enable Mock Data

You can enable mock data in several ways:

1. **Local Storage** (recommended):
   ```javascript
   localStorage.setItem('useMockData', 'true');
   window.location.reload();
   ```

2. **Development Toolbar** (development only):
   - Look for the dev toolbar in the top-right corner
   - Click the toggle button to enable/disable mock data

3. **Environment Variable**:
   Create a `.env.local` file:
   ```
   VITE_USE_MOCK_DATA=true
   ```

4. **URL Parameter** (for quick testing):
   ```
   http://localhost:4000?mock=true
   ```

### Disable Mock Data

To switch back to real backend data:

1. **Local Storage** (recommended):
   ```javascript
   localStorage.setItem('useMockData', 'false');
   window.location.reload();
   ```

2. **Development Toolbar**: Click the toggle button

3. **URL Parameter**:
   ```
   http://localhost:4000?mock=false
   ```

## Mock Data Features

The mock data includes:

- **4 Sample Download Groups** with different statuses:
  - The Matrix Collection (Downloading)
  - Game of Thrones S01 (Completed)
  - Ubuntu 24.04 LTS (Error)
  - Music Collection - Jazz (Paused)

- **Realistic File Data**:
  - Various file sizes and types
  - Different download statuses
  - Error messages for failed downloads
  - Progress information

- **Download Manager Stats**:
  - Lifetime bytes downloaded
  - Current download speed
  - Speed histogram data

- **Real-time Subscriptions** (simulated):
  - Download manager stats updates
  - New group notifications
  - Status change notifications

## Development Toolbar

In development mode, you'll see a toolbar in the top-right corner with:

- **Toggle Button**: Enable/disable mock data
- **Status Chip**: Shows current mode (MOCK/REAL)
- **Settings Button**: Expand for more options
- **Refresh Button**: Reload the page

## Priority Order

The mock data configuration follows this priority order:

1. **Local Storage** (`useMockData` key) - Highest priority (recommended)
2. **Environment Variable** (`VITE_USE_MOCK_DATA`) - Second priority  
3. **URL Parameter** (`?mock=true/false`) - Third priority (for quick testing)
4. **Default** (false - use real data) - Fallback

## File Structure

```
src/
├── mocks/
│   ├── data.ts          # Mock data generators
│   └── apollo.ts        # Apollo Client mocks
├── config/
│   └── mock.ts          # Mock configuration logic
├── providers/
│   └── MockProvider.tsx # Conditional mock provider
└── components/
    └── DevToolbar.tsx   # Development toolbar
```

## Customizing Mock Data

To add more mock data or modify existing data:

1. Edit `src/mocks/data.ts` to add new groups, items, or stats
2. Update `src/mocks/apollo.ts` to include new queries/mutations
3. The changes will be reflected immediately when mock data is enabled

## Troubleshooting

### Mock Data Not Working

1. Check the browser console for mock status messages
2. Verify the URL parameter or localStorage setting
3. Ensure you're in development mode (the toolbar should be visible)

### Real Data Not Working

1. Make sure mock data is disabled
2. Check that the backend is running on the correct port
3. Verify the GraphQL endpoint configuration

### Subscriptions Not Updating

Mock subscriptions provide static data. For dynamic updates, you would need to implement a more sophisticated mock system or use the real backend.

## Benefits

- **Faster Development**: No need to wait for real downloads
- **Consistent Data**: Same data every time for UI testing
- **Offline Development**: Work without backend running
- **Easy Testing**: Quickly test different UI states
- **No Backend Load**: Don't stress the backend during UI development
