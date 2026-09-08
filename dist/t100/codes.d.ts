/**
 * The punched expression code of a red Welte (T-100) roll.
 *
 * Ten tracker holes at each edge of the paper carry the dynamics. Hagmann
 * describes them as six openings per half for the nuancing proper, ordered so
 * that each function's cancel line precedes its set line across the glide
 * block, plus the pedal and motor lines. Stanford's roll-image-parser maps them
 * onto MIDI keys 14..23 (bass) and 104..113 (treble), mirrored, and puts them on
 * tracks 3 and 4 of the raw file.
 */
import type { Roll } from "./timing.ts";
import { type PortGeometry } from "../core/aperture.ts";
import type { Grid } from "../core/grid.ts";
import { type Half, type ModelInput } from "../core/types.ts";
export type { Half } from "../core/types.ts";
export { HALVES } from "../core/types.ts";
/**
 * `windResistance` is Hagmann's *Widerstand ab/an* (Anhang 10, p. 178), the
 * two-speed control of the blower, which midi2exp and pianolatron both read as
 * the motor switch. Five of the six lined rolls work it, switching it on up to a
 * dozen times each, and on roll 3309 at musical junctures, so it is plainly an
 * expression device and not a transport control: it changes the blower's output,
 * and with it both the vacuum delivered to the note pneumatics and the vacuum
 * available in the relay to move the bellows.
 */
export type Control = "mezzoforte" | "crescendo" | "sforzando" | "hammerRail" | "sustainPedal" | "windResistance" | "rewind" | "electricCutoff";
export type Action = "on" | "off";
export type CodeMeaning = {
    readonly half: Half;
    readonly control: Control;
    readonly action: Action;
};
export declare function meaningOf(key: number): CodeMeaning | undefined;
/**
 * One hole in the paper as the tracker bar meets it: which port it serves, and
 * the first and last row of ink. No tracker-bar correction has been applied.
 * This is all the mechanism needs to know about a perforation.
 */
export type Punch = CodeMeaning & {
    readonly rowOn: number;
    readonly rowOff: number;
};
/**
 * A punch as a SUPRA scan records it: `tickOn`/`tickOff` are the same rows on
 * the MIDI's tick axis. Chains of punches that the image parser bridged into one
 * slot appear as a single perforation.
 */
export type Perforation = Punch & {
    readonly key: number;
    readonly tickOn: number;
    readonly tickOff: number;
    readonly secondsOn: number;
    readonly secondsOff: number;
};
/** A T-100 port, named for the stack it belongs to, the function and the edge. */
export type PortKey = `${Half}:${Control}:${Action}`;
export declare function portKey(half: Half, control: Control, action: Action): PortKey;
/** One stretch of the paper over which a T-100 port stands open. */
export type Slot = {
    readonly key: PortKey;
    readonly rowOn: number;
    readonly rowOff: number;
};
/** Perforations of one port that touch or overlap are one slot in the paper. */
export declare function slots(punches: readonly Punch[]): Slot[];
/** Continuous open fraction per grid row, keyed by half, control and action. */
export declare function aperturePorts(grid: Grid, punches: readonly Punch[], geometry?: PortGeometry): Map<PortKey, Float64Array>;
export declare function portOf(input: ModelInput, control: Control, action: Action): Float64Array;
/**
 * The port as the mechanism saw it, slid along the paper.
 *
 * The drawn line runs ahead of the punches, and by different amounts for
 * different codes: measured on roll 3309 the sforzando-on code sits 5.8 ms
 * (bass) and 10.7 ms (treble) later than the sforzando-off code, both sharp
 * enough to place, and the crescendo codes tens of milliseconds earlier again.
 * Fitted on the six lined rolls, each of the two relative offsets keeps that
 * sign on nine of the twelve halves, the rest undecided between seeds.
 * One offset for the whole half therefore mis-places most of the roll. Sliding
 * each port by its own amount is also the right place to do it: the offset
 * belongs to how the paper was laid out, which is an input to the mechanism, not
 * something the mechanism does.
 */
export declare function shiftedPortOf(input: ModelInput, control: Control, action: Action, rows: number, drift: number): Float64Array;
export declare function halfLabel(half: Half): string;
export declare function perforations(roll: Roll): Perforation[];
