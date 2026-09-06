/**
 * The four constants a roll shows directly, rather than through a fit.
 *
 * `docs/measurements.md` reads them off roll 3309 by hand — the two rails the drawn
 * line comes to rest on, the level the Mezzoforte hook arrests it at, and how
 * far the line runs ahead of the punches — and `analysis/measure.py` with
 * `analysis/pinfaces.py` carries that out in Python. This repeats the same
 * measurement from a loaded roll, so that every roll goes through it and none
 * of the numbers has to be copied from 3309.
 *
 * Three departures from the Python, all of them stated where they occur:
 * evidence is the emulator's own `observed` mask rather than the raw flag
 * column; the Mezzoforte latch and the lead are handled in scan rows rather
 * than in seconds; and the whole thing runs on whichever time axis the roll was
 * loaded with, which for `loadRoll` is the take-up spool rather than the tempo
 * map the tracer wrote into `curves.csv`.
 */

import { HALVES, type Half, type Perforation } from "../roll/expression.ts";
import type { Grid } from "../roll/grid.ts";
import type { LoadedRoll } from "../roll/load.ts";
import type { Parameters } from "../model/types.ts";
import { halfOf, type TracedCurve } from "./curves.ts";

/** A stretch of rows, as a half-open range of grid indices. */
type Run = { readonly from: number; readonly to: number };

export type RailPair = {
  /** Where the line rests fully open, and fully closed, on the printed scale. */
  readonly piano: number;
  readonly forte: number;
};

export type HookFace = {
  /** The face a falling line comes to rest against. Not the pin's centre. */
  readonly level: number;
  /** Settled stretches inside a hold that were reached from above. */
  readonly arrivals: number;
  readonly spread: number;
  /** The plain plateau median the face search was centred on. */
  readonly plateau: number;
};

export type LineLead = {
  /** Scan rows by which the drawn line runs ahead of the punch that names it. */
  readonly aheadRows: number;
  readonly falls: number;
  readonly iqrRows: number;
};

export type HalfMeasurement = {
  readonly half: Half;
  readonly rails: RailPair;
  readonly hook: HookFace;
  readonly lead: LineLead;
  readonly observedRows: number;
};

export type RollMeasurement = Record<Half, HalfMeasurement>;

/** Rows either side for the slow rate, about 25 ms, and what counts as at rest. */
const RATE_WINDOW = 15;
const RESTING_RATE = 0.08;

/** The histogram the two rails are read off, as `analysis/measure.py` cuts it. */
const BIN_WIDTH = 0.005;
const BIN_FROM = -0.06;
const BIN_TO = 1.12;
const PIANO_BELOW = 0.25;
const FORTE_ABOVE = 0.75;

/**
 * The band the hook's plateau is looked for in. It is fixed on the printed
 * scale rather than on this roll's numbers: 0 is the half's P.P. gridline and
 * 0.5 the M.F. one, so a hook regulated anywhere near the printed midpoint
 * falls inside it whatever the roll.
 */
const PLATEAU_BAND: RailPair = { piano: 0.45, forte: 0.78 };
const PLATEAU_ROWS = 31;

/** The face search, following `analysis/pinfaces.py`. */
const SETTLED_RATE = 0.1;
const SETTLED_ROWS = 25;
const FACE_BAND = 0.12;
const APPROACH_SECONDS = 0.1;
const APPROACH_TRAVEL = 0.01;

/** The fast rate the lead is read off, about 10 ms, and what counts as a collapse. */
const SLOPE_WINDOW = 6;
const COLLAPSE_RATE = 3;
const COLLAPSE_SEPARATION = 0.1;
const NEAREST_PUNCH_SECONDS = 0.25;

function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** Linear-interpolating quantile, as numpy's default. */
function quantile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const at = fraction * (sorted.length - 1);
  const below = Math.floor(at);
  const above = Math.min(below + 1, sorted.length - 1);
  return sorted[below]! + (at - below) * (sorted[above]! - sorted[below]!);
}

function standardDeviation(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

/** Leftmost index whose value is at least `target`, in an ascending series. */
function firstAtLeast(values: ArrayLike<number>, target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (values[middle]! < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Maximal runs of set rows, `least` rows long or longer. */
function runsOf(flag: Uint8Array, least: number): Run[] {
  const runs: Run[] = [];
  let from = -1;
  flag.forEach((set, index) => {
    if (set && from < 0) from = index;
    else if (!set && from >= 0) {
      if (index - from >= least) runs.push({ from, to: index });
      from = -1;
    }
  });
  if (from >= 0 && flag.length - from >= least) runs.push({ from, to: flag.length });
  return runs;
}

/** The drawn values, with everything the tracer did not witness as NaN. */
function witnessed(curve: TracedCurve): Float64Array {
  return Float64Array.from(curve.value, (value, index) => (curve.observed[index] ? value : Number.NaN));
}

/** Central difference over `window` rows either side, NaN where either end is unwitnessed. */
function rateOver(value: Float64Array, seconds: Float64Array, window: number): Float64Array {
  return Float64Array.from(value, (_, index) => {
    const back = index - window;
    const forward = index + window;
    if (back < 0 || forward >= value.length) return Number.NaN;
    return (value[forward]! - value[back]!) / (seconds[forward]! - seconds[back]!);
  });
}

function restingRows(value: Float64Array, rate: Float64Array, limit: number): Uint8Array {
  return Uint8Array.from(value, (level, index) =>
    Number.isFinite(level) && Math.abs(rate[index]!) < limit ? 1 : 0,
  );
}

/**
 * The fullest bin of a 0.005-wide histogram, restricted to one end of the
 * scale. Where the line comes to rest is where a mechanical stop is.
 */
function restingMode(levels: readonly number[], within: (centre: number) => boolean): number {
  const bins = Math.round((BIN_TO - BIN_FROM) / BIN_WIDTH);
  const count = new Int32Array(bins);
  const centreOf = (bin: number): number => BIN_FROM + (bin + 0.5) * BIN_WIDTH;
  levels.forEach((level) => {
    const bin = Math.floor((level - BIN_FROM) / BIN_WIDTH);
    if (bin >= 0 && bin < bins) count[bin] = count[bin]! + 1;
  });
  const candidates = [...count.keys()].filter((bin) => within(centreOf(bin)));
  return centreOf(candidates.reduce((best, bin) => (count[bin]! > count[best]! ? bin : best)));
}

function railsOf(value: Float64Array, rate: Float64Array): RailPair {
  const resting = restingRows(value, rate, RESTING_RATE);
  const levels = [...value].filter((_, index) => resting[index]);
  return {
    piano: restingMode(levels, (centre) => centre < PIANO_BELOW),
    forte: restingMode(levels, (centre) => centre > FORTE_ABOVE),
  };
}

/**
 * 1 while the Mezzoforte hook is set, read `ahead` rows further along the
 * paper. The Python samples the latch at `seconds + lead`; the line leads its
 * punches by a distance more nearly than by a delay, so the shift is applied to
 * the rows instead, which also keeps the measurement off the time axis.
 */
function hookHeld(punches: readonly Perforation[], grid: Grid, half: Half, ahead: number): Uint8Array {
  const switches = punches
    .filter((punch) => punch.half === half && punch.control === "mezzoforte")
    .map((punch) => ({ row: punch.rowOn - ahead, sets: punch.action === "on" }))
    .sort((a, b) => a.row - b.row);
  const indexOf = (row: number): number =>
    Math.min(Math.max(Math.round(row) - grid.startRow, 0), grid.length);

  const held = new Uint8Array(grid.length);
  switches.forEach((change, at) => {
    if (!change.sets) return;
    const until = switches[at + 1];
    held.fill(1, indexOf(change.row), until ? indexOf(until.row) : grid.length);
  });
  return held;
}

/** The median of the line's settled visits inside a hold, over one visit per stretch. */
function plateauLevel(value: Float64Array, rate: Float64Array, held: Uint8Array): number {
  const flat = Uint8Array.from(value, (level, index) =>
    held[index] &&
    Number.isFinite(level) &&
    Math.abs(rate[index]!) < RESTING_RATE &&
    level > PLATEAU_BAND.piano &&
    level < PLATEAU_BAND.forte
      ? 1
      : 0,
  );
  const visits = runsOf(flat, PLATEAU_ROWS).map((run) => median([...value.subarray(run.from, run.to)]));
  return median(visits);
}

/**
 * The face the line lands on when it arrives at the hook descending.
 *
 * Every one of roll 3309's twenty-two engagements is made from the fortissimo
 * rail, so only this one face is observable and the pin's centre has to be
 * supplied as `MF_THICKNESS`. Classifying by the approach keeps the level from
 * being pulled about by stretches that crept into place, which is why the plain
 * plateau median above is used only to place the search band.
 */
function hookFace(
  value: Float64Array,
  rate: Float64Array,
  held: Uint8Array,
  seconds: Float64Array,
  around: number,
): Omit<HookFace, "plateau"> {
  const settled = Uint8Array.from(value, (level, index) =>
    held[index] &&
    Number.isFinite(level) &&
    Math.abs(rate[index]!) < SETTLED_RATE &&
    Math.abs(level - around) < FACE_BAND
      ? 1
      : 0,
  );
  const fromAbove = runsOf(settled, SETTLED_ROWS).flatMap((run) => {
    const before = firstAtLeast(seconds, seconds[run.from]! - APPROACH_SECONDS);
    if (before <= 0 || !held[before]) return [];
    const approach = value[run.from]! - value[before]!;
    if (!(approach <= -APPROACH_TRAVEL)) return [];
    return [median([...value.subarray(run.from, run.to)])];
  });
  return { level: median(fromAbove), arrivals: fromAbove.length, spread: standardDeviation(fromAbove) };
}

/**
 * Onsets of the collapses of the drawn line: the first row of each run where it
 * is falling faster than `COLLAPSE_RATE`, thinned so that two onsets closer than
 * `COLLAPSE_SEPARATION` count once.
 */
function collapses(value: Float64Array, seconds: Float64Array): { row: number; seconds: number }[] {
  const spans = value.length - SLOPE_WINDOW;
  const falling = Uint8Array.from({ length: spans }, (_, at) => {
    const rate = (value[at + SLOPE_WINDOW]! - value[at]!) / (seconds[at + SLOPE_WINDOW]! - seconds[at]!);
    return Number.isFinite(rate) && -rate > COLLAPSE_RATE ? 1 : 0;
  });
  const onsets = [...falling.keys()]
    .filter((at) => falling[at] && !falling[at - 1])
    .map((at) => ({ index: at + SLOPE_WINDOW / 2, seconds: (seconds[at]! + seconds[at + SLOPE_WINDOW]!) / 2 }));
  return onsets
    .filter((onset, at) => at === 0 || onset.seconds - onsets[at - 1]!.seconds > COLLAPSE_SEPARATION)
    .map((onset) => ({ row: onset.index, seconds: onset.seconds }));
}

/**
 * How far the drawn line runs ahead of the punch that names it, from the offset
 * between each collapse and the nearest sforzando-off perforation.
 *
 * Measured in scan rows rather than milliseconds, because on roll 3309 the
 * offset holds better as a distance on the paper than as a duration, and
 * because the model shifts its ports by rows.
 */
function leadOf(
  value: Float64Array,
  grid: Grid,
  punches: readonly Perforation[],
  half: Half,
): LineLead {
  const cancels = punches
    .filter((punch) => punch.half === half && punch.control === "sforzando" && punch.action === "off")
    .sort((a, b) => a.secondsOn - b.secondsOn);
  const times = cancels.map((punch) => punch.secondsOn);

  const offsets = collapses(value, grid.seconds).flatMap((fall) => {
    const at = firstAtLeast(times, fall.seconds);
    const nearest = [at - 1, at]
      .map((index) => cancels[Math.min(Math.max(index, 0), cancels.length - 1)])
      .filter((punch) => punch !== undefined)
      .reduce((closest, punch) =>
        Math.abs(fall.seconds - punch.secondsOn) < Math.abs(fall.seconds - closest.secondsOn) ? punch : closest,
      );
    if (Math.abs(fall.seconds - nearest.secondsOn) >= NEAREST_PUNCH_SECONDS) return [];
    return [nearest.rowOn - (grid.rowAt(0) + fall.row)];
  });

  return {
    aheadRows: median(offsets),
    falls: offsets.length,
    iqrRows: quantile(offsets, 0.75) - quantile(offsets, 0.25),
  };
}

export function measureHalf(loaded: LoadedRoll, half: Half): HalfMeasurement {
  const curve = halfOf(loaded.curves, half);
  const grid = loaded.grid;
  const value = witnessed(curve);
  const rate = rateOver(value, grid.seconds, RATE_WINDOW);

  const lead = leadOf(value, grid, loaded.perforations, half);
  const held = hookHeld(loaded.perforations, grid, half, lead.aheadRows);
  const plateau = plateauLevel(value, rate, held);

  return {
    half,
    rails: railsOf(value, rate),
    hook: { ...hookFace(value, rate, held, grid.seconds, plateau), plateau },
    lead,
    observedRows: curve.observed.reduce((sum: number, seen) => sum + seen, 0),
  };
}

export function measureRoll(loaded: LoadedRoll): RollMeasurement {
  return Object.fromEntries(HALVES.map((half) => [half, measureHalf(loaded, half)])) as RollMeasurement;
}

/**
 * What a roll has to show before a constant may be read off it rather than
 * fitted. Roll 3309 clears every one of these by a wide margin — 151 and 112
 * arrivals at the hook, 222 and 274 collapses — but other rolls do not, and a
 * hook level resting on three visits inside one hold is not a measurement.
 *
 * The two counts are a judgement rather than a derived quantity. They are set
 * where a median stops resting on a handful of events and starts sampling
 * several holds, which is what the hook's hold-to-hold drift asks for.
 */
const ENOUGH_ARRIVALS = 20;
const ENOUGH_COLLAPSES = 30;

export type Evidence = {
  readonly names: readonly string[];
  readonly shown: (measured: HalfMeasurement) => boolean;
  readonly wanted: string;
};

const EVIDENCE: readonly Evidence[] = [
  {
    names: ["piano", "forte"],
    shown: (measured) => Number.isFinite(measured.rails.piano) && Number.isFinite(measured.rails.forte),
    wanted: "the line coming to rest at both rails",
  },
  {
    names: ["mezzoforte"],
    shown: (measured) => measured.hook.arrivals >= ENOUGH_ARRIVALS,
    wanted: `${ENOUGH_ARRIVALS} settled arrivals at the hook from above`,
  },
  {
    names: ["leadRows"],
    shown: (measured) => measured.lead.falls >= ENOUGH_COLLAPSES,
    wanted: `${ENOUGH_COLLAPSES} collapses matched to a sforzando-off punch`,
  },
];

/**
 * The measurement as the parameters the fit pins, carrying only what this roll
 * actually shows. What it does not show is left out, so the search fits it
 * instead of being pinned at a number nothing supports.
 *
 * `mezzoforte` is the pin's centre, which no roll shows: only the face a
 * falling line lands on is observable, and the centre lies half the pinned
 * thickness below it. `leadRows` is negative because it slides the model's
 * ports back to meet a line that runs ahead of them.
 */
export function parametersOf(measured: HalfMeasurement, mfThickness: number): Parameters {
  const all: Parameters = {
    piano: measured.rails.piano,
    forte: measured.rails.forte,
    mezzoforte: measured.hook.level + mfThickness / 2,
    leadRows: -measured.lead.aheadRows,
  };
  const shown = EVIDENCE.filter((entry) => entry.shown(measured)).flatMap((entry) => entry.names);
  return Object.fromEntries(shown.map((name) => [name, all[name]!]));
}

/** The constants this roll cannot settle, and what each of them wanted. */
export function withheldFrom(measured: HalfMeasurement): Evidence[] {
  return EVIDENCE.filter((entry) => !entry.shown(measured));
}
