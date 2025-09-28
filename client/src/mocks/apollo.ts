import { MockedResponse } from '@apollo/client/testing';
import { 
  GET_GROUPS, 
  GET_GROUP, 
  GET_ITEMS, 
  GET_ITEM,
  CREATE_DOWNLOAD_FROM_PUTIO,
  DOWNLOAD_MANAGER_STATS_SUBSCRIPTION,
  GROUP_ADDED_SUBSCRIPTION,
  GROUP_STATE_CHANGED_SUBSCRIPTION,
  GROUP_STATUS_CHANGED_SUBSCRIPTION,
  ITEM_STATUS_CHANGED_SUBSCRIPTION,
  ITEM_STATS_UPDATED_SUBSCRIPTION
} from '../queries';
import { 
  mockGroups, 
  mockDownloadManagerStats, 
  mockItemStats 
} from './data';

// Mock responses for queries
export const mocks: MockedResponse[] = [
  // GET_GROUPS query
  {
    request: {
      query: GET_GROUPS,
    },
    result: {
      data: {
        getGroups: mockGroups,
      },
    },
  },
  
  // GET_GROUP query (for specific group)
  {
    request: {
      query: GET_GROUP,
      variables: { id: 1 },
    },
    result: {
      data: {
        getGroup: mockGroups[0],
      },
    },
  },
  
  // GET_ITEMS query
  {
    request: {
      query: GET_ITEMS,
    },
    result: {
      data: {
        getItems: mockGroups.flatMap(group => group.items || []),
      },
    },
  },
  
  // GET_ITEM query (for specific item)
  {
    request: {
      query: GET_ITEM,
      variables: { id: 1 },
    },
    result: {
      data: {
        getItem: mockGroups[0].items?.[0],
      },
    },
  },
  
  // CREATE_DOWNLOAD_FROM_PUTIO mutation
  {
    request: {
      query: CREATE_DOWNLOAD_FROM_PUTIO,
      variables: { 
        putioId: 12345,
        saveAt: '/downloads/example'
      },
    },
    result: {
      data: {
        createDownloadFromPutio: {
          __typename: 'CreatePutioDownloadResultDto',
          success: true,
          message: 'Download created successfully',
          group: {
            __typename: 'Group',
            id: 999,
            name: 'New Download from Put.io',
            status: 'Pending',
            state: 'pending',
            addedAt: new Date().toISOString(),
            saveAt: '/downloads/example',
            items: []
          }
        },
      },
    },
  },
];

// Mock subscription responses
export const subscriptionMocks: MockedResponse[] = [
  // DOWNLOAD_MANAGER_STATS_SUBSCRIPTION
  {
    request: {
      query: DOWNLOAD_MANAGER_STATS_SUBSCRIPTION,
    },
    result: {
      data: {
        downloadManagerStats: mockDownloadManagerStats,
      },
    },
  },
  
  // GROUP_ADDED_SUBSCRIPTION
  {
    request: {
      query: GROUP_ADDED_SUBSCRIPTION,
    },
    result: {
      data: {
        groupAdded: {
          __typename: 'Group',
          id: 100,
          name: 'New Group Added',
          status: 'Pending',
          state: 'pending',
          addedAt: new Date().toISOString(),
          saveAt: '/downloads/new',
          items: []
        },
      },
    },
  },
  
  // GROUP_STATE_CHANGED_SUBSCRIPTION
  {
    request: {
      query: GROUP_STATE_CHANGED_SUBSCRIPTION,
    },
    result: {
      data: {
        groupStateChanged: {
          id: 1,
          state: 'active',
        },
      },
    },
  },
  
  // GROUP_STATUS_CHANGED_SUBSCRIPTION
  {
    request: {
      query: GROUP_STATUS_CHANGED_SUBSCRIPTION,
    },
    result: {
      data: {
        groupStatusChanged: {
          id: 1,
          status: 'Downloading',
        },
      },
    },
  },
  
  // ITEM_STATUS_CHANGED_SUBSCRIPTION
  {
    request: {
      query: ITEM_STATUS_CHANGED_SUBSCRIPTION,
    },
    result: {
      data: {
        itemStatusChanged: {
          id: 2,
          status: 'Downloading',
        },
      },
    },
  },
  
  // ITEM_STATS_UPDATED_SUBSCRIPTION
  {
    request: {
      query: ITEM_STATS_UPDATED_SUBSCRIPTION,
    },
    result: {
      data: {
        itemStatsUpdated: mockItemStats,
      },
    },
  },
];

// Combine all mocks
export const allMocks = [...mocks, ...subscriptionMocks];
