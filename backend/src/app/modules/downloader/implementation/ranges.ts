import { FragmentStatus } from '../dtos';

export interface Fragment {
  start: number;  // Inclusive start byte
  end: number;    // Inclusive end byte
  status: FragmentStatus;
}

export interface IRanges {
  ranges: Fragment[];
  setSize(newSize: number | undefined): void;
  markAs(start: number, end: number, status: FragmentStatus): void;
  findSequenceOfAtLeast(size: number, status: FragmentStatus): Fragment | undefined;
  findFirst(status: FragmentStatus): Fragment | undefined;
  toSaveData(): string;
  changeAll(fromStatus: FragmentStatus, toStatus: FragmentStatus): void;
  isFinite(): boolean;
  count(status: FragmentStatus): number;
}

/**
 * Ranges class tracks file download progress using inclusive byte ranges.
 * Ranges are INCLUSIVE: 0-10 means bytes 0 through 10 (11 bytes total).
 */
export class Ranges implements IRanges {
  private _ranges: Fragment[] = [];

  get ranges(): Fragment[] {
    // Filter out infinite ranges from public interface
    return this._ranges.filter((fragment) => fragment.end !== Number.MAX_SAFE_INTEGER);
  }

  setSize(newSize: number | undefined): void {
    if (this._ranges.length === 0) {
      if (newSize !== undefined) {
        this._ranges.push({ start: 0, end: newSize - 1, status: FragmentStatus.pending });
      } else {
        this._ranges.push({ start: 0, end: Number.MAX_SAFE_INTEGER, status: FragmentStatus.pending });
      }
      return;
    }

    const lastFragment = this._ranges[this._ranges.length - 1];
    
    if (newSize === undefined) {
      // Convert to infinite size if not already
      if (lastFragment.end !== Number.MAX_SAFE_INTEGER) {
        this._ranges.push({ 
          start: lastFragment.end + 1, 
          end: Number.MAX_SAFE_INTEGER, 
          status: FragmentStatus.pending 
        });
      }
    } else {
      // Extend to new size if needed
      if (lastFragment.end < newSize - 1) {
        this._ranges.push({ 
          start: lastFragment.end + 1, 
          end: newSize - 1, 
          status: FragmentStatus.pending 
        });
      }
    }
  }

  constructor(private size: number | undefined = undefined) {
    this.setSize(size);
  }

  markAs(start: number, end: number, status: FragmentStatus): void {
    // Validate range bounds
    if (this.size !== undefined) {
      if (start < 0 || end >= this.size || start > end) {
        throw new Error(`Invalid range: ${start}-${end} (file size: ${this.size})`);
      }
    }

    const newFragment: Fragment = { start, end, status };
    const result: Fragment[] = [];

    for (const existing of this._ranges) {
      if (existing.end < start || existing.start > end) {
        // No overlap - keep existing fragment
        result.push(existing);
      } else {
        // Overlap - split existing fragment around new range
        if (existing.start < start) {
          result.push({ 
            start: existing.start, 
            end: start - 1, 
            status: existing.status 
          });
        }
        if (existing.end > end) {
          result.push({ 
            start: end + 1, 
            end: existing.end, 
            status: existing.status 
          });
        }
      }
    }

    result.push(newFragment);
    this._ranges = this.mergeAdjacentFragments(result);
  }

  /**
   * Find a fragment of at least the specified size with the given status.
   * Returns the largest available fragment if none meet the size requirement.
   */
  findSequenceOfAtLeast(size: number, status: FragmentStatus): Fragment | undefined {
    let bestMatch: Fragment | undefined = undefined;
    let bestSize = 0;

    for (const fragment of this._ranges) {
      if (fragment.status === status) {
        const fragmentSize = fragment.end - fragment.start + 1;
        
        if (fragmentSize >= size) {
          // Found exact or larger match - return requested size
          return { start: fragment.start, end: fragment.start + size - 1, status };
        }
        
        if (fragmentSize > bestSize) {
          // Track largest available fragment
          bestMatch = fragment;
          bestSize = fragmentSize;
        }
      }
    }

    // Return largest available fragment if no exact match
    return bestMatch ? { start: bestMatch.start, end: bestMatch.end, status } : undefined;
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
    return this.ranges.reduce((total, fragment) => {
      return fragment.status === status 
        ? total + (fragment.end - fragment.start + 1)
        : total;
    }, 0);
  }

  changeAll(fromStatus: FragmentStatus, toStatus: FragmentStatus): void {
    // Update status and merge adjacent fragments with same status
    const updated = this._ranges.map(fragment => ({
      ...fragment,
      status: fragment.status === fromStatus ? toStatus : fragment.status
    }));
    
    this._ranges = this.mergeAdjacentFragments(updated);
  }

  isFinite(): boolean {
    return this._ranges[this._ranges.length - 1]?.end !== Number.MAX_SAFE_INTEGER;
  }

  /**
   * Merge adjacent fragments with the same status
   */
  private mergeAdjacentFragments(fragments: Fragment[]): Fragment[] {
    if (fragments.length === 0) return [];

    const sorted = fragments.sort((a, b) => a.start - b.start);
    const merged: Fragment[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (last.end + 1 === current.start && last.status === current.status) {
        // Merge adjacent fragments with same status
        last.end = current.end;
      } else {
        merged.push(current);
      }
    }

    return merged;
  }
}




