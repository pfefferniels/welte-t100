/**
 * A standard MIDI file writer, the counterpart of the reader in `roll/smf.ts`.
 *
 * Format 1, one track chunk per track, no running status. The emulator reads a
 * SUPRA scan whose tick is a pixel row and whose tempo map carries the spool's
 * acceleration; writing the same division and the same map back out keeps the
 * output on the roll's own time axis, so a tick in and a tick out mean the same
 * pixel row of the same scan.
 */

export type MidiMessage = {
  readonly tick: number;
  readonly bytes: readonly number[];
};

export type MidiTrack = readonly MidiMessage[];

const META = 0xff;
const END_OF_TRACK = 0x2f;
const SET_TEMPO = 0x51;
const TRACK_NAME = 0x03;
const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const CONTROL_CHANGE = 0xb0;

/** MIDI's base-128 big-endian integer, high bit set on every byte but the last. */
function varInt(value: number): number[] {
  const septets = (rest: number): number[] => (rest === 0 ? [] : [...septets(Math.floor(rest / 128)), rest % 128]);
  const digits = value === 0 ? [0] : septets(value);
  return digits.map((digit, index) => (index === digits.length - 1 ? digit : digit | 0x80));
}

function bigEndian(value: number, width: number): number[] {
  return Array.from({ length: width }, (_, index) => (value >>> (8 * (width - 1 - index))) & 0xff);
}

function chunk(tag: string, body: readonly number[]): number[] {
  return [...[...tag].map((character) => character.charCodeAt(0)), ...bigEndian(body.length, 4), ...body];
}

function metaMessage(tick: number, type: number, data: readonly number[]): MidiMessage {
  return { tick, bytes: [META, type, ...varInt(data.length), ...data] };
}

export function noteOn(tick: number, channel: number, key: number, velocity: number): MidiMessage {
  return { tick, bytes: [NOTE_ON | channel, key, velocity] };
}

export function noteOff(tick: number, channel: number, key: number): MidiMessage {
  return { tick, bytes: [NOTE_OFF | channel, key, 0] };
}

export function controlChange(tick: number, channel: number, controller: number, value: number): MidiMessage {
  return { tick, bytes: [CONTROL_CHANGE | channel, controller, value] };
}

export function setTempo(tick: number, microsPerQuarter: number): MidiMessage {
  return metaMessage(tick, SET_TEMPO, bigEndian(microsPerQuarter, 3));
}

export function trackName(name: string): MidiMessage {
  return metaMessage(0, TRACK_NAME, [...new TextEncoder().encode(name)]);
}

/**
 * Messages are ordered by tick before the delta times are taken, and the sort is
 * stable, so anything a caller places in a deliberate order at one tick stays in
 * it — a note-off before the note-on that replaces it, for instance.
 *
 * A negative tick is rejected rather than folded to zero. The emulator runs on
 * the tracer's grid, which starts a little before the roll's first hole, so it
 * is easy to hand this function a row that has no tick, and a silent fold there
 * displaces every message in the track by the length of the overhang.
 */
function trackChunk(track: MidiTrack): number[] {
  const ordered = track.toSorted((a, b) => a.tick - b.tick);
  const first = ordered[0];
  if (first && first.tick < 0) throw new RangeError(`message at tick ${first.tick}: ticks start at zero`);
  const end = metaMessage(ordered.at(-1)?.tick ?? 0, END_OF_TRACK, []);
  const messages = [...ordered, end];

  return chunk(
    "MTrk",
    messages.flatMap((message, index) => [
      ...varInt(message.tick - (messages[index - 1]?.tick ?? 0)),
      ...message.bytes,
    ]),
  );
}

export function writeSmf(division: number, tracks: readonly MidiTrack[]): Uint8Array {
  const header = chunk("MThd", [...bigEndian(1, 2), ...bigEndian(tracks.length, 2), ...bigEndian(division, 2)]);
  return Uint8Array.from([...header, ...tracks.flatMap(trackChunk)]);
}
