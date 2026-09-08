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

import {
  aperturePorts as portsOf,
  slots as slotsOf,
  type PortGeometry,
  type Slot,
} from "../core/aperture.ts";
import type { Grid } from "../core/grid.ts";
import { portKey as joinKey, portSeries, type PunchAt } from "../core/ports.ts";
import { shiftedByDriftingRows, type Half, type ModelInput } from "../core/types.ts";
import { CHAIN_GAP_ROWS, DEFAULT_T98_GEOMETRY } from "./geometry.ts";

export type { Half } from "../core/types.ts";
export { HALVES } from "../core/types.ts";

export type Control =
  | "sforzandoPiano"
  | "mezzoforte"
  | "sustainPedal"
  | "crescendo"
  | "sforzandoForte"
  | "hammerRail";

/** The four that move the Nuancierbalg, in the order of the openings 64–67. */
export const DYNAMIC_CONTROLS = ["sforzandoPiano", "mezzoforte", "crescendo", "sforzandoForte"] as const;

export type CodeMeaning = { readonly half: Half; readonly control: Control };

/**
 * One hole in the paper as the tracker bar meets it: which port it serves, and
 * the first and last row of ink.
 */
export type Punch = CodeMeaning & {
  readonly rowOn: number;
  readonly rowOff: number;
};

/**
 * Hagmann's Anhang 11 (p. 179), confirmed independently by control 0 of Anhang
 * 12, which reads the order off a scale roll rather than off a tracker-bar
 * table — "im Diskant werden die Funktionen Sforzando ab, Mezzoforte,
 * Hammerleiste, Crescendo, Sforzando an, im Bass die Funktionen Sforzando ab,
 * Mezzoforte, Pedal, Crescendo, Sforzando an eingegeben" (p. 180) — and by
 * Welte's own Abb. E and Abb. F. Positions are the bar's own 1-based numbering
 * from the bass edge.
 */
const BASS_CODES: ReadonlyMap<number, Control> = new Map([
  [1, "sforzandoPiano"],
  [2, "mezzoforte"],
  [3, "sustainPedal"],
  [4, "crescendo"],
  [5, "sforzandoForte"],
] as const);

const TREBLE_CODES: ReadonlyMap<number, Control> = new Map([
  [94, "sforzandoForte"],
  [95, "crescendo"],
  [96, "hammerRail"],
  [97, "mezzoforte"],
  [98, "sforzandoPiano"],
] as const);

export function meaningOf(position: number): CodeMeaning | undefined {
  const bass = BASS_CODES.get(position);
  if (bass) return { half: "bass", control: bass };
  const treble = TREBLE_CODES.get(position);
  if (treble) return { half: "treble", control: treble };
  return undefined;
}

/** A T-98 port, named for the stack it belongs to and the function. No action: a hold has none. */
export type PortKey = `${Half}:${Control}`;

export function portKey(half: Half, control: Control): PortKey {
  return joinKey(half, control) as PortKey;
}

const punchAt = (punch: Punch): PunchAt => ({
  key: portKey(punch.half, punch.control),
  rowOn: punch.rowOn,
  rowOff: punch.rowOff,
});

/** Chained punches no further apart than `gapPx` are one hold; the default merges a chain. */
export function slots(punches: readonly Punch[], gapPx = CHAIN_GAP_ROWS): Slot[] {
  return slotsOf(punches.map(punchAt), gapPx);
}

/** Continuous open fraction per grid row, keyed by half and control. */
export function aperturePorts(
  grid: Grid,
  punches: readonly Punch[],
  geometry: PortGeometry = DEFAULT_T98_GEOMETRY,
  gapPx = CHAIN_GAP_ROWS,
): Map<PortKey, Float64Array> {
  return portsOf(grid, punches.map(punchAt), geometry, gapPx) as Map<PortKey, Float64Array>;
}

export function portOf(input: ModelInput, control: Control): Float64Array {
  return portSeries(input.ports, portKey(input.half, control), input.grid.length);
}

/**
 * The port as the mechanism saw it, slid along the paper. DRP 412 965 puts the
 * reading point of a drawn nuance line "im Augenblick des Übergleitens über die
 * Löcher des Skalenblocks", so Welte's own notation intends line and perforation
 * at the same paper position to be simultaneous and the expected shift is zero.
 * A fitted shift far from zero is a finding about the pen or the hand.
 */
export function shiftedPortOf(input: ModelInput, control: Control, rows: number, drift: number): Float64Array {
  return shiftedByDriftingRows(portOf(input, control), rows, drift);
}
