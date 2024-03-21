import { DownloadStatus } from '../enums';

/**
 * A group represents a set of files that should be downloaded together.
 * The group itself is practically a container of properties for the files
 * that belong to it.
 */
export class Group {
  // The folder id (IFile.id)
  id: number;

  // The IFile.name of the folder or file
  name: string;

  // The local path to save the files at
  // Resulting path will be `${ saveAt }/item.relativePath/item.name`
  saveAt: string;

  // The download status
  status: DownloadStatus = DownloadStatus.Pending;
}
