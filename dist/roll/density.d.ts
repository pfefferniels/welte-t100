/**
 * How much is sounding, row by row.
 *
 * The blower is one supply feeding the note pneumatics and the relay alike, so
 * the model reads the note onsets of a half, and of both halves together, as a
 * load on it. What it wants is a rate, onsets per second, in a window centred
 * on each row.
 */
import type { Grid } from "./grid.ts";
export declare function noteDensity(grid: Grid, onsetRows: readonly number[], windowSeconds?: number): Float64Array;
