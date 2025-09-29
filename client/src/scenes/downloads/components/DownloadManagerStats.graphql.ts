import { gql } from '@apollo/client';

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

export const GET_DOWNLOAD_MANAGER_STATS = gql`
  query GetDownloadManagerStats {
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

export interface HistogramDto {
  granularity: number;
  since: string;
  until: string;
  values: number[];
}

export interface DownloadManagerStatsDto {
  histogram: HistogramDto;
  lifetimeBytes: string;
  speed: string;
  startedAt: string;
}

export interface DownloadManagerStatsSubscriptionResult {
  downloadManagerStats: DownloadManagerStatsDto;
}

export interface DownloadManagerStatsQueryResult {
  downloadManagerStats: DownloadManagerStatsDto;
}

// Fragment for reuse
export interface DownloadManagerStatsFragment {
  histogram: HistogramDto;
  lifetimeBytes: string;
  speed: string;
  startedAt: string;
}