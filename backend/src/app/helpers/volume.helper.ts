import { Volume } from 'memfs/lib/volume';
import { IFile } from '@putdotio/api-client';
import path from 'path';

/**
 * Get the first file or folder in the root of the volume.
 * @param volume - The memfs volume to search in
 * @returns The path to the first file or folder, or undefined if empty
 */
export function getFirstFileOrFolder(volume: Volume): string | undefined {
  const filesAndFolders = volume.readdirSync('/');
  return filesAndFolders.length > 0 ? `/${filesAndFolders[0] as string}` : undefined;
}

/**
 * Get metadata for a file or folder from the volume.
 * For directories, reads the .meta file; for files, reads the file content directly.
 * @param filePath - The path to the file or folder
 * @param volume - The memfs volume to read from
 * @returns Parsed metadata as IFile object
 * @throws Error if the file doesn't exist or contains invalid JSON
 */
export function getMeta(filePath: string, volume: Volume): IFile {
  try {
    const isDirectory = volume.statSync(filePath).isDirectory();
    const metaPath = isDirectory ? `${filePath}/.meta` : filePath;
    const meta = volume.readFileSync(metaPath, 'utf8');
    
    return JSON.parse(meta as string) as IFile;
  } catch (error) {
    throw new Error(`Failed to read metadata for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a filename matches the given pattern.
 * @param filename - The filename to test
 * @param pattern - String or RegExp pattern to match against
 * @returns True if the filename matches the pattern
 */
function matchesPattern(filename: string, pattern: string | RegExp): boolean {
  return pattern instanceof RegExp ? pattern.test(filename) : filename === pattern;
}

/**
 * Recursively search for a file or folder in the volume with name that matches the pattern.
 * @param volume - The memfs volume to search in
 * @param pattern - String or RegExp pattern to match against filenames
 * @param type - Whether to search for 'file' or 'folder'
 * @param startFolder - The folder to start searching from (defaults to '/')
 * @returns The full path to the matching file or folder, or undefined if not found
 */
export function findFileOrFolder(
  volume: Volume, 
  pattern: string | RegExp, 
  type: 'file' | 'folder', 
  startFolder: string = '/'
): string | undefined {
  const filesAndFolders = volume.readdirSync(startFolder);
  
  for (const fileOrFolder of filesAndFolders) {
    const fullPath = path.join(startFolder, fileOrFolder as string);
    const stat = volume.statSync(fullPath);
    
    // Check if current item matches the criteria
    if (type === 'file' && stat.isFile() && matchesPattern(fileOrFolder as string, pattern)) {
      return fullPath;
    }
    
    if (type === 'folder' && stat.isDirectory() && matchesPattern(fileOrFolder as string, pattern)) {
      return fullPath;
    }
    
    // Recursively search in subdirectories
    if (stat.isDirectory()) {
      const result = findFileOrFolder(volume, pattern, type, fullPath);
      if (result) {
        return result;
      }
    }
  }

  return undefined;
}
