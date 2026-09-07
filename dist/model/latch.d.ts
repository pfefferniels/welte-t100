/**
 * Set/cancel pairs, as the relay's memory valves behave.
 *
 * Crescendo and Mezzoforte are held by a double valve that stays where it was
 * put until the cancelling line is read; the perforation only has to be long
 * enough to trip it. So what matters is when the port first opens far enough,
 * not how long it stays open.
 */
import type { Control, Half } from "../roll/expression.ts";
import { type ModelInput } from "./types.ts";
export declare const TRIP_THRESHOLD = 0.05;
export declare function portOf(input: ModelInput, control: Control, action: "on" | "off"): Float64Array;
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
export declare function shiftedPortOf(input: ModelInput, control: Control, action: "on" | "off", rows: number, drift: number): Float64Array;
/** 1 while the function is set, 0 while cancelled. Cancel wins a tie. */
export declare function latched(on: Float64Array, off: Float64Array, threshold?: number, initial?: number): Uint8Array;
/** 1 only while the port itself is open, which is how midi2exp reads Sforzando. */
export declare function momentary(port: Float64Array, threshold?: number): Uint8Array;
export declare function latchedControl(input: ModelInput, control: Control, initial?: number): Uint8Array;
export declare function halfLabel(half: Half): string;
