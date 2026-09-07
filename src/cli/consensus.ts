/**
 * One instrument fitted to every roll at once.
 *
 *   node src/cli/consensus.ts --rolls A,B,C --fits DIR [--half bass|treble]
 *                             [--traces DIR] [--generations N] [--seed N]
 *                             [--huber 0.06] [--out FILE]
 *
 * Each roll keeps the registration its own fit found, the two rails, the lead
 * and its per-code offsets, the drift and the scale warp, which are where the
 * pen sat on that sheet. Everything else, the mechanism and the regulation, is
 * one set of constants in bellows travel, put onto each roll's printed scale by
 * its rails and scored against its line. The objective is the mean of the
 * per-roll losses, so a long roll counts as one instrument and not as more
 * evidence; the search is the one the single-roll fit uses.
 *
 * The result is the setting that describes the population best, which is what a
 * roll without lines wants. It is not a regulated instrument: the rolls were
 * drawn by instruments Gottschewski found out of regulation.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { agreement, maskedRobust, type Agreement, type Mask } from "../eval/metrics.ts";
import { alternatingBlocks } from "../eval/split.ts";
import { boundsOf, jitteredSeeds, searchFrom } from "../eval/fitting.ts";
import { pneumaticModel } from "../model/pneumatic.ts";
import { parametersFrom, parameterVector, withFixed, type ModelInput, type Parameters } from "../model/types.ts";
import { inTravelUnits, onPrintedScale } from "../model/units.ts";
import { HALVES, type Half } from "../roll/expression.ts";
import { DEFAULT_TRACES, loadRoll } from "../roll/load.ts";
import { halfOf, type TracedCurve } from "../truth/curves.ts";
import { axisFrom } from "./settings.ts";

/** What stays with the roll: where the pen sat on that sheet of paper. */
export const REGISTRATION = [
  "piano",
  "forte",
  "leadRows",
  "leadSforzandoOnRows",
  "leadCrescendoRows",
  "leadDriftRows",
  "scaleWarp",
] as const;

type RollHalf = {
  readonly druid: string;
  readonly input: ModelInput;
  readonly truth: TracedCurve;
  readonly masks: { readonly train: Mask; readonly test: Mask };
  /** The roll's own fit, on its printed scale. */
  readonly fitted: Parameters;
  readonly registration: Parameters;
};

type FitFile = { readonly results: readonly { readonly half: Half; readonly params: Parameters }[] };

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** The instrument on this roll: the shared constants put onto its rails, and its own registration. */
export function onRoll(shared: Parameters, roll: { readonly registration: Parameters }): Parameters {
  const piano = roll.registration.piano ?? 0;
  const forte = roll.registration.forte ?? 1;
  return { ...pneumaticModel.defaults, ...onPrintedScale(shared, piano, forte), ...roll.registration };
}

function loadHalf(druid: string, half: Half, fits: string, traces: string): RollHalf {
  const loaded = loadRoll(druid, axisFrom(process.argv), traces);
  const file = JSON.parse(readFileSync(join(fits, `${druid}.json`), "utf8")) as FitFile;
  const fitted = { ...pneumaticModel.defaults, ...file.results.find((result) => result.half === half)!.params };
  const truth = halfOf(loaded.curves, half);
  return {
    druid,
    input: loaded.inputFor(half, "aperture"),
    truth,
    masks: alternatingBlocks(loaded.grid, truth.observed),
    fitted,
    registration: Object.fromEntries(REGISTRATION.map((name) => [name, fitted[name]!])),
  };
}

/**
 * The model's boxes are set on the printed scale, and a level in travel units is
 * larger by the span between the rails, which runs from 0.78 to 0.93 across the
 * six rolls. The four levels get room for that; nothing else changes by more
 * than a few percent.
 */
const TRAVEL_BOXES: Readonly<Record<string, readonly [number, number]>> = {
  mezzoforte: [0.3, 0.9],
  crescendoTarget: [0.55, 2.5],
  releaseTarget: [-0.7, 0.2],
  sforzandoTarget: [0.5, 4],
};

function fitHalf(rolls: readonly RollHalf[], half: Half, generations: number, seed: number, huber: number) {
  const started = performance.now();
  const shared = withFixed(pneumaticModel, Object.fromEntries(REGISTRATION.map((name) => [name, 0])));
  const bounds = {
    lower: shared.spec.map((entry) => TRAVEL_BOXES[entry.name]?.[0] ?? entry.lower),
    upper: shared.spec.map((entry) => TRAVEL_BOXES[entry.name]?.[1] ?? entry.upper),
  };
  const report = (line: string): void => {
    process.stderr.write(`  ${half} ${line}\n`);
  };

  const scoreOn = (params: Parameters, roll: RollHalf, mask: Mask): number =>
    maskedRobust(pneumaticModel.run(roll.input, onRoll(params, roll)), roll.truth.value, mask, huber);
  const objective = (vector: readonly number[]): number => {
    const params = parametersFrom(shared.spec, vector);
    return rolls.reduce((total, roll) => total + scoreOn(params, roll, roll.masks.train), 0) / rolls.length;
  };

  // The population starts around the middle of the six instruments, with each of
  // the six in it as well, so the search can combine settings that each describe
  // one line rather than have to rediscover them.
  const asTravel = rolls.map((roll) => inTravelUnits(roll.fitted));
  const centre = shared.spec.map((entry) => median(asTravel.map((params) => params[entry.name]!)));
  const each = asTravel.map((params) => parameterVector(shared.spec, params));
  const seeds = [...jitteredSeeds(centre, bounds, seed), ...each];
  const best = searchFrom(objective, bounds, seeds, { generations, seed, report });
  const params = parametersFrom(shared.spec, best.vector);

  const perRoll = rolls.map((roll) => {
    const output = pneumaticModel.run(roll.input, onRoll(params, roll));
    return {
      druid: roll.druid,
      train: agreement(output, roll.truth.value, roll.masks.train),
      test: agreement(output, roll.truth.value, roll.masks.test),
    };
  });
  const mean = (pick: (entry: (typeof perRoll)[number]) => Agreement): number =>
    perRoll.reduce((total, entry) => total + pick(entry).rmse, 0) / perRoll.length;
  return {
    half,
    params,
    start: parametersFrom(shared.spec, centre),
    perRoll,
    meanTrainRmse: mean((entry) => entry.train),
    meanTestRmse: mean((entry) => entry.test),
    evaluations: best.evaluations,
    seconds: (performance.now() - started) / 1000,
  };
}

function main(): void {
  const druids = option("rolls", "").split(",").filter(Boolean);
  if (druids.length === 0) throw new Error("--rolls A,B,C names the rolls to pool");
  const fits = option("fits", "docs/fits-lean");
  const traces = option("traces", DEFAULT_TRACES);
  const generations = Number(option("generations", "200"));
  const seed = Number(option("seed", "1"));
  const huber = Number(option("huber", "0.06"));
  const only = option("half", "");
  const out = option("out", `docs/consensus-seed${seed}.json`);
  const halves = HALVES.filter((half) => only === "" || half === only);

  console.error(`pooling ${druids.length} rolls from ${fits}, traces in ${traces}, ${generations} generations, seed ${seed}`);
  const results = halves.map((half) => {
    const rolls = druids.map((druid) => loadHalf(druid, half, fits, traces));
    const result = fitHalf(rolls, half, generations, seed, huber);
    console.error(
      `  ${half}: mean held-out rmse ${result.meanTestRmse.toFixed(4)} over ${rolls.length} rolls, ` +
        result.perRoll.map((entry) => `${entry.druid} ${entry.test.rmse.toFixed(4)}`).join(", "),
    );
    return result;
  });

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify({ model: pneumaticModel.name, rolls: druids, fits, traces, generations, seed, huber, results }, null, 2),
  );
  console.error(`wrote ${out}`);
  console.table(
    results.flatMap((result) =>
      result.perRoll.map((entry) => ({
        half: result.half,
        roll: entry.druid,
        "train rmse": entry.train.rmse.toFixed(4),
        "test rmse": entry.test.rmse.toFixed(4),
      })),
    ),
  );
  console.table(
    pneumaticModel.spec.map((entry) => ({
      parameter: entry.name,
      unit: entry.unit,
      ...Object.fromEntries(results.map((result) => [result.half, result.params[entry.name]?.toPrecision(4) ?? "per roll"])),
    })),
  );
}

// Only when run as a command: a stray import must not start a fit.
if (import.meta.main) main();
