import fs from 'fs';
import crc32 from 'crc/crc32';
import * as path from 'path';


// Function to compute CRC32 checksum of a file
export async function crc32File(filePath: string) {
  return crc32(fs.readFileSync(filePath)).toString(16);
}

/**
 * Either targetPath is a sub-folder of root or it will be prefixed as
 * a sub-folder of root.
 *
 * If due to special characters (such as '..') the resulting targetPath
 * is not a sub-folder of root an exception is thrown.
 */
export function restrictFolderToRoot(targetPath: string, root: string): string {
  let rVal = targetPath;
  if (!targetPath.startsWith(root)) {
    // prefix and set absolute path
    rVal = path.join(root, targetPath);
  }

  // Convert to absolute path
  rVal = path.resolve(rVal);

  if (!rVal.startsWith(root)) {
    throw new Error(`Path ${targetPath} violates root folder ${root}.`);
  }

  return rVal;
}
