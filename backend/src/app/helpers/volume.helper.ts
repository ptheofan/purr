import { Volume } from 'memfs/lib/volume';
import { IFile } from '@putdotio/api-client';
import path from 'path';

/**
 * Get the first file or folder in the root of the volume.
 */
export async function getFirstFileOrFolder(volume: Volume): Promise<string | undefined> {
  const filesAndFolders = volume.readdirSync('/');
  if (filesAndFolders.length > 0) {
    return `/${ filesAndFolders[0] as string }`;
  } else {
    return undefined;
  }
}


export async function getMeta(path: string, volume: Volume): Promise<IFile> {
  // Is it directory or file?
  const isDirectory = volume.statSync(path).isDirectory();
  const meta = isDirectory
    ? volume.readFileSync(`${ path }/.meta`, 'utf8')
    : volume.readFileSync(path, 'utf8');

  return JSON.parse(meta as string) as IFile;
}

/**
 * Recursively search for a file or folder in the volume with name that matches the pattern and return
 * the full path to the file or folder (including the file or folder itself)
 */
export function findFileOrFolder(volume: Volume, pattern: string | RegExp, type: 'file' | 'folder', startFolder: string = '/'): string | undefined {
  const filesAndFolders = volume.readdirSync(startFolder);
  for (const fileOrFolder of filesAndFolders) {
    const fullPath = path.join(startFolder, fileOrFolder as string);
    const stat = volume.statSync(fullPath);
    if (type === 'file' && stat.isFile()) {
      if (pattern instanceof RegExp && pattern.test(fileOrFolder as string)) {
        return fullPath;
      } else if (typeof pattern === 'string' && fileOrFolder === pattern) {
        return fullPath;
      }
    } else if (stat.isDirectory()) {
      if (type === 'folder') {
        if (pattern instanceof RegExp && pattern.test(fileOrFolder as string)) {
          return fullPath;
        } else if (typeof pattern === 'string' && fileOrFolder === pattern) {
          return fullPath;
        }
      }

      const result = findFileOrFolder(volume, pattern, type, fullPath);
      if (result) {
        return result;
      }
    }
  }

  return undefined;
}
