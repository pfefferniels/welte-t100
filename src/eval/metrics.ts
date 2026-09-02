/**
 * Agreement between an emulated curve and the drawn one.
 *
 * Everything here is masked: rows the tracer could not witness carry no
 * evidence, so they neither reward nor punish a model. All errors are in units
 * of the roll's printed scale, where 1.0 is the whole P.P.–F.F. span.
 */

export type Mask = Uint8Array;

export type Agreement = {
  readonly n: number;
  readonly rmse: number;
  readonly mae: number;
  readonly medianAbs: number;
  readonly p90Abs: number;
  readonly bias: number;
  readonly correlation: number;
};

function forEachMasked(
  a: Float64Array,
  b: Float64Array,
  mask: Mask,
  visit: (x: number, y: number) => void,
): number {
  let n = 0;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === 0) continue;
    visit(a[i]!, b[i]!);
    n += 1;
  }
  return n;
}

/**
 * The same, with residuals past `delta` charged linearly instead of squared.
 *
 * Roll 3309 has a handful of rows the punched code cannot account for: four
 * Discant episodes on 2.3 % of the rows carry 36 % of that half's squared error,
 * and §14 has excluded the trace, the tracker port, the linkage, the hook and
 * anything shared with the Bass as their cause. Under a squared loss those rows
 * pull the constants around, and letting them do so costs 0.0028 on every other
 * held-out row, which is about what every structural term proposed for the
 * transits is worth together.
 *
 * Charging them linearly is the less question-begging way to stop that than
 * naming them: it weighs a row by how far the model misses, not by whether the
 * modeller recognises it. Reporting stays on plain rmse; this is only ever the
 * objective. `delta` at 0 restores it.
 */
export function maskedRobust(model: Float64Array, truth: Float64Array, mask: Mask, delta: number): number {
  if (delta <= 0) return maskedRmse(model, truth, mask);
  let sum = 0;
  let n = 0;
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === 0) continue;
    const error = Math.abs(model[index]! - truth[index]!);
    sum += error <= delta ? error * error : delta * (2 * error - delta);
    n += 1;
  }
  return Math.sqrt(sum / Math.max(n, 1));
}

/** The fitter's inner loop, so written out rather than routed through a callback. */
export function maskedRmse(model: Float64Array, truth: Float64Array, mask: Mask): number {
  let sum = 0;
  let n = 0;
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === 0) continue;
    const error = model[index]! - truth[index]!;
    sum += error * error;
    n += 1;
  }
  return n === 0 ? Number.NaN : Math.sqrt(sum / n);
}

function quantile(sorted: Float64Array, q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const position = q * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, sorted.length - 1);
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
}

export function agreement(model: Float64Array, truth: Float64Array, mask: Mask): Agreement {
  const errors: number[] = [];
  let sumSquare = 0;
  let sumSigned = 0;
  let sumModel = 0;
  let sumTruth = 0;
  let sumModelSq = 0;
  let sumTruthSq = 0;
  let sumProduct = 0;

  const n = forEachMasked(model, truth, mask, (x, y) => {
    const error = x - y;
    errors.push(Math.abs(error));
    sumSquare += error * error;
    sumSigned += error;
    sumModel += x;
    sumTruth += y;
    sumModelSq += x * x;
    sumTruthSq += y * y;
    sumProduct += x * y;
  });

  const sorted = Float64Array.from(errors).sort();
  const covariance = sumProduct / n - (sumModel / n) * (sumTruth / n);
  const spread = Math.sqrt(sumModelSq / n - (sumModel / n) ** 2) * Math.sqrt(sumTruthSq / n - (sumTruth / n) ** 2);

  return {
    n,
    rmse: Math.sqrt(sumSquare / n),
    mae: errors.reduce((total, value) => total + value, 0) / n,
    medianAbs: quantile(sorted, 0.5),
    p90Abs: quantile(sorted, 0.9),
    bias: sumSigned / n,
    correlation: spread === 0 ? Number.NaN : covariance / spread,
  };
}

/** The model shifted `rows` rows later, with the ends held. */
export function shifted(series: Float64Array, rows: number): Float64Array {
  if (rows === 0) return series;
  return Float64Array.from(series, (_, index) => {
    const source = Math.min(Math.max(index - rows, 0), series.length - 1);
    return series[source]!;
  });
}

export type LagSearch = { readonly rows: number; readonly rmse: number; readonly agreement: Agreement };

/**
 * The shift that best aligns the model with the drawn line. A negative result
 * means the model has to be moved earlier, i.e. the drawn line leads the punches.
 */
export function bestLag(
  model: Float64Array,
  truth: Float64Array,
  mask: Mask,
  range: readonly number[],
): LagSearch {
  const scored = range.map((rows) => ({ rows, rmse: maskedRmse(shifted(model, rows), truth, mask) }));
  const best = scored.reduce((a, b) => (b.rmse < a.rmse ? b : a));
  return { ...best, agreement: agreement(shifted(model, best.rows), truth, mask) };
}

export function intersect(...masks: readonly Mask[]): Mask {
  const [first, ...rest] = masks;
  if (!first) throw new Error("intersect needs at least one mask");
  return Uint8Array.from(first, (value, index) => (rest.every((mask) => mask[index]) ? value : 0));
}
