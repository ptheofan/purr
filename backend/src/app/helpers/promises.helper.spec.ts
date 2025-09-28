import { waitFor } from './promises.helper';

describe('waitFor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('milliseconds', () => {
    it('should wait for milliseconds', async () => {
      const ms = 1000;
      const promise = waitFor({ ms });

      jest.advanceTimersByTime(ms);
      await promise;
    });

    it('should wait for zero milliseconds', async () => {
      const ms = 0;
      const promise = waitFor({ ms });

      jest.advanceTimersByTime(ms);
      await promise;
    });
  });

  describe('seconds', () => {
    it('should wait for seconds', async () => {
      const sec = 1;
      const ms = sec * 1000;
      const promise = waitFor({ sec });

      jest.advanceTimersByTime(ms);
      await promise;
    });

    it('should wait for fractional seconds', async () => {
      const sec = 0.5;
      const ms = sec * 1000;
      const promise = waitFor({ sec });

      jest.advanceTimersByTime(ms);
      await promise;
    });
  });

  describe('minutes', () => {
    it('should wait for minutes', async () => {
      const min = 0.1;
      const ms = min * 60000;
      const promise = waitFor({ min });

      jest.advanceTimersByTime(ms);
      await promise;
    });

    it('should wait for fractional minutes', async () => {
      const min = 0.5;
      const ms = min * 60000;
      const promise = waitFor({ min });

      jest.advanceTimersByTime(ms);
      await promise;
    });
  });

  describe('error handling', () => {
    it('should throw error for negative milliseconds', () => {
      expect(() => waitFor({ ms: -1000 })).toThrow('Wait time cannot be negative');
    });

    it('should throw error for negative seconds', () => {
      expect(() => waitFor({ sec: -1 })).toThrow('Wait time cannot be negative');
    });

    it('should throw error for negative minutes', () => {
      expect(() => waitFor({ min: -0.1 })).toThrow('Wait time cannot be negative');
    });
  });

  describe('type safety', () => {
    it('should handle undefined values correctly', () => {
      // This test ensures TypeScript compilation works correctly
      const msOption = { ms: 1000 } as const;
      const secOption = { sec: 1 } as const;
      const minOption = { min: 0.1 } as const;

      expect(() => waitFor(msOption)).not.toThrow();
      expect(() => waitFor(secOption)).not.toThrow();
      expect(() => waitFor(minOption)).not.toThrow();
    });
  });
});
