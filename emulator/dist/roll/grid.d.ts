/**
 * The sample grid: one sample per pixel row of the scan.
 *
 * That is the grid the drawn curve was traced on, so the emulator runs on it too
 * and nothing has to be resampled before the two are compared. The rows are
 * contiguous but not equally spaced in time, because the roll accelerates, so
 * every step carries its own `dt`.
 */
import type { RollTiming } from "./timing.ts";
export declare class Grid {
    readonly startRow: number;
    readonly length: number;
    readonly seconds: Float64Array;
    readonly dt: Float64Array;
    constructor(startRow: number, seconds: Float64Array);
    static overRows(timing: RollTiming, startRow: number, endRow: number): Grid;
    rowAt(index: number): number;
    /** Nearest grid index to a pixel row, clamped to the grid. */
    indexOfRow(row: number): number;
    /** Fractional grid index, for a row that need not be an integer. Not clamped. */
    positionOfRow(row: number): number;
}
