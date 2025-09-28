import * as path from 'path';
import { createReadStream } from 'fs';

/**
 * Calculate CRC32 checksum for a file of any size
 * @param filePath Path to the file
 * @returns Promise resolving to CRC32 checksum as an 8-character hex string
 */
export async function crc32File(filePath: string): Promise<string> {
  // Create CRC32 table
  const crcTable = makeCRCTable();

  return new Promise((resolve, reject) => {
    // Start with initial CRC value
    let crc = 0xFFFFFFFF;

    const stream = createReadStream(filePath, {
      highWaterMark: 1024 * 1024 // 1MB chunks
    });

    stream.on('data', (chunk) => {
      // Process each byte in the chunk
      for (let i = 0; i < chunk.length; i++) {
        const byte = chunk[i] as number;
        crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xFF];
      }
    });

    stream.on('end', () => {
      // Finalize CRC calculation
      crc = (crc ^ 0xFFFFFFFF) >>> 0;
      // Convert to hex and pad with zeros to 8 characters
      resolve(crc.toString(16).padStart(8, '0'));
    });

    stream.on('error', (error) => {
      reject(new Error(`Failed to calculate CRC32 for ${filePath}: ${error.message}`));
    });
  });
}

/**
 * Generate the CRC32 lookup table
 * @returns CRC32 lookup table
 */
function makeCRCTable(): number[] {
  const table = new Array(256);
  let c: number;

  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }

  return table;
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
