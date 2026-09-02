/**
 * The roll's own time axis.
 *
 * In a SUPRA raw MIDI one tick is one pixel row of the scan and tick zero is the
 * row named by `@FIRST_HOLE`. Seconds are not proportional to ticks, because the
 * take-up spool fills as the roll plays and the paper runs faster for it. Two
 * readings of that acceleration are available here.
 *
 * `spoolAxis` is the default and is Gottschewski's, derived in `spool.ts` from
 * the spool's geometry and his measurements of it. `scanAxis` is the tempo map
 * the SUPRA file carries on track 0, one event every 3600 ticks, which compounds
 * the speed by a constant 0.22 % per foot from an undocumented constant that
 * midi2exp used before 2021 (`docs/prior-art.md` §E.3). The two agree on this
 * roll to within 1.6 % of the local step and 0.7 % of the total duration, so the
 * choice is a question of provenance rather than of fit.
 */
import { type SmfFile } from "./smf.ts";
import { type Spool } from "./spool.ts";
export type TempoSegment = {
    readonly tick: number;
    readonly seconds: number;
    readonly ticksPerSecond: number;
};
/** Ticks to seconds, with the same axis as a tempo map for anything that writes MIDI. */
export type TimeAxis = {
    readonly name: string;
    readonly segments: readonly TempoSegment[];
    secondsAtTick(tick: number): number;
};
/** The scan's own tempo map, read as it stands. */
export declare function scanAxis(segments: readonly TempoSegment[]): TimeAxis;
/**
 * The paper speed the take-up spool sets, evaluated in closed form at every tick.
 * The segments are that same curve sampled for export, so a file written from
 * them plays on the axis the model ran on.
 */
export declare function spoolAxis(spool: Spool, pixelsPerInch: number, lengthTicks: number): TimeAxis;
export declare class RollTiming {
    readonly firstHole: number;
    readonly division: number;
    readonly axis: TimeAxis;
    constructor(firstHole: number, division: number, axis: TimeAxis);
    secondsAtTick(tick: number): number;
    secondsAtRow(row: number): number;
    rowAtTick(tick: number): number;
}
export type Roll = {
    readonly druid: string;
    readonly metadata: ReadonlyMap<string, string>;
    readonly timing: RollTiming;
    readonly smf: SmfFile;
};
/** A pixel measurement such as `"16482px"`, as a number. */
export declare function pixels(value: string | undefined): number;
/** A scan resolution such as `"300.25ppi"`, in pixel rows per inch of paper. */
export declare function pixelsPerInch(value: string | undefined): number;
/** Which reading of the acceleration to run on: a spool, or the scan's own map. */
export type AxisChoice = Spool | "scan";
export declare function readRoll(druid: string, data: Uint8Array, axis?: AxisChoice): Roll;
