import { useQuery } from '@apollo/client';
import { GET_APP_CONFIG, GET_APP_CONFIG_BASIC } from './useAppConfig.graphql';

// Hook for fetching complete app configuration
export const useAppConfig = () => {
  return useQuery(GET_APP_CONFIG);
};

// Hook for fetching basic app configuration only
export const useAppConfigBasic = () => {
  return useQuery(GET_APP_CONFIG_BASIC);
};
