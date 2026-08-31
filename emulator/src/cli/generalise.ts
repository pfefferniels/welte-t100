/**
 * Does the fit carry into music it never saw?
 *
 *   node src/cli/generalise.ts [--generations N] [--fraction 0.6]
 *
 * The ablation splits the roll into alternating blocks, which keeps the two sets
 * over comparable material but leaves every held-out block sitting between two
 * fitted ones. This cuts the roll once instead: fit on the opening, score on the
 * close. Both models are refitted under the same cut so the comparison is fair.
 */

import { writeFileSync, mkdirSync } from "node:fs";

import { loadRoll } from "../roll/load.ts";
import { halfOf } from "../truth/curves.ts";
import { contiguousSplit } from "../eval/split.ts";
import { fitModel } from "../eval/fitting.ts";
import { midi2expModel } from "../model/midi2exp.ts";
import { pneumaticModel } from "../model/pneumatic.ts";
import { constantModel } from "../model/reference.ts";
import type { Half } from "../roll/expression.ts";
import type { Model } from "../model/types.ts";

const MODELS: readonly { model: Model; ports: "aperture" | "binary" }[] = [
  { model: constantModel, ports: "aperture" },
  { model: midi2expModel, ports: "binary" },
  { model: pneumaticModel, ports: "aperture" },
];

const HALVES: readonly Half[] = ["bass", "treble"];

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

function main(): void {
  const druid = option("druid", "jq774vx6544");
  const generations = Number(option("generations", "110"));
  const fraction = Number(option("fraction", "0.6"));
  const out = option("out", "docs/generalise.json");

  const loaded = loadRoll(druid);
  const rows = MODELS.flatMap(({ model, ports }) =>
    HALVES.map((half) => {
      const input = loaded.inputFor(half, ports);
      const truth = halfOf(loaded.curves, half);
      const cut = contiguousSplit(loaded.grid, truth.observed, fraction);
      process.stderr.write(`${model.name} ${half}\n`);
      const result = fitModel(model, input, truth, cut, {
        generations,
        report: (line) => process.stderr.write(`  ${line}\n`),
      });
      return {
        model: model.name,
        half,
        params: result.params,
        openingRmse: result.train.rmse,
        closeRmse: result.test.rmse,
        closeCorrelation: result.test.correlation,
        closeBias: result.test.bias,
        seconds: result.seconds,
      };
    }),
  );

  console.table(
    rows.map((row) => ({
      model: row.model,
      half: row.half,
      "opening rmse": row.openingRmse.toFixed(4),
      "close rmse": row.closeRmse.toFixed(4),
      "close r": row.closeCorrelation.toFixed(3),
      "close bias": row.closeBias.toFixed(4),
    })),
  );

  mkdirSync("docs", { recursive: true });
  writeFileSync(out, JSON.stringify({ druid, fraction, generations, rows }, null, 2));
  process.stderr.write(`wrote ${out}\n`);
}

// Only when run as a command. These modules hold constants other code imports,
// and several of them start a fit or an ablation, so an import that ran them
// would quietly spend an hour of a machine.
if (import.meta.main) main();
