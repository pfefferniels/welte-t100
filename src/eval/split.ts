/**
 * Train and test masks.
 *
 * The models carry state the length of the roll, so the split cannot be a cut in
 * time — it has to be a mask on the metric while the simulation still runs
 * through. Alternating blocks of a few seconds keep both halves of the split
 * over comparable material; a head/tail cut would put the quiet opening in one
 * and the loud close in the other.
 */

import type { Grid } from "../roll/grid.ts";
import type { Mask } from "./metrics.ts";

export type Split = { readonly train: Mask; readonly test: Mask };

/**
 * The harder test: fit on the first part of the roll and score on the rest.
 * Alternating blocks guard against a model winning on parameter count, but every
 * held-out block sits between two blocks it was fitted on. A contiguous cut asks
 * whether the constants carry into music the fit never saw — a different key,
 * a different texture, a different stretch of the performance.
 */
export function contiguousSplit(grid: Grid, observed: Mask, trainFraction = 0.6): Split {
  const origin = grid.seconds[0]!;
  const span = grid.seconds.at(-1)! - origin;
  const cut = origin + trainFraction * span;
  return {
    train: Uint8Array.from(observed, (value, index) => (grid.seconds[index]! < cut ? value : 0)),
    test: Uint8Array.from(observed, (value, index) => (grid.seconds[index]! < cut ? 0 : value)),
  };
}

export function alternatingBlocks(grid: Grid, observed: Mask, blockSeconds = 8): Split {
  const origin = grid.seconds[0]!;
  const isTrain = Float64Array.from(grid.seconds, (second) =>
    Math.floor((second - origin) / blockSeconds) % 2 === 0 ? 1 : 0,
  );
  return {
    train: Uint8Array.from(observed, (value, index) => (isTrain[index] ? value : 0)),
    test: Uint8Array.from(observed, (value, index) => (isTrain[index] ? 0 : value)),
  };
}
