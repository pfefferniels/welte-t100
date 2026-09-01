/**
 * The roll's own time axis.
 *
 * In a SUPRA raw MIDI one tick is one pixel row of the scan and tick zero is the
 * row named by `@FIRST_HOLE`. Track 0 carries a tempo event every 3600 ticks;
 * those model the take-up spool filling, so the paper accelerates and seconds
 * are not proportional to ticks. Reading the map is free and correct, so nothing
 * here assumes a constant speed.
 */

import { parseSmf, type SmfFile, type TrackEvent } from "./smf.ts";

const SET_TEMPO = 0x51;
const TEXT_META = new Set([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
const METADATA_LINE = /^@([A-Z_]+):\s*(.*)$/;

export type TempoSegment = {
  readonly tick: number;
  readonly seconds: number;
  readonly ticksPerSecond: number;
};

export class RollTiming {
  readonly firstHole: number;
  readonly division: number;
  readonly segments: readonly TempoSegment[];

  constructor(firstHole: number, division: number, segments: readonly TempoSegment[]) {
    this.firstHole = firstHole;
    this.division = division;
    this.segments = segments;
  }

  /** Index of the last segment starting at or before `tick`; 0 for ticks before the map. */
  #segmentAt(tick: number): TempoSegment {
    const found = this.segments.findLastIndex((segment) => segment.tick <= tick);
    return this.segments[Math.max(found, 0)]!;
  }

  secondsAtTick(tick: number): number {
    const segment = this.#segmentAt(tick);
    return segment.seconds + (tick - segment.tick) / segment.ticksPerSecond;
  }

  secondsAtRow(row: number): number {
    return this.secondsAtTick(row - this.firstHole);
  }

  rowAtTick(tick: number): number {
    return tick + this.firstHole;
  }
}

export type Roll = {
  readonly druid: string;
  readonly metadata: ReadonlyMap<string, string>;
  readonly timing: RollTiming;
  readonly smf: SmfFile;
};

function decodeText(event: TrackEvent): string | undefined {
  if (event.kind !== "meta" || !TEXT_META.has(event.type)) return undefined;
  return new TextDecoder().decode(event.data).trim();
}

function rollMetadata(events: readonly TrackEvent[]): Map<string, string> {
  const pairs = events
    .map(decodeText)
    .map((line) => line?.match(METADATA_LINE))
    .filter((match) => match !== null && match !== undefined)
    .map((match): [string, string] => [match[1]!, match[2]!.trim()]);
  return new Map(pairs);
}

function tempoMap(events: readonly TrackEvent[], division: number): TempoSegment[] {
  const changes = events
    .filter((event) => event.kind === "meta" && event.type === SET_TEMPO)
    .map((event) => {
      const data = (event as { data: Uint8Array }).data;
      const microsPerQuarter = (data[0]! << 16) | (data[1]! << 8) | data[2]!;
      return { tick: event.tick, ticksPerSecond: (division * 1e6) / microsPerQuarter };
    })
    .sort((a, b) => a.tick - b.tick);

  return changes.reduce<TempoSegment[]>((segments, change) => {
    const previous = segments.at(-1);
    const seconds = previous
      ? previous.seconds + (change.tick - previous.tick) / previous.ticksPerSecond
      : 0;
    return [...segments, { ...change, seconds }];
  }, []);
}

/** A pixel measurement such as `"16482px"`, as a number. */
export function pixels(value: string | undefined): number {
  return Number.parseFloat((value ?? "").replace(/px$/, ""));
}

/** A scan resolution such as `"300.25ppi"`, in pixel rows per inch of paper. */
export function pixelsPerInch(value: string | undefined): number {
  return Number.parseFloat((value ?? "").replace(/ppi$/, ""));
}

export function readRoll(druid: string, data: Uint8Array): Roll {
  const smf = parseSmf(data);
  const metadata = rollMetadata(smf.tracks.flat());
  const timing = new RollTiming(
    pixels(metadata.get("FIRST_HOLE")),
    smf.division,
    tempoMap(smf.tracks[0] ?? [], smf.division),
  );
  return { druid, metadata, timing, smf };
}
