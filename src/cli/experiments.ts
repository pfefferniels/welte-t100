/**
 * One question per row: an ablation table over the modelling choices.
 *
 *   node src/cli/experiments.ts [--generations N] [--out FILE] [--only substring]
 *
 * Every variant is refitted from scratch so that pinning one choice does not
 * simply deprive the model of a parameter — the rest move to compensate. Scores
 * are on the held-out blocks.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { circularShift, loadRoll, type PortModel } from "../roll/load.ts";
import { halfOf } from "../truth/curves.ts";
import { alternatingBlocks } from "../eval/split.ts";
import { fitModel, scoreOnly, type FitResult } from "../eval/fitting.ts";
import { midi2expModel } from "../model/midi2exp.ts";
import { pneumaticModel } from "../model/pneumatic.ts";
import { constantModel } from "../model/reference.ts";
import { estimateField, fieldModel } from "../model/field.ts";
import { withFixed, withTied, type Model, type ModelInput } from "../model/types.ts";
import { HEADLINE_DRUID, outputFor } from "./settings.ts";
import { HALVES } from "../roll/expression.ts";
import type { TracedCurve } from "../truth/curves.ts";
import type { Mask } from "../eval/metrics.ts";

type Variant = {
  readonly label: string;
  readonly question: string;
  readonly model?: Model;
  /** For a model that has to be built from the training data, such as the binned field. */
  readonly build?: (input: ModelInput, truth: TracedCurve, train: Mask) => Model;
  readonly ports: PortModel;
  readonly fit: boolean;
  readonly shiftRows?: number;
};

const pneumatic = (label: string, question: string, fixed: Record<string, number>): Variant => ({
  label,
  question,
  model: withFixed(pneumaticModel, fixed, "pneumatic"),
  ports: "aperture",
  fit: true,
});

const VARIANTS: readonly Variant[] = [
  { label: "constant level", question: "the floor: what one number achieves", model: constantModel, ports: "aperture", fit: true },
  { label: "midi2exp, published constants", question: "the model as it stands", model: midi2expModel, ports: "binary", fit: false },
  { label: "midi2exp, refitted", question: "how much of its error is bad constants", model: midi2expModel, ports: "binary", fit: true },
  { label: "midi2exp, refitted, aperture ports", question: "does the round port help a linear model", model: midi2expModel, ports: "aperture", fit: true },

  { label: "pneumatic, full", question: "everything free", model: pneumaticModel, ports: "aperture", fit: true },
  pneumatic("pneumatic, alpha = 0 (constant rate)", "is a ramp enough", { alpha: 0 }),
  pneumatic("pneumatic, alpha = 1/2 (orifice)", "square-root flow", { alpha: 0.5 }),
  pneumatic("pneumatic, alpha = 1 (laminar)", "exponential approach", { alpha: 1 }),

  pneumatic("pneumatic, no inertia", "does the linkage need mass", { inertiaMs: 0 }),
  pneumatic("pneumatic, no rebound", "does the bellows rebound off the hook", { stopRestitution: 0 }),

  // Each term prices itself against the full model by being pinned at the value
  // that removes it. A lift band of 1 is the model before the term existed.
  pneumatic("pneumatic, valve lifts over the whole charge", "does the relay valve snap or ramp", { valveBand: 1 }),
  pneumatic("pneumatic, no through-flow load", "does the nuancing system load its own blower", { throughFlowLoad: 0 }),
  pneumatic("pneumatic, no lead", "is the drawn line offset from the punches", { leadRows: 0 }),
  pneumatic("pneumatic, M.F. pinned to 0.5", "is the hook at the printed gridline", { mezzoforte: 0.5 }),
  pneumatic("pneumatic, no puff threshold", "does a barely open port fire the relay", { tripThreshold: 0 }),
  pneumatic("pneumatic, no valve tail", "does a valve shut with its punch", { valveTailMs: 1 }),
  pneumatic("pneumatic, instant relay", "does the membrane chamber need to charge", { membraneFillMs: 0, tripThreshold: 0 }),
  pneumatic("pneumatic, no lead drift", "is the offset constant along the roll", { leadDriftRows: 0 }),
  pneumatic("pneumatic, scale linear in travel", "is the printed scale linear in bellows travel", { scaleWarp: 0 }),
  pneumatic("pneumatic, one offset for every code", "do the codes sit at different offsets", { leadSforzandoOnRows: 0, leadCrescendoRows: 0 }),
  pneumatic("pneumatic, one charging time for both valves", "does the cancel valve charge more slowly than the setting valve", { assistFillMs: 30, membraneFillMs: 30 }),

  {
    label: "pneumatic, one vacuum, two bores",
    question: "both closing paths draw the same vacuum, so only their conductance should differ",
    model: withTied(pneumaticModel, { crescendoTarget: "sforzandoTarget" }, "pneumatic"),
    ports: "aperture",
    fit: true,
  },

  {
    label: "pneumatic, crescendo pair symmetric",
    question: "Welte regulates open and close to the same time",
    model: withTied(pneumaticModel, { releaseRate: "crescendoRate" }, "pneumatic"),
    ports: "aperture",
    fit: true,
  },
  {
    label: "pneumatic, sforzando pair symmetric",
    question: "the same regulation for the sforzando pair",
    model: withTied(pneumaticModel, { sforzandoAssistRate: "sforzandoRate" }, "pneumatic"),
    ports: "aperture",
    fit: true,
  },

  { label: "pneumatic, binary ports", question: "does the round port matter", model: pneumaticModel, ports: "binary", fit: true },

  {
    label: "velocity field, no flow law",
    question: "upper bound on any model with this state",
    build: (input, truth, train) => fieldModel(estimateField(input, truth, train)),
    ports: "aperture",
    fit: true,
  },

  { label: "pneumatic, punches slid 30 s", question: "control: score without alignment", model: pneumaticModel, ports: "aperture", fit: true, shiftRows: 18000 },
];

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

function main(): void {
  const druid = option("druid", HEADLINE_DRUID);
  const generations = Number(option("generations", "70"));
  const only = option("only", "");
  const out = option("out", outputFor(druid, "experiments"));

  const [part, parts] = option("slice", "0/1").split("/").map(Number) as [number, number];
  // `--index` picks one variant by position and `--half` one keyboard half, so a
  // scheduler's task id addresses exactly one fit. `--count` prints how many
  // variants there are, which is what sizes the array.
  const index = option("index", "");
  const onlyHalf = option("half", "");

  if (process.argv.includes("--count")) {
    console.log(VARIANTS.length);
    return;
  }

  const loaded = loadRoll(druid);
  const span: [number, number] = [loaded.grid.startRow, loaded.grid.startRow + loaded.grid.length - 1];
  const chosen = VARIANTS.filter(
    (variant, at) =>
      variant.label.includes(only) && at % parts === part && (index === "" || at === Number(index)),
  );

  const rows = chosen.flatMap((variant) => {
    process.stderr.write(`\n${variant.label} — ${variant.question}\n`);
    return HALVES.filter((half) => onlyHalf === "" || half === onlyHalf).map((half) => {
      const truth = halfOf(loaded.curves, half);
      const masks = alternatingBlocks(loaded.grid, truth.observed);
      const input = variant.shiftRows
        ? loaded.inputOver(half, circularShift(loaded.perforations, variant.shiftRows, span), variant.ports)
        : loaded.inputFor(half, variant.ports);
      const model = variant.model ?? variant.build!(input, truth, masks.train);
      const result: FitResult = variant.fit
        ? fitModel(model, input, truth, masks, {
            generations,
            report: (line) => process.stderr.write(`  ${half} ${line}\n`),
          })
        : scoreOnly(model, input, truth, masks);
      process.stderr.write(`  ${half}: test rmse ${result.test.rmse.toFixed(4)} (${result.seconds.toFixed(0)} s)\n`);
      return { variant: variant.label, question: variant.question, half, ...result, output: undefined };
    });
  });

  console.table(
    rows.map((row) => ({
      variant: row.variant,
      half: row.half,
      "test rmse": row.test.rmse.toFixed(4),
      "test mae": row.test.mae.toFixed(4),
      "test r": row.test.correlation.toFixed(3),
      "median |e|": row.test.medianAbs.toFixed(4),
      "p90 |e|": row.test.p90Abs.toFixed(4),
    })),
  );

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ druid, generations, rows }, null, 2));
  process.stderr.write(`wrote ${out}\n`);
}

// Only when run as a command. These modules hold constants other code imports,
// and several of them start a fit or an ablation, so an import that ran them
// would quietly spend an hour of a machine.
if (import.meta.main) main();
