import { ProgressTracker } from './progress-tracker';
import { SpeedTracker } from '../../../stats';
import { FragmentStatus } from '../dtos';

// Mock external dependencies
jest.mock('../../../stats');
jest.mock('./ranges');

const mockRanges = {
  count: jest.fn(),
  isFinite: jest.fn().mockReturnValue(true),
  setSize: jest.fn(),
  size: 1000,
  markAs: jest.fn(),
  ranges: [{ start: 0, end: 1000, status: FragmentStatus.finished }],
  add: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
  getRanges: jest.fn(),
  findSequenceOfAtLeast: jest.fn(),
  findFirst: jest.fn(),
  toSaveData: jest.fn(),
  changeAll: jest.fn()
};

describe('ProgressTracker', () => {
  let speedTrackerMock;
  let initialTime;

  // Set up fake timers and initial time before all tests
  beforeAll(() => {
    jest.useFakeTimers();
    initialTime = new Date('2023-01-01T00:00:00Z').getTime();
    jest.setSystemTime(initialTime);
  });

  // Set up mocks before each test
  beforeEach(() => {
    speedTrackerMock = {
      update: jest.fn(),
      query: jest.fn(),
      histogram: jest.fn(),
      resume: jest.fn(),
    };
    // SpeedTracker.mockImplementation(() => speedTrackerMock);
  });

  // Clear all mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test constructor with default initialBytes
  test('constructor initializes with default initialBytes 0', () => {
    const progressTracker = new ProgressTracker();
    expect(SpeedTracker).toHaveBeenCalledWith(0, true);
    expect(progressTracker['bytesSinceLastProgress']).toBe(0);
    expect(progressTracker['lastProgressUpdate']).toBe(initialTime);
  });

  // Test constructor with provided initialBytes
  test('constructor initializes with provided initialBytes', () => {
    const initialBytes = 1000;
    const progressTracker = new ProgressTracker(initialBytes);
    expect(SpeedTracker).toHaveBeenCalledWith(initialBytes, true);
    expect(progressTracker['bytesSinceLastProgress']).toBe(0);
    expect(progressTracker['lastProgressUpdate']).toBe(initialTime);
  });

  // Test setStartTime method
  test('setStartTime sets startedAt correctly', () => {
    const progressTracker = new ProgressTracker();
    const startDate = new Date('2023-01-01T01:00:00Z');
    progressTracker.setStartTime(startDate);
    expect(progressTracker['startedAt']).toBe(startDate);
  });

  // Test setWorkersRestartTime method
  test('setWorkersRestartTime sets workersRestartedAt correctly', () => {
    const progressTracker = new ProgressTracker();
    const restartDate = new Date('2023-01-01T02:00:00Z');
    progressTracker.setWorkersRestartTime(restartDate);
    expect(progressTracker['workersRestartedAt']).toBe(restartDate);
  });

  // Test update method
  test('update calls speedTracker.update and accumulates bytes', () => {
    const spyUpdate = jest.spyOn(SpeedTracker.prototype, 'update');

    const progressTracker = new ProgressTracker();
    const newBytes = 500;
    progressTracker.update(newBytes);
    expect(spyUpdate).toHaveBeenCalledWith(initialTime, newBytes);
    expect(progressTracker['bytesSinceLastProgress']).toBe(newBytes);

    progressTracker.update(newBytes);
    expect(spyUpdate).toHaveBeenCalledWith(initialTime, newBytes);
    expect(progressTracker['bytesSinceLastProgress']).toBe(newBytes * 2);
  });

  // Test shouldUpdateProgress method
  test('shouldUpdateProgress returns true after 1 second', () => {
    const progressTracker = new ProgressTracker();
    expect(progressTracker.shouldUpdateProgress()).toBe(false);
    jest.advanceTimersByTime(999);
    expect(progressTracker.shouldUpdateProgress()).toBe(false);
    jest.advanceTimersByTime(1);
    expect(progressTracker.shouldUpdateProgress()).toBe(true);
  });

  // Test getBytesSinceLastProgress method
  test('getBytesSinceLastProgress returns accumulated bytes and resets', () => {
    initialTime = Date.now();
    const progressTracker = new ProgressTracker();
    progressTracker.update(100);
    progressTracker.update(200);
    jest.advanceTimersByTime(500);
    const bytes = progressTracker.getBytesSinceLastProgress();
    expect(bytes).toBe(300);
    expect(progressTracker['bytesSinceLastProgress']).toBe(0);
    expect(progressTracker['lastProgressUpdate']).toBe(initialTime + 500);
  });

  // Test getProgress method when ranges.isFinite is true
  test.skip('getProgress returns correct DownloadProgress when ranges.isFinite is true', () => {
    const progressTracker = new ProgressTracker();
    const startDate = new Date(initialTime - 100000);
    const restartDate = new Date(initialTime - 50000);
    progressTracker.setStartTime(startDate);
    progressTracker.setWorkersRestartTime(restartDate);

    mockRanges.count.mockImplementation((status) => {
      if (status === FragmentStatus.finished) return 500;
      if (status === FragmentStatus.pending) return 200;
      if (status === FragmentStatus.reserved) return 300;
      return 0;
    });

    const workerStats = [
      { id: 'w-1', bytesDownloaded: 1000, speed: 100, startTime: 0, lastUpdate: 0, retryCount: 0 },
      { id: 'w-2', bytesDownloaded: 2000, speed: 200, startTime: 0, lastUpdate: 0, retryCount: 0 },
    ];

    speedTrackerMock.query.mockReturnValue(150);
    speedTrackerMock.histogram.mockReturnValue([{ time: initialTime - 60000, speed: 100 }]);

    const progress = progressTracker.getProgress(mockRanges, workerStats);

    expect(progress.timestamp).toBe(initialTime);
    expect(progress.startedAt).toBe(startDate);
    expect(progress.workersRestartedAt).toBe(restartDate);
    expect(progress.downloadedBytes).toBe(500);
    expect(progress.totalBytes).toBe(500 + 200 + 300);
    expect(progress.speed).toBe(150);
    expect(progress.speedTracker).toBe(speedTrackerMock);
    expect(progress.ranges).toBe(mockRanges.ranges);
    expect(progress.histogram).toEqual([{ time: initialTime - 60000, speed: 100 }]);
    expect(progress.workerStats).toEqual([
      { id: 1, speed: 100, downloadedBytes: 1000 },
      { id: 2, speed: 200, downloadedBytes: 2000 },
    ]);

    const speedQueryFrom = new Date(initialTime - 10000);
    const histogramFrom = new Date(initialTime - 60000);
    const currentDate = new Date(initialTime);
    expect(speedTrackerMock.query).toHaveBeenCalledWith(speedQueryFrom, currentDate);
    expect(speedTrackerMock.histogram).toHaveBeenCalledWith(histogramFrom, currentDate, 1);
  });

  // Test getProgress method when ranges.isFinite is false
  test('getProgress returns totalBytes undefined when ranges.isFinite is false', () => {
    const progressTracker = new ProgressTracker();
    mockRanges.isFinite.mockReturnValue(false);
    mockRanges.ranges = [];
    const workerStats = [];
    const progress = progressTracker.getProgress(mockRanges, workerStats);
    expect(progress.totalBytes).toBeUndefined();
  });

  // Test resetSpeedTracker method
  test('resetSpeedTracker calls speedTracker.resume', () => {
    const spyResume = jest.spyOn(SpeedTracker.prototype, 'resume');
    const progressTracker = new ProgressTracker();
    progressTracker.resetSpeedTracker();
    expect(spyResume).toHaveBeenCalled();
  });
});
