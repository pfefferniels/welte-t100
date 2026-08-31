/**
 * The sample grid: one sample per pixel row of the scan.
 *
 * That is the grid the drawn curve was traced on, so the emulator runs on it too
 * and nothing has to be resampled before the two are compared. The rows are
 * contiguous but not equally spaced in time, because the roll accelerates, so
 * every step carries its own `dt`.
 */

import type { RollTiming } from "./timing.ts";

export class Grid {
  readonly startRow: number;
  readonly length: number;
  readonly seconds: Float64Array;
  readonly dt: Float64Array;

  constructor(startRow: number, seconds: Float64Array) {
    this.startRow = startRow;
    this.length = seconds.length;
    this.seconds = seconds;
    this.dt = Float64Array.from(seconds, (value, index) =>
      index + 1 < seconds.length ? seconds[index + 1]! - value : value - (seconds[index - 1] ?? value - 1),
    );
  }

  static overRows(timing: RollTiming, startRow: number, endRow: number): Grid {
    const length = endRow - startRow + 1;
    return new Grid(
      startRow,
      Float64Array.from({ length }, (_, index) => timing.secondsAtRow(startRow + index)),
    );
  }

  rowAt(index: number): number {
    return this.startRow + index;
  }

  /** Nearest grid index to a pixel row, clamped to the grid. */
  indexOfRow(row: number): number {
    return Math.min(Math.max(Math.round(row) - this.startRow, 0), this.length - 1);
  }

  /** Fractional grid index, for a row that need not be an integer. Not clamped. */
  positionOfRow(row: number): number {
    return row - this.startRow;
  }
}
