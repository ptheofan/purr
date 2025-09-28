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
export declare const getMockConfig: () => MockConfig;
/**
 * Enable mock data (uses localStorage)
 */
export declare const enableMockData: () => void;
/**
 * Disable mock data (clears localStorage)
 */
export declare const disableMockData: () => void;
/**
 * Toggle mock data
 */
export declare const toggleMockData: () => void;
/**
 * Get current mock status as a human-readable string
 */
export declare const getMockStatus: () => string;
/**
 * Check if mock data is currently enabled
 */
export declare const isMockEnabled: () => boolean;
