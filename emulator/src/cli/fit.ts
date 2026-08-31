/**
 * Fit a model's parameters to the drawn line and report held-out agreement.
 *
 *   node src/cli/fit.ts [model] [--druid D] [--ports aperture|binary]
 *                       [--generations N] [--seed N] [--out FILE]
 *
 * Fitting is on alternating blocks and the reported score is on the blocks left
 * out, so a model with more parameters does not win by memorising the roll.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { loadRoll, type PortModel } from "../roll/load.ts";
import { halfOf } from "../truth/curves.ts";
import { alternatingBlocks } from "../eval/split.ts";
import { fitModel } from "../eval/fitting.ts";
import { midi2expModel } from "../model/midi2exp.ts";
import { pneumaticModel } from "../model/pneumatic.ts";
import { describeTraversals } from "../model/timings.ts";
import { withFixed, type Model, type Parameters } from "../model/types.ts";
import type { Half } from "../roll/expression.ts";

const MODELS: ReadonlyMap<string, Model> = new Map([
  [midi2expModel.name, midi2expModel],
  [pneumaticModel.name, pneumaticModel],
]);

const HALVES: readonly Half[] = ["bass", "treble"];

/**
 * What `docs/empirics.md` measures directly, per half: the two rails from where
 * the line comes to rest, the level the Mezzoforte finger arrests it at, and the
 * offset from the punches. `mezzoforte` here is the pin's centre, so the measured
 * arrest face is `mezzoforte + mfThickness / 2`.
 */
/**
 * Parameters the ablation has already shown to do nothing, pinned so the search
 * does not spend its effort on them. Each is still in the model's spec, so
 * `src/cli/experiments.ts` can still price it by letting it free; what is claimed
 * here is only that the headline fit gains nothing by carrying them.
 *
 * The three flags are settled rather than null: the sforzando acts per pulse, the
 * roll does not couple it to the crescendo, and the Mezzoforte pin is in the path.
 * `mfTwoSided` is left free because the roll cannot decide it either way.
 */
const SETTLED: Parameters = {
  regulatorGain: 0,
  supplyDroop: 0,
  windRateGain: 1,
  windTargetShift: 0,
  assistYields: 0,
  sforzandoLatches: 0,
  sforzandoSetsCrescendo: 0,
  mfBarrier: 1,
};

const MEASURED: Record<Half, Parameters> = {
  bass: { piano: 0.017, forte: 0.912, mezzoforte: 0.5752 - 0.05, mfThickness: 0.1, leadRows: -65 },
  treble: { piano: 0.022, forte: 0.952, mezzoforte: 0.6169 - 0.05, mfThickness: 0.1, leadRows: -46 },
};

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

function fitHalf(
  model: Model,
  loaded: ReturnType<typeof loadRoll>,
  half: Half,
  ports: PortModel,
  generations: number,
  seed: number,
) {
  const input = loaded.inputFor(half, ports);
  const truth = halfOf(loaded.curves, half);
  const masks = alternatingBlocks(loaded.grid, truth.observed);
  const report = (line: string): void => {
    process.stderr.write(`  ${half} ${line}\n`);
  };

  // Several parameters are measured directly off the roll — the two rails, the
  // level the hook arrests at, the offset from the punches. Making the search
  // rediscover them wastes most of its effort, so the first stage holds them and
  // fits only what is not measured, and the second releases everything from there.
  const lean = model.name === pneumaticModel.name ? withFixed(model, SETTLED, model.name) : model;
  const measured = MEASURED[half];
  const first = fitModel(withFixed(lean, measured), input, truth, masks, {
    generations: Math.round(generations * 0.6),
    seed,
    report: (line) => report(`stage 1 ${line}`),
  });
  const result = fitModel(lean, input, truth, masks, {
    generations,
    seed,
    startFrom: { ...measured, ...first.params },
    report: (line) => report(`stage 2 ${line}`),
  });
  return { half, ...result, output: undefined };
}

function main(): void {
  const name = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : pneumaticModel.name;
  const model = MODELS.get(name);
  if (!model) throw new Error(`unknown model ${name}; have ${[...MODELS.keys()].join(", ")}`);

  const druid = option("druid", "jq774vx6544");
  const ports = option("ports", "aperture") as PortModel;
  const generations = Number(option("generations", "160"));
  const seed = Number(option("seed", "1"));
  const out = option("out", "");

  const loaded = loadRoll(druid);
  console.error(`fitting ${model.name} on ${druid} (${ports} ports, ${generations} generations)`);

  const results = HALVES.map((half) => fitHalf(model, loaded, half, ports, generations, seed));

  console.table(
    results.map((result) => ({
      half: result.half,
      "train rmse": result.train.rmse.toFixed(4),
      "test rmse": result.test.rmse.toFixed(4),
      "test mae": result.test.mae.toFixed(4),
      "test r": result.test.correlation.toFixed(3),
      "test bias": result.test.bias.toFixed(4),
      evaluations: result.evaluations,
      seconds: result.seconds.toFixed(0),
    })),
  );

  console.table(
    model.spec.map((entry) => ({
      parameter: entry.name,
      unit: entry.unit,
      bass: results[0]!.params[entry.name]!.toPrecision(4),
      treble: results[1]!.params[entry.name]!.toPrecision(4),
      default: (model.defaults[entry.name] ?? 0).toPrecision(4),
    })),
  );

  if (model.name === pneumaticModel.name) {
    HALVES.forEach((half, index) => {
      console.log(`\ntravel times, ${half}`);
      console.table(describeTraversals(results[index]!.params));
    });
  }

  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify({ model: model.name, druid, ports, generations, seed, results }, null, 2));
    console.error(`wrote ${out}`);
  }
}

main();
