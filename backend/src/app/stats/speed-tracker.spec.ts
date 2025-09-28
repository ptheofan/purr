import { SpeedTracker } from './speed-tracker';

describe('SpeedTracker', () => {
  let speedTracker: SpeedTracker;

  it('updates the data', () => {
    speedTracker = new SpeedTracker(0, true);
    speedTracker.update(1000, 10);
    speedTracker.update(2000, 20);
    speedTracker.update(3000, 30);
    speedTracker.update(3100, 10);

    expect(speedTracker['data']).toEqual(
      new Map([
        [1, 10],
        [2, 20],
        [3, 40],
      ]),
    );
  });

  it('queries the data', () => {
    speedTracker = new SpeedTracker(0, true);
    speedTracker.update(1000, 10);
    speedTracker.update(2000, 20);
    speedTracker.update(3000, 30);

    // avg of 10 + 20 + 30 = 20
    expect(speedTracker.query()).toBe(20);
  });

  it('queries the data with gaps', () => {
    speedTracker = new SpeedTracker(0, true);
    speedTracker.update(1000, 10);
    speedTracker.update(2000, 20);
    speedTracker.update(4000, 40);
    speedTracker.update(5000, 50);

    // avg of 10 + 20 + 0 + 40 + 50 = 24
    expect(speedTracker.query()).toBe(24);
  });

  it('queries the data with from and until', () => {
    speedTracker = new SpeedTracker(0, true);
    speedTracker.update(1000, 10);
    speedTracker.update(2000, 20);
    speedTracker.update(3000, 30);
    speedTracker.update(4000, 40);
    speedTracker.update(5000, 50);

    // avg of 30 + 40 + 50 = 40
    expect(speedTracker.query(new Date(3000), new Date(5000))).toBe(40);
  });

  it('queries the data with from and until with no data', () => {
    speedTracker = new SpeedTracker(0, true);
    expect(speedTracker.query(new Date(3000), new Date(5000))).toBe(0);
  });

  it('it generates a correct histogram', () => {
    speedTracker = new SpeedTracker(0, true);
    speedTracker.update(1000, 10);
    speedTracker.update(2000, 20);
    speedTracker.update(3000, 30);
    speedTracker.update(4000, 40);
    speedTracker.update(5000, 50);

    const histogram = speedTracker.histogram(new Date(1000), new Date(5000));

    expect(histogram).toEqual({
      startEpoch: 1,
      endEpoch: 5,
      values: [10, 20, 30, 40, 50],
    });
  });

  it('it generates a correct histogram with no data', () => {
    speedTracker = new SpeedTracker(0, true);
    const histogram = speedTracker.histogram(new Date(1000), new Date(5000));

    expect(histogram).toEqual({
      startEpoch: 0,
      endEpoch: 0,
      values: [],
    });
  });

  it('it generates a correct histogram with gaps', () => {
    speedTracker = new SpeedTracker(0, true);
    speedTracker.update(1000, 10);
    speedTracker.update(2000, 20);
    speedTracker.update(4000, 40);
    speedTracker.update(5000, 50);

    const histogram = speedTracker.histogram(new Date(1000), new Date(5000));
    expect(histogram).toEqual({
      startEpoch: 1,
      endEpoch: 5,
      values: [10, 20, 0, 40, 50],
    });
  });

  it('handles cumulative updates correctly', () => {
    speedTracker = new SpeedTracker(0, false);
    speedTracker.update(1000, 10);
    speedTracker.update(2000, 30);
    speedTracker.update(3000, 60);

    expect(speedTracker['data']).toEqual(
      new Map([
        [1, 10],
        [2, 20],
        [3, 30],
      ]),
    );
  });

  it('handles initial offset correctly', () => {
    speedTracker = new SpeedTracker(100, true);
    speedTracker.update(1000, 50);  // 50 bytes downloaded in this update
    speedTracker.update(2000, 50);  // 50 bytes downloaded in this update

    expect(speedTracker['data']).toEqual(
      new Map([
        [1, 50],
        [2, 50],
      ]),
    );
  });

  it('handles same start and end time in query', () => {
    speedTracker = new SpeedTracker(0, true);
    speedTracker.update(1000, 10);

    // Query with same start and end time should return the data for that epoch
    expect(speedTracker.query(new Date(1000), new Date(1000))).toBe(10);
  });

  it('forgets older data correctly', () => {
    speedTracker = new SpeedTracker(0, true);
    speedTracker.update(1000, 10);
    speedTracker.update(2000, 20);
    speedTracker.update(3000, 30);
    speedTracker.update(4000, 40);

    speedTracker.forgetOlderThan(3);

    expect(speedTracker['data']).toEqual(
      new Map([
        [3, 30],
        [4, 40],
      ]),
    );
  });

  it('resets data correctly on resume', () => {
    speedTracker = new SpeedTracker(0, true);
    speedTracker.update(1000, 10);
    speedTracker.update(2000, 20);

    speedTracker.resume();

    expect(speedTracker['data'].size).toBe(0);
    expect(speedTracker['sortedEpochs'].length).toBe(0);
    expect(speedTracker['totalData']).toBe(0);
  });

  it('handles histogram with granularity', () => {
    speedTracker = new SpeedTracker(0, true);
    speedTracker.update(1000, 10);
    speedTracker.update(2000, 20);
    speedTracker.update(3000, 30);
    speedTracker.update(4000, 40);

    const histogram = speedTracker.histogram(new Date(1000), new Date(4000), 2);
    expect(histogram).toEqual({
      startEpoch: 1,
      endEpoch: 4,
      values: [10, 50, 40], // [epoch1, epoch2+3, epoch4]
    });
  });
});
