import { gql } from '../__generated__';
import { GroupWithItemsFragment } from '../fragments';

// Create a download from Put.io file ID
export const CREATE_DOWNLOAD_FROM_PUTIO = gql(`
  mutation CreateDownloadFromPutio($putioId: Int!, $saveAt: String!) {
    createDownloadFromPutio(putioId: $putioId, saveAt: $saveAt) {
      success
      message
      group {
        ...GroupWithItems
      }
    }
  }
`);
