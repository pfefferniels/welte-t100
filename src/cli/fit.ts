/**
 * Fit a model's parameters to the drawn line and report held-out agreement.
 *
 *   node src/cli/fit.ts [model] [--druid D] [--ports aperture|binary]
 *                       [--generations N] [--seed N] [--out FILE]
 *
 * Fitting is on alternating blocks and the reported score is on the blocks left
 * out, so a model with more parameters does not win by memorising the roll.
 *
 * The result goes to `docs/fits/<druid>.json` unless `--out` says otherwise,
 * roll 3309 included. `docs/fit-pneumatic.json` holds the published headline
 * fit and is written by hand or by `src/cli/collect.ts`, so no run on a short
 * budget can displace it.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { loadRoll, type PortModel } from "../roll/load.ts";
import { halfOf } from "../truth/curves.ts";
import { alternatingBlocks } from "../eval/split.ts";
import { fitModel } from "../eval/fitting.ts";
import { midi2expModel } from "../model/midi2exp.ts";
import { pneumaticModel } from "../model/pneumatic.ts";
import { HEADLINE_DRUID, constantsOf } from "./settings.ts";
import { describeTraversals } from "../model/timings.ts";
import { withFixed, withTied, type Model, type Parameters } from "../model/types.ts";
import { HALVES, type Half } from "../roll/expression.ts";

const MODELS: ReadonlyMap<string, Model> = new Map([
  [midi2expModel.name, midi2expModel],
  [pneumaticModel.name, pneumaticModel],
]);

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

/** `name=value` pins at the value, a bare `name` at the model's default. */
function pinFrom(entry: string): [string, number] {
  const [name, given] = entry.split("=") as [string, string?];
  const value = given === undefined ? pneumaticModel.defaults[name] : Number(given);
  if (value === undefined || !Number.isFinite(value)) throw new Error(`cannot pin ${entry}`);
  return [name, value];
}

type FitRun = {
  readonly model: Model;
  readonly loaded: ReturnType<typeof loadRoll>;
  readonly ports: PortModel;
  readonly generations: number;
  readonly seed: number;
  /** Pinned throughout, for a control run. */
  readonly settled: Parameters;
  /** Made to follow another parameter throughout, target to source. */
  readonly tied: Readonly<Record<string, string>>;
  /** Read off this roll, per half. Held in stage 1 and released in stage 2. */
  readonly measured: Record<Half, Parameters>;
  readonly huber: number;
};

/**
 * The measured constants this model can actually be pinned at. A value outside
 * a parameter's own box would hold the search at a point it may not visit, so
 * it is reported and left to the fit instead.
 */
function insideSpec(model: Model, measured: Parameters, half: Half): Parameters {
  const box = new Map(model.spec.map((entry) => [entry.name, entry]));
  return Object.fromEntries(
    Object.entries(measured).filter(([name, value]) => {
      const entry = box.get(name);
      if (!entry || (value >= entry.lower && value <= entry.upper)) return true;
      console.error(
        `  ${half} measures ${name} at ${value.toPrecision(4)}, outside ${entry.lower} to ${entry.upper}: left to the fit`,
      );
      return false;
    }),
  );
}

function fitHalf(run: FitRun, half: Half) {
  const { model, loaded, generations, seed, huber } = run;
  const input = loaded.inputFor(half, run.ports);
  const truth = halfOf(loaded.curves, half);
  const masks = alternatingBlocks(loaded.grid, truth.observed);
  const report = (line: string): void => {
    process.stderr.write(`  ${half} ${line}\n`);
  };

  // Several parameters are measured directly off the roll — the two rails, the
  // level the hook arrests at, the offset from the punches. Making the search
  // rediscover them wastes most of its effort, so the first stage holds them and
  // fits only what is not measured, and the second releases everything from there.
  const lean =
    model.name === pneumaticModel.name
      ? withTied(withFixed(model, run.settled, model.name), run.tied, model.name)
      : model;
  const measured = insideSpec(lean, run.measured[half], half);
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
  // Both stages, so that the cost reported is the cost of the fit.
  return {
    half,
    ...result,
    evaluations: first.evaluations + result.evaluations,
    seconds: first.seconds + result.seconds,
    output: undefined,
  };
}

function main(): void {
  const name = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : pneumaticModel.name;
  const model = MODELS.get(name);
  if (!model) throw new Error(`unknown model ${name}; have ${[...MODELS.keys()].join(", ")}`);

  const druid = option("druid", HEADLINE_DRUID);
  const ports = option("ports", "aperture") as PortModel;
  const generations = Number(option("generations", "160"));
  const seed = Number(option("seed", "1"));
  // Never the headline file, whatever the roll: promoting a fit is a decision.
  const out = option("out", `docs/fits/${druid}.json`);

  const loaded = loadRoll(druid);
  console.error(`fitting ${model.name} on ${druid} (${ports} ports, ${generations} generations)`);

  // Only what this roll shows is pinned in stage 1; anything it cannot settle
  // stays free from the start, and is named here so a thin roll is visible.
  const constants = constantsOf(loaded);
  HALVES.forEach((half) => {
    const shown = Object.entries(constants.pinned[half]).map(([name, value]) => `${name} ${value.toPrecision(4)}`);
    console.error(`  measured ${half}: ${shown.join(", ") || "nothing"}`);
    constants.withheld[half].forEach((entry) => {
      console.error(`  ${half} leaves ${entry.names.join(" and ")} to the fit: no ${entry.wanted}`);
    });
  });

  // `--settle a,b=0.5` pins further parameters, at their defaults or at the value
  // given, which is how a control run is made: the same model and budget with a
  // candidate term held shut, against a run that lets it move.
  const extra = option("settle", "").split(",").filter(Boolean).map(pinFrom);
  const settled: Parameters = Object.fromEntries(extra);
  if (extra.length) console.error(`pinned: ${extra.map(([name, value]) => `${name} ${value}`).join(", ")}`);

  // `--tie a=b` makes `a` follow `b` throughout, for testing a regulation or a
  // reading that says two constants are one.
  const tied = Object.fromEntries(
    option("tie", "")
      .split(",")
      .filter(Boolean)
      .map((entry) => entry.split("=") as [string, string]),
  );
  Object.entries(tied).forEach(([target, source]) => {
    if (!(target in pneumaticModel.defaults) || !(source in pneumaticModel.defaults)) throw new Error(`cannot tie ${target}=${source}`);
    console.error(`tied: ${target} follows ${source}`);
  });

  // Residuals past this are charged linearly while fitting; scoring stays plain.
  const huber = Number(option("huber", "0"));
  if (huber > 0) console.error(`robust objective, residuals past ${huber} charged linearly`);

  const run: FitRun = { model, loaded, ports, generations, seed, settled, tied, measured: constants.pinned, huber };
  const results = HALVES.map((half) => fitHalf(run, half));

  // Write before printing anything. Four completed fits were once lost to a
  // TypeError in the summary table below, which ran first.
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(
      out,
      JSON.stringify({ model: model.name, druid, ports, generations, seed, measured: constants.pinned, results }, null, 2),
    );
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
      bass: (results[0]!.params[entry.name] ?? settled[entry.name])?.toPrecision(4) ?? "tied",
      treble: (results[1]!.params[entry.name] ?? settled[entry.name])?.toPrecision(4) ?? "tied",
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
