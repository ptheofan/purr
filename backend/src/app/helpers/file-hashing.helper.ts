import fs from 'fs';
import crc32 from 'crc/crc32';


// Function to compute CRC32 checksum of a file
export async function crc32File(filePath: string) {
  return crc32(fs.readFileSync(filePath)).toString(16);
}
