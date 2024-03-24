import { registerEnumType } from '@nestjs/graphql';

export enum DownloadStatus {
  Pending = 'Pending',
  Paused = 'Paused',
  Downloading = 'Downloading',
  Completed = 'Completed',
  Error = 'Error',
}

registerEnumType(DownloadStatus, {
  name: 'DownloadStatus',
  description: 'The status of this download',
});
