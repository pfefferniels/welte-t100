/**
 * Fitting one model to one keyboard half, scored on blocks it never saw.
 */

import { agreement, maskedRmse, type Agreement, type Mask } from "./metrics.ts";
import { differentialEvolution, nelderMead, type Bounds } from "./optimise.ts";
import { parametersFrom, parameterVector, type Model, type ModelInput, type Parameters } from "../model/types.ts";
import type { TracedCurve } from "../truth/curves.ts";

export type FitOptions = {
  readonly generations?: number;
  readonly seed?: number;
  readonly polish?: boolean;
  readonly report?: (line: string) => void;
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

function jitteredSeeds(model: Model, seed: number, startFrom?: Parameters): number[][] {
  const centre = parameterVector(model.spec, { ...model.defaults, ...startFrom });
  const size = Math.max(20, 4 * model.spec.length);
  let state = seed >>> 0;
  const random = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296 - 0.5;
  };
  return [
    centre,
    ...Array.from({ length: Math.round(size * CLUSTERED) - 1 }, (_, index) => {
      const scale = SCALES[index % SCALES.length]!;
      return centre.map((value, axis) => {
        const { lower, upper } = model.spec[axis]!;
        return Math.min(Math.max(value + scale * (upper - lower) * random() * 2, lower), upper);
      });
    }),
  ];
}

export function fitModel(
  model: Model,
  input: ModelInput,
  truth: TracedCurve,
  masks: { readonly train: Mask; readonly test: Mask },
  options: FitOptions = {},
): FitResult {
  const started = performance.now();
  const objective = (vector: readonly number[]): number =>
    maskedRmse(model.run(input, parametersFrom(model.spec, vector)), truth.value, masks.train);

  const coarse = differentialEvolution(objective, boundsOf(model), {
    generations: options.generations ?? 160,
    seed: options.seed ?? 1,
    seeds: jitteredSeeds(model, options.seed ?? 1, options.startFrom),
    onGeneration: (generation, best) => {
      if (options.report && generation % 20 === 0) {
        options.report(`gen ${generation}: train rmse ${best.value.toFixed(4)}`);
      }
    },
  });
  const polished =
    options.polish === false
      ? coarse
      : nelderMead(objective, coarse.vector, boundsOf(model), { iterations: 120 * model.spec.length });
  const best = polished.value <= coarse.value ? polished : coarse;

  const params = parametersFrom(model.spec, best.vector);
  const output = model.run(input, params);
  return {
    params,
    train: agreement(output, truth.value, masks.train),
    test: agreement(output, truth.value, masks.test),
    output,
    evaluations: coarse.evaluations + polished.evaluations,
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
