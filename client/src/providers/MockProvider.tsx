import React from 'react';
import { MockedProvider } from '@apollo/client/testing';
import { InMemoryCache } from '@apollo/client';
import { allMocks } from '../mocks/apollo';
import { isMockEnabled, getMockStatus } from '../config/mock';

interface MockProviderProps {
  children: React.ReactNode;
}

/**
 * MockProvider component that conditionally wraps children with MockedProvider
 * when mock data is enabled, otherwise passes through to children.
 */
export const MockProvider: React.FC<MockProviderProps> = ({ children }) => {
  const mockEnabled = isMockEnabled();

  // Log mock status in development
  if (import.meta.env.DEV) {
    console.log(`🔧 ${getMockStatus()}`);
  }

  if (!mockEnabled) {
    // Mock is disabled, just pass through children
    return <>{children}</>;
  }

  // Mock is enabled, wrap with MockedProvider
  return (
    <MockedProvider
      mocks={allMocks}
      cache={new InMemoryCache()}
      addTypename={true}
      defaultOptions={{
        watchQuery: { fetchPolicy: 'cache-and-network' },
        query: { fetchPolicy: 'cache-first' },
      }}
    >
      {children}
    </MockedProvider>
  );
};
