import { gql } from '@apollo/client';

// Queries
export const GET_GROUPS = gql`
  query GetGroups {
    getGroups {
      id
      name
      saveAt
      state
      status
      addedAt
      items {
        id
        name
        relativePath
        size
        status
        groupId
        crc32
        downloadLink
        error
      }
    }
  }
`;

export const GET_GROUP = gql`
  query GetGroup($id: Int!) {
    getGroup(id: $id) {
      id
      name
      saveAt
      state
      status
      addedAt
      items {
        id
        name
        relativePath
        size
        status
        groupId
        crc32
        downloadLink
        error
      }
    }
  }
`;

export const GET_ITEMS = gql`
  query GetItems {
    getItems {
      id
      name
      relativePath
      size
      status
      groupId
      crc32
      downloadLink
      error
    }
  }
`;

export const GET_ITEM = gql`
  query GetItem($id: Int!) {
    getItem(id: $id) {
      id
      name
      relativePath
      size
      status
      groupId
      crc32
      downloadLink
      error
    }
  }
`;

// Subscriptions
export const DOWNLOAD_MANAGER_STATS_SUBSCRIPTION = gql`
  subscription DownloadManagerStats {
    downloadManagerStats {
      histogram {
        granularity
        since
        until
        values
      }
      lifetimeBytes
      speed
      startedAt
    }
  }
`;

export const GROUP_ADDED_SUBSCRIPTION = gql`
  subscription GroupAdded {
    groupAdded {
      id
      name
      saveAt
      state
      status
      addedAt
      items {
        id
        name
        relativePath
        size
        status
        groupId
        crc32
        downloadLink
        error
      }
    }
  }
`;

export const GROUP_STATE_CHANGED_SUBSCRIPTION = gql`
  subscription GroupStateChanged {
    groupStateChanged {
      id
      state
    }
  }
`;

export const GROUP_STATUS_CHANGED_SUBSCRIPTION = gql`
  subscription GroupStatusChanged {
    groupStatusChanged {
      id
      status
    }
  }
`;

export const ITEM_STATUS_CHANGED_SUBSCRIPTION = gql`
  subscription ItemStatusChanged {
    itemStatusChanged {
      id
      status
    }
  }
`;

export const ITEM_STATS_UPDATED_SUBSCRIPTION = gql`
  subscription ItemStatsUpdated {
    itemStatsUpdated {
      itemId
      bytesSinceLastEvent
      downloadedBytes
      fragments {
        start
        end
        status
      }
      histogram {
        granularity
        since
        until
        values
      }
      restartedAt
      speed
      startedAt
      workers {
        id
        downloadedBytes
        speed
      }
    }
  }
`;