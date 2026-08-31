/**
 * What every model of the nuancing mechanism has in common.
 *
 * A model consumes the port signals of one keyboard half and returns one value
 * per grid row, on the roll's own printed scale: 0 at that half's P.P. gridline,
 * 0.5 at M.F., 1 at the shared F.F. line. That is the scale the drawn line is
 * measured on, and it is also, if Hagmann is right about the Mezzoforte pin
 * stopping the bellows halfway, the travel of the Nuancierbalg itself.
 */

import type { Grid } from "../roll/grid.ts";
import type { Half } from "../roll/expression.ts";
import type { PortKey } from "../roll/aperture.ts";

export type ModelInput = {
  readonly grid: Grid;
  readonly half: Half;
  readonly ports: ReadonlyMap<PortKey, Float64Array>;
  /** Note onsets per second in this half. */
  readonly noteDensity: Float64Array;
  /**
   * Note onsets per second over both halves. The blower is one supply feeding
   * both the note pneumatics and the relay, so what loads it is everything
   * sounding, not only this half.
   */
  readonly totalNoteDensity: Float64Array;
};

export type Parameters = Readonly<Record<string, number>>;

export type ParameterSpec = {
  readonly name: string;
  readonly lower: number;
  readonly upper: number;
  readonly unit: string;
  readonly note: string;
};

export type Model = {
  readonly name: string;
  readonly summary: string;
  readonly spec: readonly ParameterSpec[];
  readonly defaults: Parameters;
  run(input: ModelInput, params: Parameters): Float64Array;
};

/**
 * Step a mutable state across the grid, recording one number per row.
 * `advance` mutates `state` and returns the value observed after the step.
 */
export function simulate<S>(length: number, state: S, advance: (state: S, index: number) => number): Float64Array {
  const output = new Float64Array(length);
  for (let index = 0; index < length; index += 1) {
    output[index] = advance(state, index);
  }
  return output;
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/**
 * The series slid along the paper, interpolating between rows. A negative shift
 * moves the model earlier, which is what is needed to meet a drawn line that
 * runs ahead of its punches. The shift is in scan rows rather than milliseconds
 * because the measured offset holds better as a distance on the paper than as a
 * duration, and because a fixed offset is what a layout would produce.
 */
/**
 * The same, with the shift allowed to change along the roll. The offset between
 * the drawn line and its punches is not quite constant — measured across the
 * thirds of roll 3309 it runs 67, 65, 64 scan rows in the bass and 53, 47, 44 in
 * the treble — which is what two passes of the paper through machines whose
 * transport does not quite agree would produce. `drift` is the total change from
 * the first row to the last.
 */
export function shiftedByDriftingRows(series: Float64Array, rows: number, drift: number): Float64Array {
  if (drift === 0) return shiftedByRows(series, rows);
  const last = series.length - 1;
  const shifted = new Float64Array(series.length);
  const at = (index: number): number => series[index < 0 ? 0 : index > last ? last : index]!;
  for (let index = 0; index <= last; index += 1) {
    const here = rows + (drift * index) / last;
    const whole = Math.floor(here);
    const fraction = here - whole;
    shifted[index] = at(index - whole) * (1 - fraction) + at(index - whole - 1) * fraction;
  }
  return shifted;
}

/**
 * The series slid by an amount that depends on its own value.
 *
 * The pen that drew the line swung on an arm, so where its tip sits *along* the
 * paper depends on how far it has swung *across* it. That makes the offset
 * between line and punches a function of the level, which is what roll 3309
 * shows: within the sforzando-off collapses the offset correlates with the level
 * at the event at r = 0.18 in the bass and 0.44 in the treble. The same geometry
 * bends the printed scale, which `scaleWarp` carries, so the two are one effect
 * seen along two axes.
 *
 * The shift wanted at a row depends on the value that ends up there, which is
 * circular; the value before shifting stands in, and the error in that is second
 * order for shifts of a few rows.
 */
export function shiftedByLevel(series: Float64Array, rowsPerUnit: number, mid: number): Float64Array {
  if (rowsPerUnit === 0) return series;
  const last = series.length - 1;
  const shifted = new Float64Array(series.length);
  const at = (index: number): number => series[index < 0 ? 0 : index > last ? last : index]!;
  for (let index = 0; index <= last; index += 1) {
    const rows = rowsPerUnit * (series[index]! - mid);
    const whole = Math.floor(rows);
    const fraction = rows - whole;
    shifted[index] = at(index - whole) * (1 - fraction) + at(index - whole - 1) * fraction;
  }
  return shifted;
}

export function shiftedByRows(series: Float64Array, rows: number): Float64Array {
  if (rows === 0) return series;
  const last = series.length - 1;
  const whole = Math.floor(rows);
  const fraction = rows - whole;
  const shifted = new Float64Array(series.length);
  for (let index = 0; index <= last; index += 1) {
    const near = index - whole;
    const far = near - 1;
    shifted[index] =
      series[near < 0 ? 0 : near > last ? last : near]! * (1 - fraction) +
      series[far < 0 ? 0 : far > last ? last : far]! * fraction;
  }
  return shifted;
}

export function parameterVector(spec: readonly ParameterSpec[], params: Parameters): number[] {
  return spec.map((entry) => params[entry.name] ?? 0);
}

export function parametersFrom(spec: readonly ParameterSpec[], vector: readonly number[]): Parameters {
  return Object.fromEntries(spec.map((entry, index) => [entry.name, vector[index] ?? 0]));
}

/**
 * The same model with some parameters nailed down, so an ablation asks one
 * question at a time: the pinned values are held while everything else refits
 * around them.
 */
/**
 * The same model with one parameter forced to follow another, for testing a
 * regulation Welte prescribed — the crescendo and sforzando pairs are each
 * adjusted to open and close in the same time.
 */
export function withTied(model: Model, ties: Readonly<Record<string, string>>, name = model.name): Model {
  const free = model.spec.filter((entry) => !(entry.name in ties));
  const follow = (params: Parameters): Parameters =>
    Object.fromEntries(Object.entries(ties).map(([target, source]) => [target, params[source] ?? 0]));
  return {
    name,
    summary: model.summary,
    spec: free,
    defaults: Object.fromEntries(free.map((entry) => [entry.name, model.defaults[entry.name] ?? 0])),
    run: (input, params) => {
      const merged = { ...model.defaults, ...params };
      return model.run(input, { ...merged, ...follow(merged) });
    },
  };
}

export function withFixed(model: Model, fixed: Parameters, name = model.name): Model {
  const free = model.spec.filter((entry) => !(entry.name in fixed));
  return {
    name,
    summary: model.summary,
    spec: free,
    defaults: Object.fromEntries(free.map((entry) => [entry.name, model.defaults[entry.name] ?? 0])),
    run: (input, params) => model.run(input, { ...model.defaults, ...params, ...fixed }),
  };
}
