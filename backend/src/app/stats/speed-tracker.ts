export type Histogram = {
  /** Unix timestamp in seconds */
  startEpoch: number;
  /** Unix timestamp in seconds */
  endEpoch: number;
  /** Speed values in bytes per second since the startEpoch until the endEpoch */
  values: number[];
}

/**
 * Tracks download speed data and provides methods to query speed between dates.
 * Speed is calculated as total data downloaded divided by time elapsed.
 * Data is stored with 1-second resolution (epoch = timestamp / 1000ms).
 */
export class SpeedTracker {
  private readonly data: Map<number, number> = new Map();
  private totalData = 0;
  private sortedEpochs: number[] = [];

  constructor(
    /** Amount of data already downloaded when resuming */
    private readonly initialOffset: number = 0,
    /** Whether updates are incremental (true) or cumulative (false) */
    private readonly updatesInIncrements: boolean = true,
  ) {
    this.totalData = initialOffset;
    this.sortedEpochs = [];
  }

  update(timestamp: number, dataLength: number): void {
    const epoch = Math.floor(timestamp / 1000);
    
    // Calculate incremental data based on update mode
    let incrementalData: number;
    if (this.updatesInIncrements) {
      // For incremental updates, dataLength is the incremental data for this update
      incrementalData = dataLength;
    } else {
      // For cumulative updates, subtract the total data so far
      incrementalData = dataLength - this.totalData;
    }

    this.totalData += incrementalData;

    // Update or add data for this epoch
    const existingData = this.data.get(epoch) ?? 0;
    this.data.set(epoch, existingData + incrementalData);
    
    // Maintain sorted epochs array for performance
    if (!this.sortedEpochs.includes(epoch)) {
      this.sortedEpochs.push(epoch);
      this.sortedEpochs.sort((a, b) => a - b);
    }
  }

  /**
   * Query the average speed between two dates.
   * @param from Start date (optional, defaults to first data point)
   * @param until End date (optional, defaults to last data point)
   * @returns Average speed in bytes per second
   */
  query(from?: Date, until?: Date): number {
    if (this.data.size === 0) {
      return 0;
    }

    const { firstEpoch, lastEpoch } = this.getStartEndEpochs(from, until);
    const timeSpan = lastEpoch - firstEpoch + 1;
    
    // Avoid division by zero or same start/end time
    if (timeSpan <= 0) {
      return 0;
    }

    // Sum data for all epochs in the range
    let sum = 0;
    for (let epoch = firstEpoch; epoch <= lastEpoch; epoch++) {
      sum += this.data.get(epoch) ?? 0;
    }

    return sum / timeSpan;
  }

  /**
   * Get a histogram of speed data between two dates.
   * @param from Start date (optional, defaults to first data point)
   * @param until End date (optional, defaults to last data point)
   * @param granularity Time granularity in seconds (default: 1)
   * @returns Histogram with start/end epochs and speed values
   */
  histogram(from?: Date, until?: Date, granularity: number = 1): Histogram {
    const { firstEpoch, lastEpoch } = this.getStartEndEpochs(from, until);

    if (this.data.size === 0) {
      return { startEpoch: firstEpoch, endEpoch: lastEpoch, values: [] };
    }

    // Group data by granularity
    const data: number[] = [];
    const startGranularEpoch = Math.floor(firstEpoch / granularity);
    const endGranularEpoch = Math.floor(lastEpoch / granularity);
    
    // Initialize array with correct size
    for (let i = 0; i <= endGranularEpoch - startGranularEpoch; i++) {
      data[i] = 0;
    }
    
    for (let epoch = firstEpoch; epoch <= lastEpoch; epoch++) {
      const granularEpoch = Math.floor(epoch / granularity);
      const epochIndex = granularEpoch - startGranularEpoch;
      
      data[epochIndex] += this.data.get(epoch) ?? 0;
    }

    return { startEpoch: firstEpoch, endEpoch: lastEpoch, values: data };
  }

  private getStartEndEpochs(from?: Date, until?: Date): { firstEpoch: number, lastEpoch: number } {
    if (this.sortedEpochs.length === 0) {
      return { firstEpoch: 0, lastEpoch: 0 };
    }

    const firstEpoch = this.sortedEpochs[0];
    const lastEpoch = this.sortedEpochs[this.sortedEpochs.length - 1];

    // Constrain to data range and convert dates to epochs
    return {
      firstEpoch: from ? Math.max(Math.floor(from.getTime() / 1000), firstEpoch) : firstEpoch,
      lastEpoch: until ? Math.min(Math.floor(until.getTime() / 1000), lastEpoch) : lastEpoch,
    };
  }

  /**
   * Remove all data older than the specified epoch.
   * @param epochThreshold Epoch threshold (older epochs will be removed)
   */
  forgetOlderThan(epochThreshold: number): void {
    const epochsToRemove: number[] = [];
    
    for (const epoch of this.sortedEpochs) {
      if (epoch < epochThreshold) {
        this.data.delete(epoch);
        epochsToRemove.push(epoch);
      } else {
        // Since epochs are sorted, we can break early
        break;
      }
    }
    
    // Remove deleted epochs from sorted array
    this.sortedEpochs = this.sortedEpochs.filter(epoch => epoch >= epochThreshold);
  }

  /**
   * Reset all tracking data when resuming a download.
   * This prevents incorrect speed calculations from previous session data.
   */
  resume(): void {
    this.data.clear();
    this.sortedEpochs = [];
    this.totalData = this.initialOffset;
  }
}
