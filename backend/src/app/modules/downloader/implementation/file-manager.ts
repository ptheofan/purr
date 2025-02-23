import { open } from 'fs/promises';
import * as path from 'path';
import * as fsp from 'node:fs/promises';

export class FileManager {
  constructor(private readonly saveAs: string) {}

  async initializeFile(totalBytes: number): Promise<void> {
    const saveAsDir = path.dirname(this.saveAs);
    await fsp.mkdir(saveAsDir, { recursive: true });

    const createHandle = await open(this.saveAs, 'w+');
    await createHandle.truncate(totalBytes);
    await createHandle.close();
  }

  async openFileForWriting(): Promise<any> {
    return await open(this.saveAs, 'r+');
  }
}
