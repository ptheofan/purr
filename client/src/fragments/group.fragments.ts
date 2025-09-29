import { gql } from '@apollo/client';

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

export const GroupWithItemsFragment = gql`
  fragment GroupWithItems on Group {
    ...GroupBasicInfo
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

export const ItemBasicInfoFragment = gql`
  fragment ItemBasicInfo on Item {
    id
    name
    size
    status
    relativePath
    groupId
  }
`;

export const ItemWithDetailsFragment = gql`
  fragment ItemWithDetails on Item {
    ...ItemBasicInfo
    crc32
    downloadLink
    error
  }
`;
