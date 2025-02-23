import crc32 from 'crc/crc32';
import * as path from 'path';
import { createReadStream } from 'fs';

export async function crc32File(filePath: string) {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const stream = createReadStream(filePath, {
      highWaterMark: 1024 * 1024 // 1MB chunks
    });

    stream.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const crc = crc32(buffer);
      // Pad with zeros to 8 characters
      resolve(crc.toString(16).padStart(8, '0'));
    });

    stream.on('error', (error) => {
      reject(new Error(`Failed to calculate CRC32 for ${filePath}: ${error.message}`));
    });
  });
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
    throw new Error(`Path ${targetPath} is outside the root folder ${root}.`);
  }

  return rVal;
}
