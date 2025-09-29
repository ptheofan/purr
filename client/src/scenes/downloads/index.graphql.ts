import { gql } from '@apollo/client';

export const GET_DOWNLOAD_GROUPS = gql`
  query GetDownloadGroups {
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

export enum DownloadStatus {
  Completed = 'Completed',
  Downloading = 'Downloading',
  Error = 'Error',
  Paused = 'Paused',
  Pending = 'Pending'
}

export enum GroupState {
  Initializing = 'Initializing',
  Ready = 'Ready'
}

export interface Item {
  id: number;
  name: string;
  relativePath: string;
  size: string;
  status: DownloadStatus;
  groupId: number;
  crc32?: string;
  downloadLink?: string;
  error?: string;
}

export interface Group {
  id: number;
  name: string;
  saveAt: string;
  state: GroupState;
  status: DownloadStatus;
  addedAt: string;
  items?: Item[];
}

export interface GroupStateChangedDto {
  id: number;
  state: GroupState;
}

export interface GroupStatusChangedDto {
  id: number;
  status: DownloadStatus;
}

export interface ItemStatusChangedDto {
  id: number;
  status: DownloadStatus;
}

export interface DownloadsQueryResult {
  getGroups: Group[];
}

export interface GroupAddedSubscriptionResult {
  groupAdded: Group;
}

export interface GroupStateChangedSubscriptionResult {
  groupStateChanged: GroupStateChangedDto;
}

export interface GroupStatusChangedSubscriptionResult {
  groupStatusChanged: GroupStatusChangedDto;
}

export interface ItemStatusChangedSubscriptionResult {
  itemStatusChanged: ItemStatusChangedDto;
}

// Legacy alias for backward compatibility
export interface DownloadsSubscriptionResult {
  groupProgress?: Group;
}

// Mutations
export const CREATE_DOWNLOAD_FROM_PUTIO = gql`
  mutation CreateDownloadFromPutio($putioId: Int!, $saveAt: String!) {
    createDownloadFromPutio(putioId: $putioId, saveAt: $saveAt) {
      success
      message
      group {
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
  }
`;

export interface CreatePutioDownloadResultDto {
  success: boolean;
  message?: string;
  group?: Group;
}

export interface CreateDownloadFromPutioMutationResult {
  createDownloadFromPutio: CreatePutioDownloadResultDto;
}

export interface CreateDownloadFromPutioMutationVariables {
  putioId: number;
  saveAt: string;
}