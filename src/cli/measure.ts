/**
 * Read the four measured constants off a roll and print them.
 *
 *   node src/cli/measure.ts [--druid D] [--timing scan] [--out FILE]
 *
 * This is what `src/cli/fit.ts` pins in its first stage, so running it first
 * says whether a roll is worth fitting: a hook with a handful of arrivals or a
 * lead resting on a dozen collapses is a trace too thin to fit against.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { loadRoll } from "../roll/load.ts";
import { HALVES } from "../roll/expression.ts";
import { measureRoll } from "../truth/measure.ts";
import { HEADLINE_DRUID, axisFrom, constantsOf, outputFor } from "./settings.ts";

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

function main(): void {
  const druid = option("druid", HEADLINE_DRUID);
  const out = option("out", outputFor(druid, "measured"));
  const loaded = loadRoll(druid, axisFrom(process.argv));
  const measured = measureRoll(loaded);
  const constants = constantsOf(loaded);

  console.error(`${druid}: ${loaded.grid.length} rows on the ${loaded.roll.timing.axis.name}`);
  console.table(
    HALVES.map((half) => {
      const { rails, hook, lead } = measured[half];
      return {
        half,
        piano: rails.piano.toFixed(4),
        forte: rails.forte.toFixed(4),
        "hook face": hook.level.toFixed(4),
        "arrivals from above": hook.arrivals,
        "face sd": hook.spread.toFixed(4),
        "plateau": hook.plateau.toFixed(4),
        "line ahead, rows": lead.aheadRows.toFixed(1),
        collapses: lead.falls,
        "lead iqr": lead.iqrRows.toFixed(1),
        "observed rows": measured[half].observedRows,
      };
    }),
  );

  HALVES.forEach((half) =>
    constants.withheld[half].forEach((entry) => {
      console.error(`${half} cannot settle ${entry.names.join(" and ")}: no ${entry.wanted}`);
    }),
  );

  const withheld = Object.fromEntries(
    HALVES.map((half) => [half, constants.withheld[half].flatMap((entry) => entry.names)]),
  );
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify({ druid, measured, parameters: constants.pinned, withheld }, null, 2),
  );
  console.error(`wrote ${out}`);
}

// Only when run as a command. These modules hold constants other code imports,
// and several of them start a fit or an ablation, so an import that ran them
// would quietly spend an hour of a machine.
if (import.meta.main) main();
