import { WorkerStats } from './downloader.interface';

export class WorkerManager {
  private workers = new Map<string, WorkerStats>();
  private workerCounter = 0;
  private abortController = new AbortController();

  get activeWorkers(): ReadonlyMap<string, WorkerStats> {
    return this.workers;
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  createWorker(): WorkerStats {
    this.workerCounter = (this.workerCounter + 1) % Number.MAX_SAFE_INTEGER;
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hour = String(now.getUTCHours()).padStart(2, '0');
    const minute = String(now.getUTCMinutes()).padStart(2, '0');

    const workerId = `w-${this.workerCounter}-${year}-${month}-${day}-${hour}-${minute}`;
    const workerStats: WorkerStats = {
      id: workerId,
      bytesDownloaded: 0,
      startTime: now.getTime(),
      lastUpdate: now.getTime(),
      speed: 0,
      retryCount: 0
    };

    this.workers.set(workerId, workerStats);
    return workerStats;
  }

  removeWorker(workerId: string): void {
    this.workers.delete(workerId);
  }

  getWorker(workerId: string): WorkerStats | undefined {
    return this.workers.get(workerId);
  }

  updateWorkerStats(workerId: string, bytesDownloaded: number): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.bytesDownloaded += bytesDownloaded;
      worker.lastUpdate = Date.now();
    }
  }

  async restart(): Promise<void> {
    this.abortController.abort();
    await this.waitForWorkersToStop();
    this.abortController = new AbortController();
    this.workers.clear();
  }

  async waitForWorkersToStop(timeoutMs = 30000): Promise<void> {
    if (this.workers.size === 0) return;

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Timeout waiting for workers to stop'));
      }, timeoutMs);

      const interval = setInterval(() => {
        if (this.workers.size === 0) {
          clearTimeout(timeout);
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }

  getWorkerStats(): WorkerStats[] {
    return Array.from(this.workers.values());
  }
}
