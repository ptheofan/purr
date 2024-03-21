import { Ranges } from './ranges';
import { FragmentStatus } from '../dtos';

describe('Ranges', () => {
  it('Known Size, resize', () => {
    const ranges = new Ranges(100);
    ranges.markAs(0, 10, FragmentStatus.finished);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 10, status: FragmentStatus.finished },
      { start: 11, end: 99, status: FragmentStatus.pending },
    ]);

    ranges.setSize(200);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 10, status: FragmentStatus.finished },
      { start: 11, end: 99, status: FragmentStatus.pending },
      { start: 100, end: 199, status: FragmentStatus.pending },
    ]);
  });

  it('Known Size, resize to unknown', () => {
    const ranges = new Ranges(100);
    ranges.markAs(0, 10, FragmentStatus.finished);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 10, status: FragmentStatus.finished },
      { start: 11, end: 99, status: FragmentStatus.pending },
    ]);

    ranges.setSize(undefined);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 10, status: FragmentStatus.finished },
      { start: 11, end: 99, status: FragmentStatus.pending },
    ]);
  });

  it('unknown Size, resize to known', () => {
    const ranges = new Ranges();
    ranges.markAs(0, 10, FragmentStatus.finished);
    expect(ranges.ranges).toEqual([{ start: 0, end: 10, status: FragmentStatus.finished }]);

    ranges.setSize(100);
    expect(ranges.ranges).toEqual([{ start: 0, end: 10, status: FragmentStatus.finished }]);
  });

  it('Known Size, mark bytes as fetched', () => {
    const ranges = new Ranges(100);
    ranges.markAs(0, 10, FragmentStatus.finished);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 10, status: FragmentStatus.finished },
      { start: 11, end: 99, status: FragmentStatus.pending },
    ]);
  });

  it('Known Size, mark bytes as working', () => {
    const ranges = new Ranges(100);
    ranges.markAs(0, 10, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 10, status: FragmentStatus.reserved },
      { start: 11, end: 99, status: FragmentStatus.pending },
    ]);
  });

  it('Known Size, create discontinuities', () => {
    const ranges = new Ranges(100);
    ranges.markAs(10, 20, FragmentStatus.finished);
    ranges.markAs(30, 40, FragmentStatus.finished);
    ranges.markAs(50, 60, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.pending },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 29, status: FragmentStatus.pending },
      { start: 30, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 49, status: FragmentStatus.pending },
      { start: 50, end: 60, status: FragmentStatus.reserved },
      { start: 61, end: 99, status: FragmentStatus.pending },
    ]);
  });

  it('known size, get next pending chunk', () => {
    const ranges = new Ranges(100);
    ranges.markAs(10, 20, FragmentStatus.finished);
    ranges.markAs(25, 32, FragmentStatus.finished);
    ranges.markAs(30, 40, FragmentStatus.finished);
    ranges.markAs(50, 60, FragmentStatus.reserved);
    let chunk = ranges.findSequenceOfAtLeast(10, FragmentStatus.pending);
    expect(chunk).toEqual({ start: 0, end: 9, status: FragmentStatus.pending });
    ranges.markAs(chunk.start, chunk.end, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.reserved },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 24, status: FragmentStatus.pending },
      { start: 25, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 49, status: FragmentStatus.pending },
      { start: 50, end: 60, status: FragmentStatus.reserved },
      { start: 61, end: 99, status: FragmentStatus.pending },
    ]);

    chunk = ranges.findSequenceOfAtLeast(20, FragmentStatus.pending);
    expect(chunk).toEqual({ start: 61, end: 80, status: FragmentStatus.pending });
    ranges.markAs(chunk.start, chunk.end, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.reserved },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 24, status: FragmentStatus.pending },
      { start: 25, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 49, status: FragmentStatus.pending },
      { start: 50, end: 80, status: FragmentStatus.reserved },
      { start: 81, end: 99, status: FragmentStatus.pending },
    ]);
    ranges.markAs(chunk.start, chunk.end, FragmentStatus.reserved);

    chunk = ranges.findSequenceOfAtLeast(20, FragmentStatus.pending);
    expect(chunk).toEqual({ start: 81, end: 99, status: FragmentStatus.pending });
    ranges.markAs(chunk.start, chunk.end, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.reserved },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 24, status: FragmentStatus.pending },
      { start: 25, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 49, status: FragmentStatus.pending },
      { start: 50, end: 99, status: FragmentStatus.reserved },
    ]);

    chunk = ranges.findSequenceOfAtLeast(20, FragmentStatus.pending);
    expect(chunk).toEqual({ start: 41, end: 49, status: FragmentStatus.pending });
    ranges.markAs(chunk.start, chunk.end, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.reserved },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 24, status: FragmentStatus.pending },
      { start: 25, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 99, status: FragmentStatus.reserved },
    ]);

    chunk = ranges.findSequenceOfAtLeast(20, FragmentStatus.pending);
    expect(chunk).toEqual({ start: 21, end: 24, status: FragmentStatus.pending });
    ranges.markAs(chunk.start, chunk.end, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.reserved },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 24, status: FragmentStatus.reserved },
      { start: 25, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 99, status: FragmentStatus.reserved },
    ]);
  });

  it('Unknown Size, mark bytes as fetched', () => {
    const ranges = new Ranges();
    ranges.markAs(0, 10, FragmentStatus.finished);
    expect(ranges.ranges).toEqual([{ start: 0, end: 10, status: FragmentStatus.finished }]);
  });

  it('Unknown Size, mark bytes as working', () => {
    const ranges = new Ranges();
    ranges.markAs(0, 10, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([{ start: 0, end: 10, status: FragmentStatus.reserved }]);
  });

  it('Unknown Size, create discontinuities', () => {
    const ranges = new Ranges();
    ranges.markAs(10, 20, FragmentStatus.finished);
    ranges.markAs(30, 40, FragmentStatus.finished);
    ranges.markAs(50, 60, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.pending },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 29, status: FragmentStatus.pending },
      { start: 30, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 49, status: FragmentStatus.pending },
      { start: 50, end: 60, status: FragmentStatus.reserved },
    ]);
  });

  it('Unknown size, get next pending chunk', () => {
    const ranges = new Ranges();
    ranges.markAs(10, 20, FragmentStatus.finished);
    ranges.markAs(25, 32, FragmentStatus.finished);
    ranges.markAs(30, 40, FragmentStatus.finished);
    ranges.markAs(50, 60, FragmentStatus.reserved);
    let chunk = ranges.findSequenceOfAtLeast(10, FragmentStatus.pending);
    expect(chunk).toEqual({ start: 0, end: 9, status: FragmentStatus.pending });
    ranges.markAs(chunk.start, chunk.end, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.reserved },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 24, status: FragmentStatus.pending },
      { start: 25, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 49, status: FragmentStatus.pending },
      { start: 50, end: 60, status: FragmentStatus.reserved },
    ]);

    chunk = ranges.findSequenceOfAtLeast(20, FragmentStatus.pending);
    expect(chunk).toEqual({ start: 61, end: 80, status: FragmentStatus.pending });
    ranges.markAs(chunk.start, chunk.end, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.reserved },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 24, status: FragmentStatus.pending },
      { start: 25, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 49, status: FragmentStatus.pending },
      { start: 50, end: 80, status: FragmentStatus.reserved },
    ]);
  });

  it('Unknown Size, findFirst', () => {
    const ranges = new Ranges();
    ranges.markAs(10, 20, FragmentStatus.finished);
    ranges.markAs(30, 40, FragmentStatus.finished);
    ranges.markAs(50, 60, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.pending },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 29, status: FragmentStatus.pending },
      { start: 30, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 49, status: FragmentStatus.pending },
      { start: 50, end: 60, status: FragmentStatus.reserved },
    ]);

    let chunk = ranges.findFirst(FragmentStatus.pending);
    expect(chunk).toEqual({ start: 0, end: 9, status: FragmentStatus.pending });
    ranges.markAs(chunk.start, chunk.end, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.reserved },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 29, status: FragmentStatus.pending },
      { start: 30, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 49, status: FragmentStatus.pending },
      { start: 50, end: 60, status: FragmentStatus.reserved },
    ]);

    chunk = ranges.findFirst(FragmentStatus.pending);
    expect(chunk).toEqual({ start: 21, end: 29, status: FragmentStatus.pending });
    ranges.markAs(chunk.start, chunk.end, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.reserved },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 29, status: FragmentStatus.reserved },
      { start: 30, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 49, status: FragmentStatus.pending },
      { start: 50, end: 60, status: FragmentStatus.reserved },
    ]);

    chunk = ranges.findFirst(FragmentStatus.pending);
    expect(chunk).toEqual({ start: 41, end: 49, status: FragmentStatus.pending });
    ranges.markAs(chunk.start, chunk.end, FragmentStatus.reserved);
    expect(ranges.ranges).toEqual([
      { start: 0, end: 9, status: FragmentStatus.reserved },
      { start: 10, end: 20, status: FragmentStatus.finished },
      { start: 21, end: 29, status: FragmentStatus.reserved },
      { start: 30, end: 40, status: FragmentStatus.finished },
      { start: 41, end: 60, status: FragmentStatus.reserved },
    ]);

    chunk = ranges.findFirst(FragmentStatus.pending);
    expect(chunk).toEqual(undefined);
  });
});
