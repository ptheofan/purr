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

export function prettyUptime(startedAt: string, isMobile: boolean = false): string {
  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  const uptimeMs = now - startTime;
  
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (isMobile) {
    // Mobile format: show only days with + for longer uptimes
    if (days > 0) {
      return `${days}d+`;
    } else if (hours > 0) {
      return `${hours}h+`;
    } else if (minutes > 0) {
      return `${minutes}m+`;
    } else {
      return `${seconds}s`;
    }
  } else {
    // Desktop format: show detailed breakdown
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
