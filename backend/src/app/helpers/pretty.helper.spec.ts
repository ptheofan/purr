import { prettyBytes, prettyTime, prettyTimeOfDay } from './pretty.helper';

describe('prettyBytes', () => {
  it('should format bytes correctly', () => {
    expect(prettyBytes(0)).toBe('0 B');
    expect(prettyBytes(1)).toBe('1 B');
    expect(prettyBytes(500)).toBe('500 B');
    expect(prettyBytes(1023)).toBe('1023 B');
  });

  it('should format kilobytes correctly', () => {
    expect(prettyBytes(1024)).toBe('1 kB');
    expect(prettyBytes(1536)).toBe('1.5 kB');
    expect(prettyBytes(10240)).toBe('10 kB');
    expect(prettyBytes(102400)).toBe('100 kB');
  });

  it('should format megabytes correctly', () => {
    expect(prettyBytes(1024 * 1024)).toBe('1 MB');
    expect(prettyBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
    expect(prettyBytes(1024 * 1024 * 10)).toBe('10 MB');
    expect(prettyBytes(1024 * 1024 * 100)).toBe('100 MB');
  });

  it('should format gigabytes correctly', () => {
    expect(prettyBytes(1024 * 1024 * 1024)).toBe('1 GB');
    expect(prettyBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
  });

  it('should handle large values', () => {
    expect(prettyBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    expect(prettyBytes(1024 * 1024 * 1024 * 1024 * 1024)).toBe('1 PB');
  });

  it('should handle edge cases', () => {
    expect(prettyBytes(-1)).toBe('0 B');
    expect(prettyBytes(NaN)).toBe('0 B');
    expect(prettyBytes(Infinity)).toBe('0 B');
    expect(prettyBytes(-Infinity)).toBe('0 B');
  });

  it('should use appropriate precision', () => {
    expect(prettyBytes(1024)).toBe('1 kB'); // No decimals for whole numbers
    expect(prettyBytes(1536)).toBe('1.5 kB'); // 1 decimal for small values
    expect(prettyBytes(15360)).toBe('15 kB'); // 1 decimal for values >= 10
    expect(prettyBytes(153600)).toBe('150 kB'); // No decimals for values >= 100
  });
});

describe('prettyTime', () => {
  it('should format milliseconds correctly', () => {
    expect(prettyTime(0)).toBe('0 ms');
    expect(prettyTime(1)).toBe('1 ms');
    expect(prettyTime(500)).toBe('500 ms');
    expect(prettyTime(999)).toBe('999 ms');
  });

  it('should format seconds correctly', () => {
    expect(prettyTime(1000)).toBe('1 s');
    expect(prettyTime(1500)).toBe('1.5 s');
    expect(prettyTime(10000)).toBe('10 s');
    expect(prettyTime(100000)).toBe('1.67 m'); // 100s converts to 1.67m
    expect(prettyTime(59999)).toBe('60 s');
  });

  it('should format minutes correctly', () => {
    expect(prettyTime(60 * 1000)).toBe('1 m');
    expect(prettyTime(60 * 1000 * 1.5)).toBe('1.5 m');
    expect(prettyTime(60 * 1000 * 10)).toBe('10 m');
    expect(prettyTime(60 * 1000 * 100)).toBe('1.67 h'); // 100m converts to 1.67h
    expect(prettyTime(60 * 1000 * 60 - 1)).toBe('60 m');
  });

  it('should format hours correctly', () => {
    expect(prettyTime(60 * 60 * 1000)).toBe('1 h');
    expect(prettyTime(60 * 60 * 1000 * 2.5)).toBe('2.5 h');
    expect(prettyTime(60 * 60 * 1000 * 10)).toBe('10 h');
    expect(prettyTime(60 * 60 * 1000 * 100)).toBe('4.17 d'); // 100h converts to 4.17d
    expect(prettyTime(60 * 60 * 1000 * 24 - 1)).toBe('24 h');
  });

  it('should format days correctly', () => {
    expect(prettyTime(24 * 60 * 60 * 1000)).toBe('1 d');
    expect(prettyTime(24 * 60 * 60 * 1000 * 2.5)).toBe('2.5 d');
    expect(prettyTime(24 * 60 * 60 * 1000 * 10)).toBe('10 d');
  });

  it('should handle edge cases', () => {
    expect(prettyTime(-1)).toBe('0 ms');
    expect(prettyTime(NaN)).toBe('0 ms');
    expect(prettyTime(Infinity)).toBe('0 ms');
    expect(prettyTime(-Infinity)).toBe('0 ms');
  });

  it('should use appropriate precision', () => {
    expect(prettyTime(1000)).toBe('1 s'); // No decimals for whole numbers
    expect(prettyTime(1500)).toBe('1.5 s'); // 1 decimal for small values
    expect(prettyTime(15000)).toBe('15 s'); // 1 decimal for values >= 10
    expect(prettyTime(150000)).toBe('2.5 m'); // 150s converts to 2.5m
  });
});

describe('prettyTimeOfDay', () => {
  it('should format valid timestamps correctly', () => {
    const timestamp = new Date('2023-01-01T12:30:45').getTime();
    const result = prettyTimeOfDay(timestamp);
    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/); // Should match time format
  });

  it('should handle edge cases', () => {
    expect(prettyTimeOfDay(NaN)).toBe('Invalid time');
    expect(prettyTimeOfDay(Infinity)).toBe('Invalid time');
    expect(prettyTimeOfDay(-Infinity)).toBe('Invalid time');
  });

  it('should handle invalid dates', () => {
    // Create an invalid date
    const invalidTimestamp = new Date('invalid').getTime();
    expect(prettyTimeOfDay(invalidTimestamp)).toBe('Invalid time');
  });

  it('should handle zero timestamp', () => {
    const result = prettyTimeOfDay(0);
    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/); // Should be valid epoch time
  });

  it('should handle negative timestamps', () => {
    const result = prettyTimeOfDay(-1000);
    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/); // Should be valid (before epoch)
  });
});
