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
import type { TrackEvent } from "./smf.ts";

export type Half = "bass" | "treble";

/**
 * `windResistance` is Hagmann's *Widerstand ab/an* (Anhang 10, p. 178), the
 * two-speed control of the blower, which midi2exp and pianolatron both read as
 * the motor switch. On roll 3309 it is worked twenty-two times at musical
 * junctures, so it is plainly an expression device and not a transport control:
 * it changes the blower's output, and with it both the vacuum delivered to the
 * note pneumatics and the vacuum available in the relay to move the bellows.
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
 * One perforation, as punched. `rowOn` and `rowOff` are the first and last pixel
 * row of ink and `tickOn`/`tickOff` the same rows on the MIDI's tick axis; no
 * tracker-bar correction has been applied. Chains of punches that the image
 * parser bridged into one slot appear as a single perforation.
 */
export type Perforation = CodeMeaning & {
  readonly key: number;
  readonly tickOn: number;
  readonly tickOff: number;
  readonly rowOn: number;
  readonly rowOff: number;
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

export function noteOnsets(roll: Roll, half: Half): number[] {
  const track = roll.smf.tracks[half === "bass" ? 1 : 2] ?? [];
  return track.filter((event) => event.kind === "note-on").map((event) => event.tick);
}
