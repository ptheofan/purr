import { gql } from '@apollo/client';

// Download Manager Stats Fragment
export const DownloadManagerStatsFragment = gql`
  fragment DownloadManagerStats on DownloadManagerStatsDto {
    totalGroups
    activeGroups
    totalItems
    completedItems
    failedItems
    totalSize
    downloadedSize
    speed
    startedAt
    lifetimeBytes
  }
`;

// Group Basic Info Fragment
export const GroupBasicInfoFragment = gql`
  fragment GroupBasicInfo on Group {
    id
    name
    status
    state
    addedAt
    saveAt
  }
`;

// Group With Items Fragment
export const GroupWithItemsFragment = gql`
  fragment GroupWithItems on Group {
    id
    name
    status
    state
    addedAt
    saveAt
    items {
      id
      name
      size
      status
      relativePath
      error
    }
  }
`;

// Item Basic Info Fragment
export const ItemBasicInfoFragment = gql`
  fragment ItemBasicInfo on GroupItem {
    id
    name
    size
    status
    relativePath
  }
`;

// Export all fragments for easy importing (commented out to avoid conflicts)
// export * from './config.fragments';
// export * from './group.fragments';
// export * from './stats.fragments';
