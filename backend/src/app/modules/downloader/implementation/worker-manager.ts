import { WorkerStats } from './downloader.interface';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';

/**
 * Manages download workers with lifecycle tracking and abort signal handling
 */
export class WorkerManager extends EventEmitter2 {
  private readonly logger = new Logger(WorkerManager.name);
  private workers = new Map<string, WorkerStats>();
  private workerCounter = 0;
  private abortController = new AbortController();
  private allWorkersStoppedPromise: Promise<void> | null = null;
  private allWorkersStoppedResolver: (() => void) | null = null;
  private allWorkersStoppedResolvers: Array<() => void> = []; // Keep for backward compatibility during migration
  private disposed = false;

  constructor() {
    super();
  }

  get activeWorkers(): ReadonlyMap<string, WorkerStats> {
    return this.workers;
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * Creates a new worker with unique ID and initial stats
   */
  createWorker(): WorkerStats {
    this.workerCounter = (this.workerCounter + 1) % Number.MAX_SAFE_INTEGER;
    const now = Date.now();

    const workerId = `worker-${this.workerCounter}-${now}`;
    const workerStats: WorkerStats = {
      id: workerId,
      bytesDownloaded: 0,
      startTime: now,
      lastUpdate: now,
      speed: 0,
      retryCount: 0
    };

    this.workers.set(workerId, workerStats);
    return workerStats;
  }

  /**
   * Removes a worker from tracking and resolves pending promises if all workers are done
   */
  removeWorker(workerId: string): boolean {
    const worker = this.workers.get(workerId);
    if (!worker) return false;

    const removed = this.workers.delete(workerId);

    if (removed) {
      // this.logger.debug(`Removed worker ${workerId}`);
      this.emit('worker.removed', worker);

      // If all workers are removed, resolve any pending waitForWorkersToStop promises
      if (this.workers.size === 0) {
        // Handle new promise pattern
        if (this.allWorkersStoppedResolver) {
          this.allWorkersStoppedResolver();
          this.allWorkersStoppedResolver = null;
          this.allWorkersStoppedPromise = null;
        }
        // Handle old resolvers pattern (backward compatibility)
        if (this.allWorkersStoppedResolvers.length > 0) {
          const resolvers = [...this.allWorkersStoppedResolvers];
          this.allWorkersStoppedResolvers.length = 0;
          resolvers.forEach(resolve => resolve());
        }
      }
    }

    return removed;
  }

  /**
   * Gets worker stats by ID
   */
  getWorker(workerId: string): WorkerStats | undefined {
    return this.workers.get(workerId);
  }

  /**
   * Updates worker download progress
   */
  updateWorkerStats(workerId: string, bytesDownloaded: number): void {
    if (bytesDownloaded < 0) {
      throw new Error('Bytes downloaded cannot be negative');
    }

    const worker = this.workers.get(workerId);
    if (worker) {
      worker.bytesDownloaded += bytesDownloaded;
      worker.lastUpdate = Date.now();
    }
  }

  /**
   * Aborts all workers and clears the manager state
   */
  async restart(): Promise<void> {
    this.abortController.abort();
    await this.waitForWorkersToStop();
    this.abortController = new AbortController();
    this.workers.clear();
    this.allWorkersStoppedResolvers.length = 0; // Clear any pending resolvers
  }

  /**
   * Waits for all workers to be removed (stopped) using resolver pattern - no polling, no events
   */
  async waitForWorkersToStop(timeoutMs = 30000): Promise<void> {
    if (this.workers.size === 0) return;

    return new Promise<void>((resolve, reject) => {
      // Register resolver to be called when last worker is removed
      this.allWorkersStoppedResolvers.push(resolve);

      const timeout = setTimeout(() => {
        // Remove our resolver from the list if timeout occurs
        const index = this.allWorkersStoppedResolvers.indexOf(resolve);
        if (index > -1) {
          this.allWorkersStoppedResolvers.splice(index, 1);
        }
        reject(new Error('Timeout waiting for workers to stop'));
      }, timeoutMs);

      // Clean up timeout when promise resolves
      const originalResolve = resolve;
      const resolveWithCleanup = () => {
        clearTimeout(timeout);
        originalResolve();
      };

      // Replace the resolver in the array with the cleanup version
      const index = this.allWorkersStoppedResolvers.indexOf(resolve);
      if (index > -1) {
        this.allWorkersStoppedResolvers[index] = resolveWithCleanup;
      }
    });
  }

  /**
   * Returns array of all worker stats
   */
  getWorkerStats(): WorkerStats[] {
    return Array.from(this.workers.values());
  }

  /**
   * Calculate total speed across all workers
   */
  getTotalSpeed(): number {
    let totalSpeed = 0;
    this.workers.forEach(worker => {
      totalSpeed += worker.speed;
    });
    return totalSpeed;
  }

  /**
   * Dispose of this manager and clean up resources
   */
  dispose(): void {
    if (this.disposed) return;

    this.logger.debug('Disposing WorkerManager');
    this.disposed = true;

    this.abortController.abort();
    this.workers.clear();

    if (this.allWorkersStoppedResolver) {
      this.allWorkersStoppedResolver();
      this.allWorkersStoppedResolver = null;
      this.allWorkersStoppedPromise = null;
    }

    this.allWorkersStoppedResolvers.length = 0;
    this.removeAllListeners();
  }
}
