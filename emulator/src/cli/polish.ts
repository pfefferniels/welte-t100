/**
 * Sweep each coordinate of an existing fit.
 *
 *   node src/cli/polish.ts --fit docs/fit-pneumatic.json
 *
 * The cluster runs whatever source was synced to it, so a fit that came back
 * before `coordinateDescent` was added to `fitModel` has not had it. Applying it
 * afterwards is the same operation and costs a few hundred model runs against
 * the fit's thirty-five thousand. Scores on the held-out blocks are reported but
 * never optimised.
 *
 * It sweeps the same parameters the headline fit varies, `SETTLED` pinned. Left
 * to sweep everything it quietly turns the lean model into the full one — on
 * roll 3309 it lifts `railGrip` to 0.049 and `assistYields` to 0.064 and reports
 * a score that no longer belongs to the model it was handed.
 */

import { readFileSync, writeFileSync } from "node:fs";

import { alternatingBlocks } from "../eval/split.ts";
import { maskedRmse } from "../eval/metrics.ts";
import { coordinateDescent } from "../eval/optimise.ts";
import { boundsOf } from "../eval/fitting.ts";
import { parametersFrom, parameterVector } from "../model/types.ts";
import { pneumaticModel } from "../model/pneumatic.ts";
import { withFixed } from "../model/types.ts";
import { SETTLED } from "./settings.ts";
import { loadRoll } from "../roll/load.ts";
import { halfOf } from "../truth/curves.ts";

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

function main(): void {
  const path = option("fit", "docs/fit-pneumatic.json");
  const out = option("out", path);
  const file = JSON.parse(readFileSync(path, "utf8"));
  const loaded = loadRoll(file.druid ?? "jq774vx6544");
  const model = withFixed(pneumaticModel, SETTLED as Record<string, number>, pneumaticModel.name);

  for (const result of file.results) {
    const input = loaded.inputFor(result.half, file.ports ?? "aperture");
    const truth = halfOf(loaded.curves, result.half);
    const masks = alternatingBlocks(loaded.grid, truth.observed);
    const params = { ...model.defaults, ...result.params };
    const on = (mask: Uint8Array, vector: readonly number[]): number =>
      maskedRmse(model.run(input, parametersFrom(model.spec, vector)), truth.value, mask);

    const start = parameterVector(model.spec, params);
    const before = { train: on(masks.train, start), test: on(masks.test, start) };
    const swept = coordinateDescent((vector) => on(masks.train, vector), start, boundsOf(model));
    const after = { train: swept.value, test: on(masks.test, swept.vector) };

    process.stdout.write(
      `${result.half}: train ${before.train.toFixed(4)} -> ${after.train.toFixed(4)}, ` +
        `held out ${before.test.toFixed(4)} -> ${after.test.toFixed(4)} (${swept.evaluations} runs)\n`,
    );
    result.params = parametersFrom(model.spec, swept.vector);
  }
  writeFileSync(out, JSON.stringify(file, null, 1));
  process.stdout.write(`wrote ${out}\n`);
}

// Only when run as a command. These modules hold constants other code imports,
// and several of them start a fit or an ablation, so an import that ran them
// would quietly spend an hour of a machine.
if (import.meta.main) main();
