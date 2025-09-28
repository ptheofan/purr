import { Test } from '@nestjs/testing';
import { WorkerManager } from './worker-manager';

describe('WorkerManager', () => {
  let manager: WorkerManager;
  const mockTimestamp = 1704110400000; // 2024-01-01T14:00:00.000Z

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [WorkerManager],
    }).compile();

    manager = moduleRef.get<WorkerManager>(WorkerManager);
    
    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('worker lifecycle', () => {
    it('should create worker with unique id and initial stats', () => {
      const worker = manager.createWorker();

      expect(worker.id).toBe(`worker-1-${mockTimestamp}`);
      expect(worker.bytesDownloaded).toBe(0);
      expect(worker.retryCount).toBe(0);
      expect(worker.speed).toBe(0);
      expect(worker.startTime).toBe(mockTimestamp);
      expect(worker.lastUpdate).toBe(mockTimestamp);
    });

    it('should increment worker counter in id', () => {
      const worker1 = manager.createWorker();
      const worker2 = manager.createWorker();

      expect(worker1.id).toBe(`worker-1-${mockTimestamp}`);
      expect(worker2.id).toBe(`worker-2-${mockTimestamp}`);
    });

    it('should track active workers', () => {
      const worker1 = manager.createWorker();
      const worker2 = manager.createWorker();

      expect(manager.activeWorkers.size).toBe(2);
      expect(manager.activeWorkers.get(worker1.id)).toBeDefined();
      expect(manager.activeWorkers.get(worker2.id)).toBeDefined();
    });

    it('should remove worker and return boolean', () => {
      const worker = manager.createWorker();
      const result = manager.removeWorker(worker.id);

      expect(result).toBe(true);
      expect(manager.activeWorkers.size).toBe(0);
      expect(manager.activeWorkers.get(worker.id)).toBeUndefined();
    });

    it('should return false when removing non-existent worker', () => {
      const result = manager.removeWorker('non-existent');
      expect(result).toBe(false);
    });

    it('should update worker stats', () => {
      const worker = manager.createWorker();
      const bytes = 1024;
      const laterTimestamp = mockTimestamp + 60000; // 1 minute later
      
      jest.spyOn(Date, 'now').mockReturnValue(laterTimestamp);

      manager.updateWorkerStats(worker.id, bytes);

      const updated = manager.getWorker(worker.id);
      expect(updated?.bytesDownloaded).toBe(bytes);
      expect(updated?.lastUpdate).toBe(laterTimestamp);
    });

    it('should throw error for negative bytes downloaded', () => {
      const worker = manager.createWorker();
      
      expect(() => manager.updateWorkerStats(worker.id, -100)).toThrow('Bytes downloaded cannot be negative');
    });

    it('should not update stats for non-existent worker', () => {
      manager.updateWorkerStats('non-existent', 100);
      // Should not throw and should not affect anything
      expect(manager.activeWorkers.size).toBe(0);
    });
  });

  describe('restart', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should clear all workers on restart', async () => {
      const worker1 = manager.createWorker();
      const worker2 = manager.createWorker();

      const promise = manager.restart();
      
      // Simulate workers being removed
      manager.removeWorker(worker1.id);
      manager.removeWorker(worker2.id);
      
      jest.runAllTimers();
      await promise;

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

    it('should resolve when workers are removed after abort signal', async () => {
      const worker1 = manager.createWorker();
      const worker2 = manager.createWorker();

      const promise = manager.waitForWorkersToStop();
      
      // Simulate workers being removed after abort (this would happen in real scenario)
      manager.removeWorker(worker1.id);
      manager.removeWorker(worker2.id);
      
      jest.runAllTimers();
      await promise;
    });

    it('should resolve waitForWorkersToStop when workers are removed', async () => {
      const worker1 = manager.createWorker();
      const worker2 = manager.createWorker();

      const promise = manager.waitForWorkersToStop();
      
      // Remove workers and verify promise resolves
      manager.removeWorker(worker1.id);
      expect(manager.activeWorkers.size).toBe(1);
      
      manager.removeWorker(worker2.id);
      expect(manager.activeWorkers.size).toBe(0);
      
      jest.runAllTimers();
      await promise; // Should resolve without timeout
    });
  });

  describe('getWorkerStats', () => {
    it('should return empty array when no workers', () => {
      const stats = manager.getWorkerStats();
      expect(stats).toEqual([]);
    });

    it('should return all worker stats', () => {
      const worker1 = manager.createWorker();
      const worker2 = manager.createWorker();

      const stats = manager.getWorkerStats();
      expect(stats).toHaveLength(2);
      expect(stats.map(s => s.id)).toContain(worker1.id);
      expect(stats.map(s => s.id)).toContain(worker2.id);
    });
  });

  describe('signal', () => {
    it('should provide abort signal', () => {
      const signal = manager.signal;
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal.aborted).toBe(false);
    });
  });
});
