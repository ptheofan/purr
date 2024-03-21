export function prettyBytes(bytes: number, perSecond = false): string {
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  if (perSecond) {
    return `${size.toFixed(2)} ${units[unitIndex]}/s`;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};
