import { gql } from '../__generated__';
import { GroupWithItemsFragment, DownloadManagerStatsFragment, ItemStatsFragment } from '../fragments';

// Subscribe to download manager stats
export const DOWNLOAD_MANAGER_STATS_SUBSCRIPTION = gql(`
  subscription DownloadManagerStats {
    downloadManagerStats {
      ...DownloadManagerStats
    }
  }
`);

// Subscribe to new groups being added
export const GROUP_ADDED_SUBSCRIPTION = gql(`
  subscription GroupAdded {
    groupAdded {
      ...GroupBasicInfo
      ...GroupWithItems
    }
  }
`);

// Subscribe to group state changes
export const GROUP_STATE_CHANGED_SUBSCRIPTION = gql(`
  subscription GroupStateChanged {
    groupStateChanged {
      id
      state
    }
  }
`);

// Subscribe to group status changes
export const GROUP_STATUS_CHANGED_SUBSCRIPTION = gql(`
  subscription GroupStatusChanged {
    groupStatusChanged {
      id
      status
    }
  }
`);

// Subscribe to item status changes
export const ITEM_STATUS_CHANGED_SUBSCRIPTION = gql(`
  subscription ItemStatusChanged {
    itemStatusChanged {
      id
      status
    }
  }
`);

// Subscribe to item stats updates
export const ITEM_STATS_UPDATED_SUBSCRIPTION = gql(`
  subscription ItemStatsUpdated {
    itemStatsUpdated {
      ...ItemStats
    }
  }
`);
