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

import { parseSmf, type SmfFile, type TrackEvent } from "./smf.ts";
import { paperSeconds, WELTE_SPOOL, type Spool } from "./spool.ts";

const SET_TEMPO = 0x51;
const TEXT_META = new Set([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
const METADATA_LINE = /^@([A-Z_]+):\s*(.*)$/;
const CM_PER_INCH = 2.54;
/** Roughly a foot of paper, and the step the SUPRA maps themselves are written at. */
const SEGMENT_TICKS = 3600;

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
export function scanAxis(segments: readonly TempoSegment[]): TimeAxis {
  const segmentAt = (tick: number): TempoSegment => {
    const found = segments.findLastIndex((segment) => segment.tick <= tick);
    return segments[Math.max(found, 0)]!;
  };

  return {
    name: "scan tempo map",
    segments,
    secondsAtTick(tick) {
      const segment = segmentAt(tick);
      return segment.seconds + (tick - segment.tick) / segment.ticksPerSecond;
    },
  };
}

/**
 * The paper speed the take-up spool sets, evaluated in closed form at every tick.
 * The segments are that same curve sampled for export, so a file written from
 * them plays on the axis the model ran on.
 */
export function spoolAxis(spool: Spool, pixelsPerInch: number, lengthTicks: number): TimeAxis {
  const secondsAtTick = (tick: number): number => paperSeconds(spool, (tick / pixelsPerInch) * CM_PER_INCH);
  const steps = Math.max(Math.ceil(lengthTicks / SEGMENT_TICKS), 1);

  return {
    name: `spool, ${spool.circumferenceCm} cm at ${spool.circumferenceEffect * 100} % effect`,
    segments: Array.from({ length: steps }, (_, index) => {
      const tick = index * SEGMENT_TICKS;
      return {
        tick,
        seconds: secondsAtTick(tick),
        ticksPerSecond: SEGMENT_TICKS / (secondsAtTick(tick + SEGMENT_TICKS) - secondsAtTick(tick)),
      };
    }),
    secondsAtTick,
  };
}

export class RollTiming {
  readonly firstHole: number;
  readonly division: number;
  readonly axis: TimeAxis;

  constructor(firstHole: number, division: number, axis: TimeAxis) {
    this.firstHole = firstHole;
    this.division = division;
    this.axis = axis;
  }

  secondsAtTick(tick: number): number {
    return this.axis.secondsAtTick(tick);
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

/** Which reading of the acceleration to run on: a spool, or the scan's own map. */
export type AxisChoice = Spool | "scan";

function lastTick(smf: SmfFile): number {
  return smf.tracks.flat().reduce((latest, event) => Math.max(latest, event.tick), 0);
}

function axisOf(choice: AxisChoice, smf: SmfFile, metadata: ReadonlyMap<string, string>): TimeAxis {
  if (choice === "scan") return scanAxis(tempoMap(smf.tracks[0] ?? [], smf.division));

  const resolution = pixelsPerInch(metadata.get("LENGTH_DPI"));
  if (!Number.isFinite(resolution)) {
    throw new Error("the roll gives no @LENGTH_DPI, so a pixel row is of unknown length in paper");
  }
  return spoolAxis(choice, resolution, lastTick(smf));
}

export function readRoll(druid: string, data: Uint8Array, axis: AxisChoice = WELTE_SPOOL): Roll {
  const smf = parseSmf(data);
  const metadata = rollMetadata(smf.tracks.flat());
  const timing = new RollTiming(pixels(metadata.get("FIRST_HOLE")), smf.division, axisOf(axis, smf, metadata));
  return { druid, metadata, timing, smf };
}
