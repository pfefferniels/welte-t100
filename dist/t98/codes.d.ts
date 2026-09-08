/**
 * The punched expression code of a green Welte (T-98) roll.
 *
 * Five tracker positions at each edge of the paper carry the dynamics and one
 * pedal. Where the T-100 latches a function on with one perforation and cancels
 * it with a second, the T-98 holds it for as long as one continuous perforation
 * lasts: "Die Reduktion von sechs auf vier Oeffnungen ergibt sich, weil im Falle
 * von Crescendo und Mezzoforte Informationseingabe und –negation über ein- und
 * dieselbe Oeffnung gesteuert werden: Die Funktion bleibt genau so lange
 * ausgeführt, als die entsprechende Perforation im Notenband über die
 * Gleitblock-Oeffnung läuft" (Hagmann, pp. 100 f.). Phillips says the same
 * independently: "each function was controlled by a single continuous roll
 * perforation" (p. 121).
 *
 * So there is no `Action` here, and one port per function per half is the whole
 * vocabulary. The two sforzando valves are named for the end of the range they
 * pull towards, and the soft pedal keeps the emulator's part name, the
 * Hammerleiste, rather than the roll's function name.
 *
 * A held command is not one slot in the paper but a chain of round punches on a
 * 2.66 mm grid with bridges of about a millimetre between them, measured on
 * Deutsches Museum rolls 590 and 2431 and on Dyer's scan of 225. The note tracks
 * are punched by the same device, only tighter, for what is indisputably one
 * hold, so the bridges are structural and `CHAIN_GAP_MM` joins them.
 */
import { type PortGeometry, type Slot } from "../core/aperture.ts";
import type { Grid } from "../core/grid.ts";
import { type Half, type ModelInput } from "../core/types.ts";
export type { Half } from "../core/types.ts";
export { HALVES } from "../core/types.ts";
export type Control = "sforzandoPiano" | "mezzoforte" | "sustainPedal" | "crescendo" | "sforzandoForte" | "hammerRail";
/** The four that move the Nuancierbalg, in the order of the openings 64–67. */
export declare const DYNAMIC_CONTROLS: readonly ["sforzandoPiano", "mezzoforte", "crescendo", "sforzandoForte"];
export type CodeMeaning = {
    readonly half: Half;
    readonly control: Control;
};
/**
 * One hole in the paper as the tracker bar meets it: which port it serves, and
 * the first and last row of ink.
 */
export type Punch = CodeMeaning & {
    readonly rowOn: number;
    readonly rowOff: number;
};
export declare function meaningOf(position: number): CodeMeaning | undefined;
/** A T-98 port, named for the stack it belongs to and the function. No action: a hold has none. */
export type PortKey = `${Half}:${Control}`;
export declare function portKey(half: Half, control: Control): PortKey;
/** Chained punches no further apart than `gapPx` are one hold; the default merges a chain. */
export declare function slots(punches: readonly Punch[], gapPx?: number): Slot[];
/** Continuous open fraction per grid row, keyed by half and control. */
export declare function aperturePorts(grid: Grid, punches: readonly Punch[], geometry?: PortGeometry, gapPx?: number): Map<PortKey, Float64Array>;
export declare function portOf(input: ModelInput, control: Control): Float64Array;
/**
 * The port as the mechanism saw it, slid along the paper. DRP 412 965 puts the
 * reading point of a drawn nuance line "im Augenblick des Übergleitens über die
 * Löcher des Skalenblocks", so Welte's own notation intends line and perforation
 * at the same paper position to be simultaneous and the expected shift is zero.
 * A fitted shift far from zero is a finding about the pen or the hand.
 */
export declare function shiftedPortOf(input: ModelInput, control: Control, rows: number, drift: number): Float64Array;
