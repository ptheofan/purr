/**
 * Utility functions for managing mock data in development
 */

import { enableMockData, disableMockData, toggleMockData, getMockStatus } from '../config/mock';

/**
 * Console commands for easy mock data management
 * Use these in the browser console for quick toggling
 */
export const mockUtils = {
  /**
   * Enable mock data and reload the page
   */
  enable: () => {
    console.log('🔧 Enabling mock data...');
    enableMockData();
  },

  /**
   * Disable mock data and reload the page
   */
  disable: () => {
    console.log('🔧 Disabling mock data...');
    disableMockData();
  },

  /**
   * Toggle mock data and reload the page
   */
  toggle: () => {
    console.log('🔧 Toggling mock data...');
    toggleMockData();
  },

  /**
   * Get current mock data status
   */
  status: () => {
    const status = getMockStatus();
    console.log(`🔧 ${status}`);
    return status;
  },

  /**
   * Show help information
   */
  help: () => {
    console.log(`
🔧 Mock Data Utilities

Available commands:
  mockUtils.enable()  - Enable mock data
  mockUtils.disable() - Disable mock data  
  mockUtils.toggle()  - Toggle mock data
  mockUtils.status()  - Show current status
  mockUtils.help()    - Show this help

Alternative methods:
  • localStorage: useMockData key (recommended)
  • Dev toolbar (top-right corner)
  • Environment: VITE_USE_MOCK_DATA
  • URL: ?mock=true or ?mock=false
    `);
  }
};

// Make mockUtils available globally in development
if (import.meta.env.DEV) {
  (window as unknown as { mockUtils: typeof mockUtils }).mockUtils = mockUtils;
  console.log('🔧 Mock utilities available as window.mockUtils');
  console.log('🔧 Type mockUtils.help() for available commands');
}
