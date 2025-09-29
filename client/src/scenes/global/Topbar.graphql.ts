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

export interface HistogramDto {
  granularity: number;
  since: string;
  until: string;
  values: number[];
}

export interface DownloadManagerStatsData {
  histogram: HistogramDto;
  lifetimeBytes: string;
  speed: string;
  startedAt: string;
}

export interface DownloadManagerStatsSubscriptionResult {
  downloadManagerStats: DownloadManagerStatsData;
}