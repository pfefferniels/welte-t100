/**
 * Where the model is wrong, broken down by what the mechanism was doing.
 *
 *   node src/cli/residuals.ts [--fit docs/fit-pneumatic.json] [--half bass|treble]
 *
 * An overall error number hides whether a model is uniformly a little off or
 * good everywhere except in one regime. This prints the second thing.
 */

import { readFileSync } from "node:fs";

import { loadRoll } from "../roll/load.ts";
import { halfOf } from "../truth/curves.ts";
import { agreement, intersect, type Mask } from "../eval/metrics.ts";
import { alternatingBlocks } from "../eval/split.ts";
import { pneumaticModel } from "../model/pneumatic.ts";
import { REGIMES, regimesOf } from "../model/field.ts";
import { latched, portOf } from "../model/latch.ts";
import { describeTraversals } from "../model/timings.ts";
import type { Half } from "../roll/expression.ts";
import type { Parameters } from "../model/types.ts";

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

function worstWindows(
  error: Float64Array,
  mask: Mask,
  seconds: Float64Array,
  windowSeconds: number,
  count: number,
) {
  const perWindow = new Map<number, { sum: number; n: number }>();
  mask.forEach((observed, index) => {
    if (!observed) return;
    const window = Math.floor(seconds[index]! / windowSeconds);
    const cell = perWindow.get(window) ?? { sum: 0, n: 0 };
    cell.sum += error[index]! * error[index]!;
    cell.n += 1;
    perWindow.set(window, cell);
  });

  return [...perWindow]
    .filter(([, cell]) => cell.n > 200)
    .map(([window, cell]) => ({
      from: (window * windowSeconds).toFixed(1),
      to: ((window + 1) * windowSeconds).toFixed(1),
      rmse: Math.sqrt(cell.sum / cell.n).toFixed(4),
      rows: cell.n,
    }))
    .sort((a, b) => Number(b.rmse) - Number(a.rmse))
    .slice(0, count);
}

function main(): void {
  const druid = option("druid", "jq774vx6544");
  const fitPath = option("fit", "docs/fit-pneumatic.json");
  const loaded = loadRoll(druid);
  const fit = JSON.parse(readFileSync(fitPath, "utf8")) as {
    results: { half: Half; params: Parameters }[];
  };

  fit.results.forEach(({ half, params }) => {
    const input = loaded.inputFor(half, "aperture");
    const truth = halfOf(loaded.curves, half);
    const { test } = alternatingBlocks(loaded.grid, truth.observed);
    // A fit written before a parameter existed leaves it out; the model default stands in.
    const model = pneumaticModel.run(input, { ...pneumaticModel.defaults, ...params });
    const error = Float64Array.from(model, (value, index) => value - truth.value[index]!);

    const regimes = regimesOf(input);
    const isMf = latched(portOf(input, "mezzoforte", "on"), portOf(input, "mezzoforte", "off"));

    console.log(`\n=== ${half} ===`);
    console.table(
      REGIMES.map((name, code) => {
        const mask = intersect(test, Uint8Array.from(regimes, (regime) => (regime === code ? 1 : 0)));
        const scored = agreement(model, truth.value, mask);
        return {
          regime: name,
          rows: scored.n,
          "share %": ((100 * scored.n) / agreement(model, truth.value, test).n).toFixed(1),
          rmse: scored.rmse.toFixed(4),
          bias: scored.bias.toFixed(4),
          "p90 |e|": scored.p90Abs.toFixed(4),
        };
      }),
    );

    console.table(
      [
        { name: "M.F. hook engaged", mask: intersect(test, isMf) },
        { name: "M.F. hook released", mask: intersect(test, Uint8Array.from(isMf, (v) => (v ? 0 : 1))) },
      ].map(({ name, mask }) => {
        const scored = agreement(model, truth.value, mask);
        return { state: name, rows: scored.n, rmse: scored.rmse.toFixed(4), bias: scored.bias.toFixed(4) };
      }),
    );

    console.table(
      Array.from({ length: 5 }, (_, band) => {
        const low = band / 5;
        const high = (band + 1) / 5;
        const mask = intersect(
          test,
          Uint8Array.from(truth.value, (value) => (value >= low && value < high ? 1 : 0)),
        );
        const scored = agreement(model, truth.value, mask);
        return {
          "drawn level": `${low.toFixed(1)}–${high.toFixed(1)}`,
          rows: scored.n,
          rmse: scored.rmse.toFixed(4),
          bias: scored.bias.toFixed(4),
        };
      }),
    );

    // Where the squared error actually comes from. If it concentrates on the rows
    // where the drawn line is moving fastest, the model's shapes are right and its
    // timing is not, which is a different repair from a shape being wrong.
    const speed = Float64Array.from(truth.value, (_, index) => {
      const back = Math.max(index - 4, 0);
      const forward = Math.min(index + 4, truth.value.length - 1);
      const span = loaded.grid.seconds[forward]! - loaded.grid.seconds[back]!;
      return span > 0 ? Math.abs(truth.value[forward]! - truth.value[back]!) / span : 0;
    });
    const bands = [0, 0.25, 1, 3, 8, Number.POSITIVE_INFINITY];
    let totalSquare = 0;
    test.forEach((observed, index) => {
      if (observed) totalSquare += error[index]! * error[index]!;
    });

    console.log("error by how fast the drawn line is moving");
    console.table(
      bands.slice(0, -1).map((low, band) => {
        const high = bands[band + 1]!;
        const mask = intersect(
          test,
          Uint8Array.from(speed, (value) => (value >= low && value < high ? 1 : 0)),
        );
        const scored = agreement(model, truth.value, mask);
        let share = 0;
        mask.forEach((observed, index) => {
          if (observed) share += error[index]! * error[index]!;
        });
        return {
          "|dv/dt|, units/s": high === Number.POSITIVE_INFINITY ? `over ${low}` : `${low}–${high}`,
          "share of rows %": ((100 * scored.n) / agreement(model, truth.value, test).n).toFixed(1),
          "share of squared error %": ((100 * share) / totalSquare).toFixed(1),
          rmse: scored.rmse.toFixed(4),
        };
      }),
    );

    console.log("worst 2-second windows");
    console.table(worstWindows(error, test, loaded.grid.seconds, 2, 8));

    console.log("travel times implied by the fit");
    console.table(describeTraversals(params));
  });
}

// Only when run as a command. These modules hold constants other code imports,
// and several of them start a fit or an ablation, so an import that ran them
// would quietly spend an hour of a machine.
if (import.meta.main) main();
