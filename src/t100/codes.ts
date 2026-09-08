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
import type { TrackEvent } from "../core/smf.ts";
import { aperturePorts as portsOf, slots as slotsOf, DEFAULT_GEOMETRY, type PortGeometry } from "../core/aperture.ts";
import type { Grid } from "../core/grid.ts";
import { portKey as joinKey, portSeries, type PunchAt } from "../core/ports.ts";
import { shiftedByDriftingRows, type Half, type ModelInput } from "../core/types.ts";

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
export type Control =
  | "mezzoforte"
  | "crescendo"
  | "sforzando"
  | "hammerRail"
  | "sustainPedal"
  | "windResistance"
  | "rewind"
  | "electricCutoff";

export type Action = "on" | "off";

export type CodeMeaning = { readonly half: Half; readonly control: Control; readonly action: Action };

const BASS_CODES: ReadonlyMap<number, readonly [Control, Action]> = new Map([
  [14, ["mezzoforte", "off"]],
  [15, ["mezzoforte", "on"]],
  [16, ["crescendo", "off"]],
  [17, ["crescendo", "on"]],
  [18, ["sforzando", "off"]],
  [19, ["sforzando", "on"]],
  [20, ["hammerRail", "off"]],
  [21, ["hammerRail", "on"]],
  [22, ["windResistance", "off"]],
  [23, ["windResistance", "on"]],
]);

const TREBLE_CODES: ReadonlyMap<number, readonly [Control, Action]> = new Map([
  [104, ["rewind", "on"]],
  [105, ["electricCutoff", "on"]],
  [106, ["sustainPedal", "on"]],
  [107, ["sustainPedal", "off"]],
  [108, ["sforzando", "on"]],
  [109, ["sforzando", "off"]],
  [110, ["crescendo", "on"]],
  [111, ["crescendo", "off"]],
  [112, ["mezzoforte", "on"]],
  [113, ["mezzoforte", "off"]],
]);

export function meaningOf(key: number): CodeMeaning | undefined {
  const bass = BASS_CODES.get(key);
  if (bass) return { half: "bass", control: bass[0], action: bass[1] };
  const treble = TREBLE_CODES.get(key);
  if (treble) return { half: "treble", control: treble[0], action: treble[1] };
  return undefined;
}

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

const EXPRESSION_TRACKS = [3, 4] as const;

function pairNotes(events: readonly TrackEvent[]): { key: number; tickOn: number; tickOff: number }[] {
  const open = new Map<number, number>();
  return events.flatMap((event) => {
    if (event.kind === "note-on") {
      open.set(event.key, event.tick);
      return [];
    }
    if (event.kind !== "note-off") return [];
    const tickOn = open.get(event.key);
    if (tickOn === undefined) return [];
    open.delete(event.key);
    return [{ key: event.key, tickOn, tickOff: event.tick }];
  });
}

/** A T-100 port, named for the stack it belongs to, the function and the edge. */
export type PortKey = `${Half}:${Control}:${Action}`;

export function portKey(half: Half, control: Control, action: Action): PortKey {
  return joinKey(half, control, action) as PortKey;
}

/** A punch named for the port it opens, which is all the aperture geometry needs. */
const punchAt = (punch: Punch): PunchAt => ({
  key: portKey(punch.half, punch.control, punch.action),
  rowOn: punch.rowOn,
  rowOff: punch.rowOff,
});

/** One stretch of the paper over which a T-100 port stands open. */
export type Slot = { readonly key: PortKey; readonly rowOn: number; readonly rowOff: number };

/** Perforations of one port that touch or overlap are one slot in the paper. */
export function slots(punches: readonly Punch[]): Slot[] {
  return slotsOf(punches.map(punchAt)) as Slot[];
}

/** Continuous open fraction per grid row, keyed by half, control and action. */
export function aperturePorts(
  grid: Grid,
  punches: readonly Punch[],
  geometry: PortGeometry = DEFAULT_GEOMETRY,
): Map<PortKey, Float64Array> {
  return portsOf(grid, punches.map(punchAt), geometry) as Map<PortKey, Float64Array>;
}

export function portOf(input: ModelInput, control: Control, action: Action): Float64Array {
  return portSeries(input.ports, portKey(input.half, control, action), input.grid.length);
}

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
export function shiftedPortOf(
  input: ModelInput,
  control: Control,
  action: Action,
  rows: number,
  drift: number,
): Float64Array {
  return shiftedByDriftingRows(portOf(input, control, action), rows, drift);
}

export function halfLabel(half: Half): string {
  return half === "bass" ? "Bass" : "Diskant";
}

export function perforations(roll: Roll): Perforation[] {
  const fromTracks = EXPRESSION_TRACKS.flatMap((index) => pairNotes(roll.smf.tracks[index] ?? []));
  return fromTracks
    .flatMap((note) => {
      const meaning = meaningOf(note.key);
      return meaning
        ? [
            {
              ...meaning,
              key: note.key,
              tickOn: note.tickOn,
              tickOff: note.tickOff,
              rowOn: roll.timing.rowAtTick(note.tickOn),
              rowOff: roll.timing.rowAtTick(note.tickOff),
              secondsOn: roll.timing.secondsAtTick(note.tickOn),
              secondsOff: roll.timing.secondsAtTick(note.tickOff),
            },
          ]
        : [];
    })
    .sort((a, b) => a.tickOn - b.tickOn || a.key - b.key);
}
