import { DownloadStatus, GroupState } from "../enums";

/**
 * A group represents a set of files that should be downloaded together.
 * The group itself is practically a container of properties for the files
 * that belong to it.
 */
export class Group {
  // The folder id (IFile.id)
  id: number;

  // The date when the group was added
  addedAt: Date;

  // The IFile.name of the folder or file
  name: string;

  // The local path to save the files at
  // Resulting path will be `${ saveAt }/item.relativePath/item.name`
  saveAt: string;

  // The download status. This directly indicates what the group
  // status is in the download manager.
  status: DownloadStatus = DownloadStatus.Pending;

  // The state of the group (initializing, ready, etc.)
  // Adding and creating groups is a time-consuming process. This state
  // helps to understand the current state of the group. A group should
  // be processed only if the state is ready.
  state: GroupState = GroupState.Initializing;
}
