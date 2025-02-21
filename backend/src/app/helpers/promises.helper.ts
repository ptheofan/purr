type IWaitForOptions =
  | { ms: number; sec?: undefined; min?: undefined }
  | { ms?: undefined; sec: number; min?: undefined }
  | { ms?: undefined; sec?: undefined; min: number };

export const waitFor = (opts: IWaitForOptions): Promise<void> => {
  const ms = opts.ms ?? (opts.sec ? opts.sec * 1000 : opts.min! * 60000);
  return new Promise((resolve) => setTimeout(resolve, ms));
};
