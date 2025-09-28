type IWaitForOptions =
  | { ms: number; sec?: undefined; min?: undefined }
  | { ms?: undefined; sec: number; min?: undefined }
  | { ms?: undefined; sec?: undefined; min: number };

  /**
   * Waits for a specified amount of time
   * @param opts - The options for the wait
   * @returns A promise that resolves when the wait is complete
   */
export const waitFor = (opts: IWaitForOptions): Promise<void> => {
  let ms: number;
  
  if (opts.ms !== undefined) {
    ms = opts.ms;
  } else if (opts.sec !== undefined) {
    ms = opts.sec * 1000;
  } else {
    ms = opts.min * 60000;
  }
  
  if (ms < 0) {
    throw new Error('Wait time cannot be negative');
  }
  
  return new Promise((resolve) => setTimeout(resolve, ms));
};
