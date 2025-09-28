/**
 * Formats a number of bytes into a human-readable string with appropriate units
 * @param bytes - The number of bytes to format
 * @returns A formatted string with the appropriate unit (B, kB, MB, GB, etc.)
 */
export function prettyBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }

  const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  // Use dynamic precision: no decimals for whole numbers, 1 decimal for small values, 2 for larger
  const precision = size >= 100 ? 0 : size >= 10 ? 1 : 2;
  const formattedSize = size.toFixed(precision);
  // Remove trailing zeros and decimal point if not needed
  const cleanSize = parseFloat(formattedSize).toString();
  return `${cleanSize} ${units[unitIndex]}`;
}

/**
 * Formats a number of milliseconds into a human-readable time string with appropriate units
 * @param ms - The number of milliseconds to format
 * @returns A formatted string with the appropriate time unit (ms, s, m, h, d)
 */
export function prettyTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '0 ms';
  }

  const conversions = [
    { threshold: 1000, divisor: 1000, unit: 's' },
    { threshold: 60, divisor: 60, unit: 'm' },
    { threshold: 60, divisor: 60, unit: 'h' },
    { threshold: 24, divisor: 24, unit: 'd' }
  ];

  let time = ms;
  let unit = 'ms';

  for (const conversion of conversions) {
    if (time >= conversion.threshold) {
      time /= conversion.divisor;
      unit = conversion.unit;
    } else {
      break;
    }
  }

  // Use dynamic precision: no decimals for whole numbers, 1 decimal for small values, 2 for larger
  const precision = time >= 100 ? 0 : time >= 10 ? 1 : 2;
  const formattedTime = time.toFixed(precision);
  // Remove trailing zeros and decimal point if not needed
  const cleanTime = parseFloat(formattedTime).toString();
  return `${cleanTime} ${unit}`;
}

/**
 * Formats a timestamp into a localized time string
 * @param ms - The number of milliseconds since epoch
 * @returns A formatted time string in the user's locale
 */
export function prettyTimeOfDay(ms: number): string {
  if (!Number.isFinite(ms)) {
    return 'Invalid time';
  }

  const date = new Date(ms);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid time';
  }

  return date.toLocaleTimeString();
}
