import { gql } from '../__generated__';

export const DownloadManagerStatsFragment = gql(`
  fragment DownloadManagerStats on DownloadManagerStatsDto {
    lifetimeBytes
    speed
    startedAt
    histogram {
      granularity
      since
      until
      values
    }
  }
`);

export const ItemStatsFragment = gql(`
  fragment ItemStats on ItemStatsDto {
    itemId
    downloadedBytes
    bytesSinceLastEvent
    speed
    startedAt
    restartedAt
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
    workers {
      id
      downloadedBytes
      speed
    }
  }
`);
