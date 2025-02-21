import { DownloadStatus } from '../enums';

export class Item {
  // The file id (IFile.id)
  id: number;

  // The group id (DownloadGroup.id)
  groupId: number;

  // The file
  name: string;

  // The file size in bytes
  size: number;

  // The crc32 hash of the file
  crc32: string | null;

  // The path without the filename for the
  // /some/path/to/filename.mkv it will hold /some/path/to
  relativePath: string;

  // The download link for the file
  downloadLink?: string;

  // The download status, directly linked to the download manager
  status: DownloadStatus = DownloadStatus.Pending;

  // The error message if the status is error
  error?: string;
}
