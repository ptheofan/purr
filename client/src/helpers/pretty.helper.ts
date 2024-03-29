export function prettyBytes(bytes: number): string {
  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function prettyTime(ms: number): string {
  const units = ['ms', 's', 'm', 'h', 'd'];
  let time = ms;
  let unitIndex = 0;

  while (time >= 1000 && unitIndex < units.length - 1) {
    time /= 1000;
    unitIndex++;
  }

  // if trailing zeros, remove them
  if (time % 1 === 0) {
    return `${Math.floor(time)} ${units[unitIndex]}`;
  }
  return `${time.toFixed(2)} ${units[unitIndex]}`;
}

export function prettyTimeOfDay(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString();
}
