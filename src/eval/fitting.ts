/**
 * Fitting one model to one keyboard half, scored on blocks it never saw, and the
 * search underneath it, which a pooled fit over several rolls shares.
 */

import { agreement, maskedRobust, type Agreement, type Mask } from "./metrics.ts";
import { coordinateDescent, differentialEvolution, nelderMead, type Bounds, type Fit } from "./optimise.ts";
import { parametersFrom, parameterVector, type Model, type ModelInput, type Parameters } from "../model/types.ts";
import type { TracedCurve } from "../truth/curves.ts";

export type SearchOptions = {
  readonly generations?: number;
  readonly seed?: number;
  readonly polish?: boolean;
  readonly report?: (line: string) => void;
};

export type FitOptions = SearchOptions & {
  /** Residuals past this are charged linearly. 0 is a plain squared loss. */
  readonly huber?: number;
  /** Centre the initial population here instead of on the model's defaults. */
  readonly startFrom?: Parameters;
};

export type FitResult = {
  readonly params: Parameters;
  readonly train: Agreement;
  readonly test: Agreement;
  readonly output: Float64Array;
  readonly evaluations: number;
  readonly seconds: number;
};

export function boundsOf(model: Model): Bounds {
  return { lower: model.spec.map((entry) => entry.lower), upper: model.spec.map((entry) => entry.upper) };
}

/**
 * The initial population, most of it clustered around the starting point.
 *
 * Seeding a handful of good members into an otherwise random population does not
 * work: differential evolution moves by differences between members, so with
 * most of the population scattered over the whole box every trial step is huge
 * and lands somewhere worse, and a good seed is never refined. Observed on this
 * model as a search that did not improve at all over forty generations. So most
 * of the population starts near the seed, at a spread of scales so that the
 * differences span fine and coarse steps, and the remainder stays random to keep
 * a way out of a local basin.
 */
const CLUSTERED = 0.7;
const SCALES = [0.01, 0.02, 0.05, 0.1, 0.2, 0.35];

export function jitteredSeeds(centre: readonly number[], bounds: Bounds, seed: number): number[][] {
  const size = Math.max(20, 4 * centre.length);
  let state = seed >>> 0;
  const random = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296 - 0.5;
  };
  return [
    [...centre],
    ...Array.from({ length: Math.round(size * CLUSTERED) - 1 }, (_, index) => {
      const scale = SCALES[index % SCALES.length]!;
      return centre.map((value, axis) => {
        const lower = bounds.lower[axis]!;
        const upper = bounds.upper[axis]!;
        return Math.min(Math.max(value + scale * (upper - lower) * random() * 2, lower), upper);
      });
    }),
  ];
}

/** Differential evolution from the seeds, a Nelder–Mead polish, then a coordinate sweep, keeping the best of each. */
export function searchFrom(
  objective: (vector: readonly number[]) => number,
  bounds: Bounds,
  seeds: readonly (readonly number[])[],
  options: SearchOptions = {},
): Fit {
  const coarse = differentialEvolution(objective, bounds, {
    generations: options.generations ?? 160,
    seed: options.seed ?? 1,
    seeds,
    onGeneration: (generation, best) => {
      if (options.report && generation % 20 === 0) {
        options.report(`gen ${generation}: train rmse ${best.value.toFixed(4)}`);
      }
    },
  });
  if (options.polish === false) return coarse;
  const polished = nelderMead(objective, coarse.vector, bounds, { iterations: 120 * bounds.lower.length });
  const afterSimplex = polished.value <= coarse.value ? polished : coarse;
  const swept = coordinateDescent(objective, afterSimplex.vector, bounds);
  const best = swept.value <= afterSimplex.value ? swept : afterSimplex;
  return { ...best, evaluations: coarse.evaluations + polished.evaluations + swept.evaluations };
}

export function fitModel(
  model: Model,
  input: ModelInput,
  truth: TracedCurve,
  masks: { readonly train: Mask; readonly test: Mask },
  options: FitOptions = {},
): FitResult {
  const started = performance.now();
  // Fitted on a robust loss when asked, but always scored on plain rmse below.
  const objective = (vector: readonly number[]): number =>
    maskedRobust(model.run(input, parametersFrom(model.spec, vector)), truth.value, masks.train, options.huber ?? 0);

  const bounds = boundsOf(model);
  const centre = parameterVector(model.spec, { ...model.defaults, ...options.startFrom });
  const best = searchFrom(objective, bounds, jitteredSeeds(centre, bounds, options.seed ?? 1), options);

  const params = parametersFrom(model.spec, best.vector);
  const output = model.run(input, params);
  return {
    params,
    train: agreement(output, truth.value, masks.train),
    test: agreement(output, truth.value, masks.test),
    output,
    evaluations: best.evaluations,
    seconds: (performance.now() - started) / 1000,
  };
}

export function scoreOnly(
  model: Model,
  input: ModelInput,
  truth: TracedCurve,
  masks: { readonly train: Mask; readonly test: Mask },
  params: Parameters = model.defaults,
): FitResult {
  const output = model.run(input, params);
  return {
    params,
    train: agreement(output, truth.value, masks.train),
    test: agreement(output, truth.value, masks.test),
    output,
    evaluations: 1,
    seconds: 0,
  };
}
