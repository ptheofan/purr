import { WorkerManager } from './worker-manager';

jest.mock('../../../helpers/promises.helper', () => ({
  waitFor: jest.fn().mockResolvedValue(undefined)
}));

describe('WorkerManager', () => {
  let manager: WorkerManager;
  const mockDate = new Date('2024-01-01T14:00:00+00:00');  // Force UTC timezone

  beforeEach(() => {
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    Date.now = jest.fn(() => mockDate.getTime());
    manager = new WorkerManager();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('worker lifecycle', () => {
    it('should create worker with unique id and initial stats', () => {
      const worker = manager.createWorker();

      expect(worker.id).toBe('w-1-2024-01-01-14-00');
      expect(worker.bytesDownloaded).toBe(0);
      expect(worker.retryCount).toBe(0);
      expect(worker.speed).toBe(0);
    });

    it('should increment worker counter in id', () => {
      const worker1 = manager.createWorker();
      const worker2 = manager.createWorker();

      expect(worker1.id).toBe('w-1-2024-01-01-14-00');
      expect(worker2.id).toBe('w-2-2024-01-01-14-00');
    });

    it('should track active workers', () => {
      const worker1 = manager.createWorker();
      const worker2 = manager.createWorker();

      expect(manager.activeWorkers.size).toBe(2);
      expect(manager.activeWorkers.get(worker1.id)).toBeDefined();
      expect(manager.activeWorkers.get(worker2.id)).toBeDefined();
    });

    it('should remove worker', () => {
      const worker = manager.createWorker();
      manager.removeWorker(worker.id);

      expect(manager.activeWorkers.size).toBe(0);
      expect(manager.activeWorkers.get(worker.id)).toBeUndefined();
    });

    it('should update worker stats', () => {
      const worker = manager.createWorker();
      const bytes = 1024;

      const laterDate = new Date('2024-01-01T14:01:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => laterDate);
      Date.now = jest.fn(() => laterDate.getTime());

      manager.updateWorkerStats(worker.id, bytes);

      const updated = manager.getWorker(worker.id);
      expect(updated?.bytesDownloaded).toBe(bytes);
      expect(updated?.lastUpdate).toBe(laterDate.getTime());
    });
  });

  describe('restart', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.skip('should clear all workers on restart', async () => {
      const abortFn = jest.fn().mockImplementation(() => {
        manager.removeWorker(worker1.id);
        manager.removeWorker(worker2.id);
      });

      jest.spyOn(global, 'AbortController').mockImplementation(() => ({
        signal: { aborted: false },
        abort: abortFn,
      } as unknown as AbortController));

      const worker1 = manager.createWorker();
      const worker2 = manager.createWorker();

      const promise = manager.restart();
      jest.advanceTimersByTime(100);
      await promise;

      expect(abortFn).toHaveBeenCalled();
      expect(manager.activeWorkers.size).toBe(0);
    });

    it('should create new abort signal after restart', async () => {
      const oldSignal = manager.signal;
      const promise = manager.restart();
      jest.runAllTimers();
      await promise;

      expect(manager.signal).not.toBe(oldSignal);
      expect(oldSignal.aborted).toBe(true);
      expect(manager.signal.aborted).toBe(false);
    });
  });

  describe('waitForWorkersToStop', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should resolve immediately when no workers exist', async () => {
      const promise = manager.waitForWorkersToStop();
      jest.runAllTimers();
      await promise;
    });

    it('should resolve when all workers are removed', async () => {
      const worker1 = manager.createWorker();
      const worker2 = manager.createWorker();

      const promise = manager.waitForWorkersToStop();
      manager.removeWorker(worker1.id);
      manager.removeWorker(worker2.id);
      jest.runAllTimers();

      await promise;
    });

    it('should timeout after specified duration', async () => {
      const timeoutMs = 5000;
      manager.createWorker();

      const promise = manager.waitForWorkersToStop(timeoutMs);
      jest.advanceTimersByTime(timeoutMs + 100);

      await expect(promise).rejects.toThrow('Timeout waiting for workers to stop');
    });
  });
});
