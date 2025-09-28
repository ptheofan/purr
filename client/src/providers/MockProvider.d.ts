import React from 'react';
interface MockProviderProps {
    children: React.ReactNode;
}
/**
 * MockProvider component that conditionally wraps children with MockedProvider
 * when mock data is enabled, otherwise passes through to children.
 */
export declare const MockProvider: React.FC<MockProviderProps>;
export {};
