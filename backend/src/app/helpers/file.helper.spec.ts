import { restrictFolderToRoot } from './file.helper';
import * as path from 'path';

describe('restrictFolderToRoot', () => {
  it('should restrict target path to root folder', () => {
    const root = '/tmp';
    const targetPath = '/tmp/subfolder';

    const result = restrictFolderToRoot(targetPath, root);

    expect(result).toEqual(targetPath);
  });

  it('should prefix target path with root folder if not a subfolder', () => {
    const root = '/tmp';
    const targetPath = '/subfolder';

    const result = restrictFolderToRoot(targetPath, root);

    expect(result).toEqual(path.join(root, targetPath));
  });

  it('should throw an error if resulting target path is not a subfolder of root', () => {
    const root = '/tmp';
    const targetPath = '/tmp/../subfolder';

    expect(() => restrictFolderToRoot(targetPath, root)).toThrow();
  });
});
