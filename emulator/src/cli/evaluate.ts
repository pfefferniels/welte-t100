/**
 * Run every registered model against the drawn line and print how they compare.
 *
 *   node src/cli/evaluate.ts [druid]
 */

import { loadRoll, type PortModel } from "../roll/load.ts";
import { halfOf } from "../truth/curves.ts";
import { agreement, bestLag } from "../eval/metrics.ts";
import { midi2expModel } from "../model/midi2exp.ts";
import { pneumaticModel } from "../model/pneumatic.ts";
import type { Half } from "../roll/expression.ts";
import type { Model } from "../model/types.ts";

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

function main(): void {
  const druid = process.argv[2] ?? "jq774vx6544";
  const loaded = loadRoll(druid);
  const secondsPerRow =
    (loaded.grid.seconds.at(-1)! - loaded.grid.seconds[0]!) / (loaded.grid.length - 1);

  console.log(`roll ${druid}: ${loaded.grid.length} rows, ${fixed(loaded.grid.seconds.at(-1)!, 1)} s`);
  console.log(`${loaded.perforations.length} expression perforations\n`);

  const rows = MODELS.flatMap(({ model, ports }) =>
    HALVES.map((half) => {
      const truth = halfOf(loaded.curves, half);
      const output = model.run(loaded.inputFor(half, ports), model.defaults);
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

main();
