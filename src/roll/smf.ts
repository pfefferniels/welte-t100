/**
 * A standard MIDI file reader, enough of one for Stanford's SUPRA roll scans.
 *
 * Those files are format 1, one tick per pixel row of the scan, with the roll's
 * metadata in text meta events and the take-up spool's acceleration in the
 * tempo map of track 0.
 */

export type MetaEvent = {
  readonly kind: "meta";
  readonly tick: number;
  readonly type: number;
  readonly data: Uint8Array;
};

export type NoteEvent = {
  readonly kind: "note-on" | "note-off";
  readonly tick: number;
  readonly channel: number;
  readonly key: number;
  readonly velocity: number;
};

export type TrackEvent = MetaEvent | NoteEvent;

export type SmfFile = {
  readonly format: number;
  readonly division: number;
  readonly tracks: readonly (readonly TrackEvent[])[];
};

const META = 0xff;
const SYSEX = 0xf0;
const SYSEX_ESCAPE = 0xf7;
const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const ONE_DATA_BYTE = new Set([0xc0, 0xd0]);

/** A moving read head over a byte buffer. Every read advances it. */
class ByteCursor {
  readonly #data: Uint8Array;
  readonly #view: DataView;
  #at: number;

  constructor(data: Uint8Array, at = 0) {
    this.#data = data;
    this.#view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    this.#at = at;
  }

  get position(): number {
    return this.#at;
  }

  before(limit: number): boolean {
    return this.#at < limit;
  }

  u8(): number {
    return this.#view.getUint8(this.#at++);
  }

  peek(): number {
    return this.#view.getUint8(this.#at);
  }

  u16(): number {
    const value = this.#view.getUint16(this.#at);
    this.#at += 2;
    return value;
  }

  u32(): number {
    const value = this.#view.getUint32(this.#at);
    this.#at += 4;
    return value;
  }

  /** MIDI's base-128 big-endian integer, high bit set on every byte but the last. */
  varInt(): number {
    const accumulate = (value: number): number => {
      const byte = this.u8();
      const next = (value << 7) | (byte & 0x7f);
      return byte & 0x80 ? accumulate(next) : next;
    };
    return accumulate(0);
  }

  bytes(length: number): Uint8Array {
    const slice = this.#data.subarray(this.#at, this.#at + length);
    this.#at += length;
    return slice;
  }

  skip(length: number): void {
    this.#at += length;
  }
}

/**
 * Channel messages carry their status byte only when it changes, so the reader
 * has to remember the last one. That running status is the only state a track
 * needs beyond the cursor and the elapsed tick count.
 */
function* trackEvents(cursor: ByteCursor, end: number): Generator<TrackEvent> {
  let tick = 0;
  let status = 0;

  while (cursor.before(end)) {
    tick += cursor.varInt();
    const marker = cursor.peek();

    if (marker === META) {
      cursor.skip(1);
      const type = cursor.u8();
      const data = cursor.bytes(cursor.varInt());
      yield { kind: "meta", tick, type, data };
      continue;
    }

    if (marker === SYSEX || marker === SYSEX_ESCAPE) {
      cursor.skip(1);
      cursor.skip(cursor.varInt());
      continue;
    }

    if (marker & 0x80) {
      status = marker;
      cursor.skip(1);
    }
    const command = status & 0xf0;
    const channel = status & 0x0f;

    if (ONE_DATA_BYTE.has(command)) {
      cursor.skip(1);
      continue;
    }

    const first = cursor.u8();
    const second = cursor.u8();

    if (command === NOTE_ON && second > 0) {
      yield { kind: "note-on", tick, channel, key: first, velocity: second };
    } else if (command === NOTE_OFF || command === NOTE_ON) {
      yield { kind: "note-off", tick, channel, key: first, velocity: second };
    }
  }
}

export function parseSmf(data: Uint8Array): SmfFile {
  const header = new ByteCursor(data);
  header.skip(4);
  const headerLength = header.u32();
  const format = header.u16();
  const trackCount = header.u16();
  const division = header.u16();

  const cursor = new ByteCursor(data, 8 + headerLength);
  const readTrack = (): readonly TrackEvent[] => {
    cursor.skip(4);
    const length = cursor.u32();
    const end = cursor.position + length;
    const events = [...trackEvents(cursor, end)];
    cursor.skip(end - cursor.position);
    return events;
  };

  return {
    format,
    division,
    tracks: Array.from({ length: trackCount }, readTrack),
  };
}
