/**
 * Run every registered model against the drawn line and print how they compare.
 *
 *   node src/cli/evaluate.ts [druid] [--fit docs/fit-pneumatic.json]
 *                            [--timing scan] [--effect 0.8] [--revolution 4.64]
 *
 * With no `--fit` every model runs on its published constants. A fit file
 * replaces them for the model it belongs to, which is what to use when the
 * question is about the roll rather than about the constants.
 *
 * `--timing scan` puts the roll back on the tempo map the SUPRA file carries,
 * and `--effect` varies how much of the take-up spool's growth reaches the paper
 * speed, so what the time axis is worth to the fit can be seen rather than
 * assumed. Either changes the roll's total duration as well as its shape, and
 * the duration alone rescales every fitted rate; `--revolution` sets the spool's
 * period, which is the length of the axis, so that the two can be told apart.
 */

import { readFileSync } from "node:fs";

import { loadRoll, type PortModel } from "../roll/load.ts";
import { axisFrom } from "./settings.ts";
import { halfOf } from "../truth/curves.ts";
import { agreement, bestLag } from "../eval/metrics.ts";
import { midi2expModel } from "../model/midi2exp.ts";
import { pneumaticModel } from "../model/pneumatic.ts";
import type { Half } from "../roll/expression.ts";
import type { Model, Parameters } from "../model/types.ts";

const MODELS: readonly { model: Model; ports: PortModel }[] = [
  { model: midi2expModel, ports: "binary" },
  { model: midi2expModel, ports: "aperture" },
  { model: pneumaticModel, ports: "aperture" },
];

const HALVES: readonly Half[] = ["bass", "treble"];
const LAG_ROWS = Array.from({ length: 121 }, (_, index) => (index - 60) * 5);

function fixed(value: number, places = 4): string {
  return Number.isFinite(value) ? value.toFixed(places) : "—";
}

type FitFile = { model: string; results: { half: Half; params: Parameters }[] };

/** The fitted constants per half, for the one model the file belongs to. */
function fittedParameters(path: string | undefined): (model: Model, half: Half) => Parameters {
  if (path === undefined) return (model) => model.defaults;
  const fit = JSON.parse(readFileSync(path, "utf8")) as FitFile;
  const byHalf = new Map(fit.results.map((result) => [result.half, result.params]));
  return (model, half) =>
    model.name === fit.model ? { ...model.defaults, ...byHalf.get(half) } : model.defaults;
}

function main(): void {
  const druid = process.argv[2]?.startsWith("--") ? "jq774vx6544" : (process.argv[2] ?? "jq774vx6544");
  const at = process.argv.indexOf("--fit");
  const parameters = fittedParameters(at >= 0 ? process.argv[at + 1] : undefined);
  const loaded = loadRoll(druid, axisFrom(process.argv));
  const secondsPerRow =
    (loaded.grid.seconds.at(-1)! - loaded.grid.seconds[0]!) / (loaded.grid.length - 1);

  console.log(`roll ${druid}: ${loaded.grid.length} rows, ${fixed(loaded.grid.seconds.at(-1)!, 1)} s`);
  console.log(`time axis: ${loaded.roll.timing.axis.name}`);
  console.log(`${loaded.perforations.length} expression perforations\n`);

  const rows = MODELS.flatMap(({ model, ports }) =>
    HALVES.map((half) => {
      const truth = halfOf(loaded.curves, half);
      const output = model.run(loaded.inputFor(half, ports), parameters(model, half));
      const plain = agreement(output, truth.value, truth.observed);
      const aligned = bestLag(output, truth.value, truth.observed, LAG_ROWS);
      return {
        model: `${model.name}/${ports}`,
        half,
        n: plain.n,
        rmse: fixed(plain.rmse),
        mae: fixed(plain.mae),
        r: fixed(plain.correlation, 3),
        bias: fixed(plain.bias),
        "lag ms": (aligned.rows * secondsPerRow * 1000).toFixed(0),
        "rmse@lag": fixed(aligned.rmse),
        "r@lag": fixed(aligned.agreement.correlation, 3),
      };
    }),
  );

  console.table(rows);
}

// Only when run as a command. These modules hold constants other code imports,
// and several of them start a fit or an ablation, so an import that ran them
// would quietly spend an hour of a machine.
if (import.meta.main) main();
