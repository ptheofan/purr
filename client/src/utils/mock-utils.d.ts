/**
 * Utility functions for managing mock data in development
 */
/**
 * Console commands for easy mock data management
 * Use these in the browser console for quick toggling
 */
export declare const mockUtils: {
    /**
     * Enable mock data and reload the page
     */
    enable: () => void;
    /**
     * Disable mock data and reload the page
     */
    disable: () => void;
    /**
     * Toggle mock data and reload the page
     */
    toggle: () => void;
    /**
     * Get current mock data status
     */
    status: () => string;
    /**
     * Show help information
     */
    help: () => void;
};
