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
import { MEASURED, SETTLED } from "./settings.ts";
import { describeTraversals } from "../model/timings.ts";
import { withFixed, type Model, type Parameters } from "../model/types.ts";
import type { Half } from "../roll/expression.ts";

const MODELS: ReadonlyMap<string, Model> = new Map([
  [midi2expModel.name, midi2expModel],
  [pneumaticModel.name, pneumaticModel],
]);

const HALVES: readonly Half[] = ["bass", "treble"];

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
  settled: Parameters,
  huber: number,
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
  const lean = model.name === pneumaticModel.name ? withFixed(model, settled, model.name) : model;
  const measured = MEASURED[half];
  const first = fitModel(withFixed(lean, measured), input, truth, masks, {
    generations: Math.round(generations * 0.6),
    seed,
    huber,
    report: (line) => report(`stage 1 ${line}`),
  });
  const result = fitModel(lean, input, truth, masks, {
    generations,
    seed,
    huber,
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

  // `--settle a,b` pins further parameters at their defaults, which is how a
  // control run is made: the same model and budget with a candidate term held
  // shut, against a run that lets it move.
  const extra = option("settle", "").split(",").filter(Boolean);
  const settled: Parameters = {
    ...SETTLED,
    ...Object.fromEntries(extra.map((name) => [name, pneumaticModel.defaults[name] ?? 0])),
  };
  if (extra.length) console.error(`also pinned: ${extra.join(", ")}`);

  // Residuals past this are charged linearly while fitting; scoring stays plain.
  const huber = Number(option("huber", "0"));
  if (huber > 0) console.error(`robust objective, residuals past ${huber} charged linearly`);

  const results = HALVES.map((half) => fitHalf(model, loaded, half, ports, generations, seed, settled, huber));

  // Write before printing anything. Four completed fits were once lost to a
  // TypeError in the summary table below, which ran first.
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify({ model: model.name, druid, ports, generations, seed, results }, null, 2));
    console.error(`wrote ${out}`);
  }

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
      // `withFixed` drops the pinned entries from the spec it fits, so they are
      // absent from the result. Show what they were pinned at.
      bass: (results[0]!.params[entry.name] ?? SETTLED[entry.name])?.toPrecision(4) ?? "pinned",
      treble: (results[1]!.params[entry.name] ?? SETTLED[entry.name])?.toPrecision(4) ?? "pinned",
      default: (model.defaults[entry.name] ?? 0).toPrecision(4),
    })),
  );

  if (model.name === pneumaticModel.name) {
    HALVES.forEach((half, index) => {
      console.log(`\ntravel times, ${half}`);
      console.table(describeTraversals(results[index]!.params));
    });
  }

}

// Only when run as a command. These modules hold constants other code imports,
// and several of them start a fit or an ablation, so an import that ran them
// would quietly spend an hour of a machine.
if (import.meta.main) main();
