export type Histogram = {
  // Unix timestamp in seconds
  startEpoch: number;
  // Unix timestamp in seconds
  endEpoch: number;
  // Speed values in bytes per second since the startEpoch until the endEpoch
  values: number[];
}

/**
 * Will keep track of speed data and provide methods to query the speed between two dates
 * The speed is calculated as the total data downloaded between two dates divided by the time between the two dates
 * The speed is returned in bytes per second
 * The data is stored in a map where the key is the epoch and the value is the data downloaded in that epoch
 * The epoch is calculated as the timestamp divided by 1000ms (time resolution of 1s)
 */
export class SpeedTracker {
  private readonly data: Map<number, number> = new Map();
  private totalData = 0;

  constructor(
    // If resuming a download the initial offset is the amount of data already downloaded
    private readonly initialOffset: number = 0,
    // if true, the update expects the dataLength to be the total data downloaded since the last update
    // if false, the update expects the dataLength to be the data downloaded in total
    private readonly updatesInIncrements: boolean = true,
  ) {
    this.totalData = initialOffset;
  }

  update(timestamp: number, dataLength: number): void {
    const epoch = Math.floor(timestamp / 1000);
    if (!this.updatesInIncrements) {
      dataLength -= this.totalData;
    } else {
      dataLength -= this.initialOffset;
    }

    this.totalData += dataLength;

    if (this.data.has(epoch)) {
      // eslint-disable-next-line
      this.data.set(epoch, this.data.get(epoch)! + dataLength);
    } else {
      this.data.set(epoch, dataLength);
    }
  }

  /**
   * Query the speed between two dates.
   * If from is not provided, the speed will be calculated from the first data point
   * If until is not provided, the speed will be calculated until the last data point
   */
  query(from?: Date, until?: Date): number {
    if (this.data.size === 0) {
      return 0;
    }

    // Get the epochs as array from start to end
    const { firstEpoch, lastEpoch } = this.getStartEndEpochs(from, until);

    // sum the values of the map
    let sum = 0;
    let epoch = firstEpoch;
    while (epoch <= lastEpoch && epoch <= lastEpoch) {
      if (this.data.has(epoch)) {
        sum += this.data.get(epoch)!;
      }
      epoch++;
    }

    // return the sum in bytes per second
    return sum / (lastEpoch - firstEpoch + 1);
  }

  /**
   * Get the histogram of the speed between two dates.
   * If from is not provided, the speed will be calculated from the first data point
   * If until is not provided, the speed will be calculated until the last data point
   * The histogram will be returned as an object with the start and end dates and an array of speeds
   */
  histogram(from?: Date, until?: Date, granularity: number = 1): Histogram {
    // Get the epochs as array from start to end
    const { firstEpoch, lastEpoch } = this.getStartEndEpochs(from, until);

    if (this.data.size === 0) {
      return { startEpoch: firstEpoch, endEpoch: lastEpoch, values: [] };
    }

    // extract the data from the map
    const data: number[] = [];
    let epoch = firstEpoch;
    while (epoch <= lastEpoch) {
      const epochIndex = Math.floor(epoch / granularity) - Math.floor(firstEpoch / granularity);
      if (data[epochIndex] === undefined) data[epochIndex] = 0;

      if (this.data.has(epoch)) {
        data[epochIndex] += this.data.get(epoch) || 0;
      }
      epoch++;
    }

    return { startEpoch: firstEpoch, endEpoch: lastEpoch, values: data };
  }

  getStartEndEpochs(from?: Date, until?: Date): { firstEpoch: number, lastEpoch: number } {
    // Get the epochs as array from start to end
    const epochs = Array.from(this.data.keys()).sort((a, b) => a - b);
    if (epochs.length === 0) {
      return { firstEpoch: 0, lastEpoch: 0 };
    }

    const firstEpoch = epochs[0];
    const lastEpoch = epochs[epochs.length - 1];

    // floor the dates to the nearest second - ensure fromEpoch and untilEpoch are within the range of the data
    return {
      firstEpoch: from ? Math.max(Math.floor(from.getTime() / 1000), firstEpoch) : epochs[0],
      lastEpoch: until ? Math.min(Math.floor(until.getTime() / 1000), lastEpoch) : lastEpoch,
    };
  }

  /**
   * Forget all data older (<) than the provided date
   */
  forgetOlderThan(date: number): void {
    const epochs = Array.from(this.data.keys()).sort((a, b) => a - b);
    for (const epoch of epochs) {
      if (epoch < date) {
        this.data.delete(epoch);
      }
    }
  }

  /**
   * After resuming a download, the speed tracker data need to be reset
   */
  resume(): void {
    // When resuming the download, the speed tracker should be reset
    // to avoid incorrect speed calculations when resuming the download
    this.data.clear();
  }
}
