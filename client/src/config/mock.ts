/**
 * Mock Configuration
 * 
 * This file controls whether the application uses mock data or real backend data.
 * You can toggle this in several ways:
 * 
 * 1. Local storage: localStorage.setItem('useMockData', 'true') (RECOMMENDED)
 * 2. Environment variable: VITE_USE_MOCK_DATA=true
 * 3. URL parameter: ?mock=true (for quick testing)
 * 4. Default fallback: false (use real data)
 */

export interface MockConfig {
  enabled: boolean;
  source: 'localStorage' | 'env' | 'url' | 'default';
}

/**
 * Determines if mock data should be used based on multiple sources
 */
export const getMockConfig = (): MockConfig => {
  // 1. Check localStorage first (highest priority - recommended)
  const localStorageMock = localStorage.getItem('useMockData');
  if (localStorageMock !== null) {
    return {
      enabled: localStorageMock === 'true' || localStorageMock === '1',
      source: 'localStorage'
    };
  }

  // 2. Check environment variable (second priority)
  const envMock = import.meta.env.VITE_USE_MOCK_DATA;
  if (envMock !== undefined) {
    return {
      enabled: envMock === 'true' || envMock === '1',
      source: 'env'
    };
  }

  // 3. Check URL parameter (third priority - for quick testing)
  const urlParams = new URLSearchParams(window.location.search);
  const urlMock = urlParams.get('mock');
  if (urlMock !== null) {
    return {
      enabled: urlMock === 'true' || urlMock === '1',
      source: 'url'
    };
  }

  // 4. Default to false (use real data)
  return {
    enabled: false,
    source: 'default'
  };
};

/**
 * Enable mock data (uses localStorage)
 */
export const enableMockData = (): void => {
  localStorage.setItem('useMockData', 'true');
  // Reload the page to apply changes
  window.location.reload();
};

/**
 * Disable mock data (clears localStorage)
 */
export const disableMockData = (): void => {
  localStorage.setItem('useMockData', 'false');
  // Reload the page to apply changes
  window.location.reload();
};

/**
 * Toggle mock data
 */
export const toggleMockData = (): void => {
  const config = getMockConfig();
  if (config.enabled) {
    disableMockData();
  } else {
    enableMockData();
  }
};

/**
 * Get current mock status as a human-readable string
 */
export const getMockStatus = (): string => {
  const config = getMockConfig();
  const status = config.enabled ? 'ENABLED' : 'DISABLED';
  const source = config.source.toUpperCase();
  return `Mock Data: ${status} (via ${source})`;
};

/**
 * Check if mock data is currently enabled
 */
export const isMockEnabled = (): boolean => {
  return getMockConfig().enabled;
};
