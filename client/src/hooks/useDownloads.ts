import { useQuery, useSubscription, useMutation } from '@apollo/client';
import { 
  GET_GROUPS, 
  GET_GROUP, 
  GET_ITEMS, 
  GET_ITEM,
  CREATE_DOWNLOAD_FROM_PUTIO,
  DOWNLOAD_MANAGER_STATS_SUBSCRIPTION,
  GROUP_ADDED_SUBSCRIPTION,
  GROUP_STATUS_CHANGED_SUBSCRIPTION,
  ITEM_STATUS_CHANGED_SUBSCRIPTION
} from '../queries';

// Hook for fetching all download groups
export const useDownloadGroups = () => {
  return useQuery(GET_GROUPS);
};

// Hook for fetching a specific group
export const useDownloadGroup = (id: number) => {
  return useQuery(GET_GROUP, {
    variables: { id },
    skip: !id
  });
};

// Hook for fetching all items
export const useDownloadItems = () => {
  return useQuery(GET_ITEMS);
};

// Hook for fetching a specific item
export const useDownloadItem = (id: number) => {
  return useQuery(GET_ITEM, {
    variables: { id },
    skip: !id
  });
};

// Hook for creating a download from Put.io
export const useCreateDownloadFromPutio = () => {
  return useMutation(CREATE_DOWNLOAD_FROM_PUTIO, {
    refetchQueries: [GET_GROUPS],
    awaitRefetchQueries: true
  });
};

// Hook for download manager stats subscription
export const useDownloadManagerStats = () => {
  return useSubscription(DOWNLOAD_MANAGER_STATS_SUBSCRIPTION);
};

// Hook for new group added subscription
export const useGroupAdded = () => {
  return useSubscription(GROUP_ADDED_SUBSCRIPTION);
};

// Hook for group status changes subscription
export const useGroupStatusChanged = () => {
  return useSubscription(GROUP_STATUS_CHANGED_SUBSCRIPTION);
};

// Hook for item status changes subscription
export const useItemStatusChanged = () => {
  return useSubscription(ITEM_STATUS_CHANGED_SUBSCRIPTION);
};
