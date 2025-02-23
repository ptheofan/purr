/**
 * This is deprecated and will be removed in the future
 * Keeping temporarily for reference for the mock implementations
 */
// // import axios, { CanceledError } from "axios";
// import axios from "axios";
// import MockAdapter from "axios-mock-adapter";
// import { DownloadCoordinator } from "./downloadCoordinator";
// // import { Readable } from "stream";
// // import { unlinkSync } from "fs";
// import { DownloaderOptions } from './downloader.interface'
//
// // Mock the axios module
// // jest.mock("axios");
// // const mockedAxios = axios as jest.Mocked<typeof axios>;
// const mockedAxios = new MockAdapter(axios);
//
// /**
//  * Default options for the downloader for all test cases
//  */
// const downloaderOptions: DownloaderOptions<any> = {
//   sourceObject: null,
//   url: "http://example.com",
//   saveAs: "./example.txt",
//   workersCount: 1,
//   chunkSize: 10,
//   progressUpdateInterval: 1000,
//   progressCallback: jest.fn(),
//   completedCallback: jest.fn(),
//   errorCallback: jest.fn(),
//   autoRestartCallback: jest.fn(),
// };
//
// /**
//  * Mock the axios.create method to return the axios instance itself
//  */
// jest.mock("axios", () => {
//   return {
//     ...(jest.requireActual("axios") as object),
//     create: jest.fn().mockReturnValue(jest.requireActual("axios")),
//   };
// });
//
// /**
//  * Mock the fs module, prevent writing to the actual file system
//  * It still generates the file on the disk. To be fixed
//  */
// jest.mock("fs", () => {
//   const originalModule = jest.requireActual("fs");
//
//   return {
//     __esModule: true,
//     ...originalModule,
//     default: originalModule,
//     createWriteStream: jest.fn().mockImplementation(() => ({
//       on: jest.fn(),
//       once: jest.fn(),
//       write: jest.fn(),
//       end: jest.fn(),
//     })),
//     existsSync: jest.fn().mockReturnValue(true),
//     promises: {
//       ...originalModule.promises,
//       open: jest.fn().mockImplementation(() => ({
//         createWriteStream: jest.fn().mockImplementation(() => ({
//           on: jest.fn(),
//           once: jest.fn(),
//           write: jest.fn(),
//           end: jest.fn(),
//         })),
//       })),
//       mkdir: jest.fn().mockResolvedValue(undefined),
//     },
//   };
// });
//
// /**
//  * Mocks a readable stream that sends data in chunks of 10 bytes every second.
//  * Reusable function that can be used to mock a stream that sends data in chunks.
//  * Example
//  * const { dataGenerator } = axiosStreamMock(downloader, (downloader, readableStream) => {
//  *         if (downloader.status === DownloaderStatus.STOPPING) {
//  *           readableStream.destroy(new CanceledError(WorkerState.STOPPED));
//  *           return false;
//  *         }
//  *
//  *         return true;
//  *       });
//  * mock.onGet(downloaderOptions.url).reply(() => dataGenerator());
//  */
// // type AxiosStreamMockDataSendController = (
// //   downloader: Downloader<any>,
// //   readableStream: Readable,
// //   dataSent: number,
// //   buffersCounter: number,
// // ) => boolean;
// // type AxiosStreamMockResponse = {
// //   readableStream: Readable;
// //   waitUntilBufferSent: WaitUntilBufferSent;
// //   waitUntilBytesSent: WaitUntilBytesSent;
// //   dataGenerator: () => [number, Readable];
// // };
// // type WaitUntilBufferSent = (bufferIndex: number) => Promise<void>;
// // type WaitUntilBytesSent = (bytesCount: number) => Promise<void>;
//
// // function axiosStreamMock<T>(
// //   downloader: Downloader<T>,
// //   beforeDataSend?: AxiosStreamMockDataSendController,
// // ): AxiosStreamMockResponse {
// //   const readableStream = new Readable({
// //     read() {}, // Implement the _read method to avoid errors
// //   });
// //   let dataSent = 0;
// //   let buffersSent = 0;
// //   const resolveOnBufferSent: Map<number, (() => void)[]> = new Map();
// //   const resolveOnBytesSent: Map<number, (() => void)[]> = new Map();
// //
// //   const dataGenerator = (): [number, Readable] => {
// //     // Push some data into the stream with a delay
// //     const intervalId = setInterval(() => {
// //       if (beforeDataSend) {
// //         if (
// //           !beforeDataSend(downloader, readableStream, dataSent, buffersSent)
// //         ) {
// //           clearInterval(intervalId);
// //         }
// //       }
// //       if (buffersSent < 10) {
// //         const data = buffersSent.toString().repeat(10);
// //         readableStream.push(data);
// //         dataSent += data.length;
// //         buffersSent++;
// //         resolveOnBufferSent.get(buffersSent)?.forEach((resolve) => resolve());
// //         resolveOnBytesSent.get(dataSent)?.forEach((resolve) => resolve());
// //       } else {
// //         // Signal that the stream should end
// //         readableStream.push(null);
// //         clearInterval(intervalId);
// //       }
// //     }, 100); // Delay of 100ms
// //
// //     // Return the stream as the response
// //     return [200, readableStream];
// //   };
// //
// //   const waitUntilBufferSent: WaitUntilBufferSent = (
// //     bufferIndex: number,
// //   ): Promise<void> => {
// //     return new Promise((resolve) => {
// //       const currentResolves = (resolveOnBufferSent.get(bufferIndex) ||
// //         []) as (() => void)[];
// //       currentResolves.push(resolve);
// //       resolveOnBufferSent.set(bufferIndex, currentResolves);
// //     });
// //   };
// //
// //   const waitUntilBytesSent: WaitUntilBytesSent = (
// //     bytesCount: number,
// //   ): Promise<void> => {
// //     return new Promise((resolve) => {
// //       const currentResolves = (resolveOnBytesSent.get(bytesCount) ||
// //         []) as (() => void)[];
// //       currentResolves.push(resolve);
// //       resolveOnBytesSent.set(bytesCount, currentResolves);
// //     });
// //   };
// //
// //   return {
// //     readableStream,
// //     waitUntilBufferSent,
// //     waitUntilBytesSent,
// //     dataGenerator,
// //   };
// // }
//
// describe("Downloader", () => {
//   describe("queryFileSize", () => {
//     let downloader: DownloadCoordinator<void>;
//
//     beforeEach(() => {
//       downloader = new DownloadCoordinator(downloaderOptions);
//     });
//
//     afterEach(() => {
//       jest.clearAllMocks();
//     });
//
//     it("should return file size if server supports ranges", async () => {
//       // Mock Axios response
//       mockedAxios.onHead(downloader.url).reply(
//         200,
//         {},
//         {
//           "content-length": "500",
//           "accept-ranges": "bytes",
//         },
//       );
//
//       const result = await downloader.getFileSize();
//       expect(result).toBe(500);
//     });
//
//     it("should return undefined if content-length is not present in the response headers", async () => {
//       // Mock Axios response
//       mockedAxios.onHead(downloader.url).reply(200, {}, {});
//       const result = await downloader.getFileSize();
//       expect(result).toBe(undefined);
//     });
//   });
//
//   // describe("start", () => {
//   //   let mock: MockAdapter;
//   //   let downloader: Downloader<void>;
//   //
//   //   beforeEach(async () => {
//   //     downloader = new Downloader(downloaderOptions);
//   //
//   //     // Create a new instance of MockAdapter for the axios instance
//   //     mock = new MockAdapter(axios);
//   //
//   //     // Mock the HEAD request for queryFileSize
//   //     mock.onHead(downloaderOptions.url).reply(
//   //       200,
//   //       {},
//   //       {
//   //         "content-length": "500",
//   //         "accept-ranges": "bytes",
//   //       },
//   //     );
//   //
//   //     // Mock the GET request for queryRangesSupport
//   //     mock.onGet(downloaderOptions.url).reply(206);
//   //   });
//   //
//   //   afterEach(() => {
//   //     jest.clearAllMocks();
//   //   });
//   //
//   //   it('should abort if already downloading', () => {
//   //     downloader['isDownloading'] = true;
//   //     expect(downloader.start()).rejects.toThrow('Download already in progress');
//   //   })
//   //
//   //   it('new download starting', () => {
//   //     const spyGetFileSize = jest.spyOn(downloader, 'getFileSize');
//   //     const spyGetTotalBytes = jest.spyOn(downloader, 'getTotalBytes');
//   //     const spyInitializeSaveAsFileTarget = jest.spyOn(downloader as any, 'initializeSaveAsFileTarget');
//   //
//   //     downloader.start();
//   //
//   //     expect(spyGetFileSize).toHaveBeenCalled();
//   //     expect(spyGetTotalBytes).not.toHaveBeenCalled();
//   //     expect(spyInitializeSaveAsFileTarget).not.toHaveBeenCalled();
//   //   })
//   //
//   //   it("should start the download process", async () => {
//   //     const spyGetFileSize = jest.spyOn(downloader, "getFileSize");
//   //     // Call the start method
//   //     await downloader.start();
//   //
//   //     // Check if the necessary methods were called
//   //     expect(spyGetFileSize).toHaveBeenCalled();
//   //   });
//   //
//   //   it("download twice", async () => {
//   //     // Mock the necessary methods
//   //     downloader.startWorkers = jest.fn().mockImplementation(() => {
//   //       downloader.completedHandler();
//   //     });
//   //
//   //     // Call the start method twice - because we await it should work fine
//   //     await downloader.download();
//   //     await expect(downloader.download()).rejects.toThrow(
//   //       "Cannot start download, status is already completed (http://example.com)",
//   //     );
//   //
//   //     // Check if the startWorkers method was called only once
//   //     expect(downloader.startWorkers).toHaveBeenCalledTimes(1);
//   //   });
//   //
//   //   it("should stop the download process", async () => {
//   //     const { dataGenerator } = axiosStreamMock(
//   //       downloader,
//   //       (downloader, readableStream) => {
//   //         if (downloader.status === DownloaderStatus.STOPPING) {
//   //           readableStream.destroy(new CanceledError(WorkerState.STOPPED));
//   //           return false;
//   //         }
//   //
//   //         return true;
//   //       },
//   //     );
//   //     mock.onGet(downloaderOptions.url).reply(() => dataGenerator());
//   //
//   //     // Call the pause method
//   //     const downloadPromise = downloader.download();
//   //     await downloader.waitForWorkersToEnterState(WorkerState.RUNNING);
//   //     downloader.stop();
//   //     await downloadPromise;
//   //
//   //     // Check if the status property is updated correctly
//   //     expect(downloader.status).toBe(DownloaderStatus.STOPPED);
//   //     unlinkSync(downloaderOptions.saveAs);
//   //   });
//   //
//   //   it("should restart the download workers", async () => {
//   //     const { dataGenerator, waitUntilBufferSent } = axiosStreamMock(
//   //       downloader,
//   //       (downloader, readableStream) => {
//   //         if (downloader.status === DownloaderStatus.RESTARTING) {
//   //           readableStream.destroy(new CanceledError(WorkerState.STOPPED));
//   //           return false;
//   //         }
//   //
//   //         return true;
//   //       },
//   //     );
//   //     mock.onGet(downloaderOptions.url).reply(() => dataGenerator());
//   //
//   //     // Call the pause method
//   //     const downloadPromise = downloader.download();
//   //     await waitUntilBufferSent(2);
//   //     // Call the restartWorkers method
//   //     // noinspection ES6MissingAwait
//   //     downloader.restartWorkers();
//   //     await downloader.waitForWorkersToEnterState(WorkerState.STOPPED);
//   //     expect(downloader.status).toBe(DownloaderStatus.RESTARTING);
//   //     await downloadPromise;
//   //
//   //     // Check if the status property is updated correctly
//   //     expect(downloader.status).toBe(DownloaderStatus.COMPLETED);
//   //     unlinkSync(downloaderOptions.saveAs);
//   //   });
//   // });
// });
