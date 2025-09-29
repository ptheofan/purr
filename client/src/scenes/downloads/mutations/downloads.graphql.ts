import { gql } from '@apollo/client';

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

export interface Group {
  id: number;
  name: string;
  saveAt: string;
  state: string;
  status: string;
  addedAt: string;
  items?: Array<{
    id: number;
    name: string;
    relativePath: string;
    size: string;
    status: string;
    groupId: number;
    crc32?: string;
    downloadLink?: string;
    error?: string;
  }>;
}

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