import { Volume } from 'memfs/lib/volume';
import { IFile } from '@putdotio/api-client';

/**
 * Get the first file or folder in the root of the volume.
 */
export async function getFirstFileOrFolder(volume: Volume): Promise<string | undefined> {
  const filesAndFolders = volume.readdirSync('/');
  if (filesAndFolders.length > 0) {
    return `/${filesAndFolders[0] as string}`;
  } else {
    return undefined;
  }
}


export async function getMeta(path: string, volume: Volume): Promise<IFile> {
  // Is it directory or file?
  const isDirectory = volume.statSync(path).isDirectory();
  const meta = isDirectory
    ? volume.readFileSync(`${path}/.meta`, 'utf8')
    : volume.readFileSync(path, 'utf8');

  return JSON.parse(meta as string) as IFile;
}
