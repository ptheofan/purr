import { waitFor } from './promises.helper'

    describe('waitFor', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should wait for milliseconds', async () => {
        const ms = 1000;
        const promise = waitFor({ ms });

        jest.advanceTimersByTime(ms);
        await promise;
      });

      it('should wait for seconds', async () => {
        const sec = 1;
        const ms = sec * 1000;
        const promise = waitFor({ sec });

        jest.advanceTimersByTime(ms);
        await promise;
      });

      it('should wait for minutes', async () => {
        const min = 0.1;
        const ms = min * 60000;
        const promise = waitFor({ min });

        jest.advanceTimersByTime(ms);
        await promise;
      });
    });
