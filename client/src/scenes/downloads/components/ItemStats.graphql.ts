import { gql } from '@apollo/client';

export const ITEM_STATS_SUBSCRIPTION = gql`
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

export const GET_ITEM_STATS = gql`
  query GetItemStats($itemId: Int!) {
    getItem(id: $itemId) {
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

export enum FragmentStatus {
  finished = 'finished',
  pending = 'pending',
  reserved = 'reserved'
}

export interface FragmentDto {
  start: number;
  end: number;
  status: FragmentStatus;
}

export interface HistogramDto {
  granularity: number;
  since: string;
  until: string;
  values: number[];
}

export interface WorkerStatsDto {
  id: string;
  downloadedBytes: string;
  speed: string;
}

export interface ItemStatsDto {
  itemId: number;
  bytesSinceLastEvent: string;
  downloadedBytes: string;
  fragments: FragmentDto[];
  histogram?: HistogramDto;
  restartedAt?: string;
  speed: string;
  startedAt?: string;
  workers: WorkerStatsDto[];
}

export interface ItemStatsSubscriptionResult {
  itemStatsUpdated: ItemStatsDto;
}

export interface ItemQueryResult {
  getItem: {
    id: number;
    name: string;
    relativePath: string;
    size: string;
    status: string;
    groupId: number;
    crc32?: string;
    downloadLink?: string;
    error?: string;
  };
}