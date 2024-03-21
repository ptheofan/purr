import { FragmentStatus } from '../dtos';


interface Fragment {
  start: number;
  end: number;
  status: FragmentStatus;
}

class Ranges {
  private _ranges: Fragment[] = [];

  get ranges(): Fragment[] {
    // last fragment end === Number.MAX_SAFE_INTEGER remove it from return list
    return this._ranges.filter((fragment) => fragment.end !== Number.MAX_SAFE_INTEGER);
  }

  setSize(newSize: number | undefined) {
    if (this._ranges.length === 0) {
      if (newSize !== undefined) {
        this._ranges.push({ start: 0, end: newSize - 1, status: FragmentStatus.pending });
      } else {
        this._ranges.push({ start: 0, end: Number.MAX_SAFE_INTEGER, status: FragmentStatus.pending });
      }
    }

    if (newSize === undefined) {
      // if last range is not MAX_SAFE_INTEGER add it
      if (this._ranges[this._ranges.length - 1].end !== Number.MAX_SAFE_INTEGER) {
        const tail = this._ranges[this._ranges.length - 1];
        this._ranges.push({ start: tail.start + 1, end: Number.MAX_SAFE_INTEGER, status: FragmentStatus.pending });
      }

      return;
    }

    const tail = this._ranges[this._ranges.length - 1];
    if (tail.end < newSize - 1) {
      this._ranges.push({ start: tail.end + 1, end: newSize - 1, status: FragmentStatus.pending });
    }
  }

  constructor(private size: number | undefined = undefined) {
    this.setSize(size);
  }

  markAs(start: number, end: number, status: FragmentStatus): void {
    if (this.size !== undefined) {
      if (start < 0 || end >= this.size || start > end) {
        throw new Error('Invalid range');
      }
    }

    const newFragment: Fragment = { start, end, status };
    const mergedRanges: Fragment[] = [];

    for (const existingFragment of this._ranges) {
      if (existingFragment.end < start || existingFragment.start > end) {
        // No overlap, keep the existing fragment as is.
        mergedRanges.push(existingFragment);
      } else {
        // Overlap detected, adjust the existing fragment.
        if (existingFragment.start < start) {
          mergedRanges.push({ start: existingFragment.start, end: start - 1, status: existingFragment.status });
        }

        if (existingFragment.end > end) {
          mergedRanges.push({ start: end + 1, end: existingFragment.end, status: existingFragment.status });
        }
      }
    }

    mergedRanges.push(newFragment);

    // Sort and merge adjacent fragments
    mergedRanges.sort((a, b) => a.start - b.start);
    const finalRanges: Fragment[] = [];
    let currentFragment: Fragment | undefined = mergedRanges[0];

    for (let i = 1; i < mergedRanges.length; i++) {
      const nextFragment = mergedRanges[i];

      if (currentFragment.end + 1 === nextFragment.start && currentFragment.status === nextFragment.status) {
        // Merge adjacent fragments with the same status
        currentFragment.end = nextFragment.end;
      } else {
        finalRanges.push(currentFragment);
        currentFragment = nextFragment;
      }
    }

    if (currentFragment) {
      finalRanges.push(currentFragment);
    }

    this._ranges = finalRanges;
  }

  // findRangeOf(size: number, status: FragmentStatus): Fragment | undefined {
  //   for (const fragment of this.ranges) {
  //     if (fragment.status === status && fragment.end - fragment.start + 1 >= size) {
  //       return fragment;
  //     }
  //   }
  //   return undefined;
  // }

  // findSequenceOfAtLeast(size: number, status: FragmentStatus): Fragment | undefined {
  //   for (const fragment of this.ranges) {
  //     if (fragment.status === status && fragment.end - fragment.start + 1 >= size) {
  //       const newFragment: Fragment = { start: fragment.start, end: fragment.start + size - 1, status };
  //       return newFragment;
  //     }
  //   }
  //   return undefined;
  // }

  findSequenceOfAtLeast(size: number, status: FragmentStatus): Fragment | undefined {
    let closestMatch: Fragment | undefined = undefined;
    let closestMatchSize = Number.MIN_SAFE_INTEGER;

    for (const fragment of this._ranges) {
      if (fragment.status === status) {
        if (fragment.end - fragment.start + 1 >= size) {
          return { start: fragment.start, end: fragment.start + size - 1, status };
        }

        if (fragment.end - fragment.start + 1 > closestMatchSize) {
          closestMatch = fragment;
          closestMatchSize = fragment.end - fragment.start;
        }
      }
    }

    if (closestMatch) {
      return { start: closestMatch.start, end: closestMatch.end, status };
    }

    return undefined;
  }

  findFirst(status: FragmentStatus): Fragment | undefined {
    return this.ranges.find((fragment) => fragment.status === status);
  }

  toSaveData(): string {
    return JSON.stringify(this._ranges);
  }

  static fromSaveData(saveData: string): Ranges {
    const ranges = new Ranges();
    ranges._ranges = JSON.parse(saveData);
    return ranges;
  }

  count(status: FragmentStatus): number {
    // Add all the sizes of the fragments that match the status
    return this.ranges.reduce((acc, fragment) => {
      if (fragment.status === status) {
        return acc + (fragment.end - fragment.start + 1);
      }
      return acc;
    }, 0);
  }

  changeAll(fromStatus: FragmentStatus, toStatus: FragmentStatus): void {
    const updatedRanges: Fragment[] = [];

    for (const fragment of this._ranges) {
      if (fragment.status === fromStatus) {
        // Change the status to the new one (toStatus)
        fragment.status = toStatus;
      }

      if (updatedRanges.length === 0 || updatedRanges[updatedRanges.length - 1].status !== fragment.status) {
        updatedRanges.push({ ...fragment });
      } else {
        // Merge adjacent fragments with the same status
        updatedRanges[updatedRanges.length - 1].end = fragment.end;
      }
    }

    this._ranges = updatedRanges;
  }

  isFinite(): boolean {
    return this._ranges[this._ranges.length - 1].end !== Number.MAX_SAFE_INTEGER;
  }
}

export { Ranges, Fragment };
