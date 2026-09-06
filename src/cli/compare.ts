/**
 * The fitted constants of several rolls, side by side.
 *
 *   node src/cli/compare.ts --rolls A,B,C [--fits docs/fits]
 *                           [--out docs/rolls.json] [--md docs/rolls.md]
 *                           [--timing scan] [--effect 0.8] [--revolution 4.64]
 *
 * Three questions, and nothing else: what each roll's fit settled on and how
 * much of that the roll itself measures; whether one roll's constants still
 * describe another roll's line; and what times the constants imply, so that they
 * can be held against Schmitz's Bild 4.
 *
 * Each roll's fit is read from `fitPathFor`, so the headline roll keeps the
 * published file and every other roll comes from `docs/fits/<druid>.json`, which
 * `--fits` may redirect. Seed runs are `<druid>-seed<N>.json` beside them, and
 * where two or more exist the spread between them is what separates a constant
 * that differs between rolls from one that differs between runs.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { agreement, type Agreement } from "../eval/metrics.ts";
import { alternatingBlocks } from "../eval/split.ts";
import { midi2expModel } from "../model/midi2exp.ts";
import { pneumaticModel } from "../model/pneumatic.ts";
import { describeTraversals } from "../model/timings.ts";
import type { Model, ParameterSpec, Parameters } from "../model/types.ts";
import { HALVES, type Half } from "../roll/expression.ts";
import { loadRoll, type LoadedRoll, type PortModel } from "../roll/load.ts";
import { halfOf } from "../truth/curves.ts";
import { measureRoll, withheldFrom, type HalfMeasurement, type RollMeasurement } from "../truth/measure.ts";
import { MF_THICKNESS } from "../model/stop.ts";
import { HEADLINE_DRUID, axisFrom, fitPathFor } from "./settings.ts";

const MODELS: ReadonlyMap<string, Model> = new Map([
  [midi2expModel.name, midi2expModel],
  [pneumaticModel.name, pneumaticModel],
]);

/**
 * The four constants a roll shows directly. `mezzoforte` is left out of the
 * substitution below because the pin is a regulation of the instrument, while
 * these three are where the drawing apparatus put the pen on this sheet of
 * paper: the two rails it rests against and how far ahead of the punches it ran.
 */
const REGISTRATION = ["piano", "forte", "leadRows"] as const;

/**
 * Schmitz 1981, Bild 4, digitised in `docs/sources.md`. The drawing is the
 * larger uncertainty, and the figures come from rolls other than these.
 */
const DECAY_SPAN = "slow decrescendo, e-folding from M.F.";
const SCHMITZ_BILD_4: ReadonlyMap<string, string> = new Map([
  ["sforzando, P to F", "≈ 200"],
  ["sforzando release, F to P", "≈ 150"],
  ["slow crescendo, P to M.F.", "1300 to 1400"],
  [DECAY_SPAN, "≈ 700"],
]);

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

function fixed(value: number | undefined, places = 4): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(places) : "—";
}

// ---------------------------------------------------------------- fit files

type FitHalf = {
  readonly half: Half;
  readonly params: Parameters;
  readonly train: Agreement;
  readonly test: Agreement;
};

type FitFile = {
  readonly model: string;
  readonly druid: string;
  readonly ports?: PortModel;
  readonly seed?: number;
  readonly generations?: number;
  readonly results: readonly FitHalf[];
};

type Fit = {
  readonly path: string;
  readonly model: Model;
  readonly ports: PortModel;
  readonly seed: number | undefined;
  readonly generations: number | undefined;
  readonly byHalf: Record<Half, FitHalf>;
};

function indexByHalf<T extends { readonly half: Half }>(results: readonly T[], path: string): Record<Half, T> {
  const found = new Map(results.map((result) => [result.half, result]));
  return Object.fromEntries(
    HALVES.map((half) => {
      const result = found.get(half);
      if (!result) throw new Error(`${path} has no ${half} result`);
      return [half, result];
    }),
  ) as Record<Half, T>;
}

function readFit(path: string): Fit {
  if (!existsSync(path)) throw new Error(`no fit at ${path}; run src/cli/fit.ts for that roll first`);
  const file = JSON.parse(readFileSync(path, "utf8")) as FitFile;
  const model = MODELS.get(file.model);
  if (!model) throw new Error(`${path} names model ${file.model}; have ${[...MODELS.keys()].join(", ")}`);
  return {
    path,
    model,
    ports: file.ports ?? "aperture",
    seed: file.seed,
    generations: file.generations,
    byHalf: indexByHalf(file.results, path),
  };
}

/** Where this roll's fit is. The published file keeps its own name; `--fits` moves the rest. */
function fitPathFrom(directory: string, druid: string): string {
  return druid === HEADLINE_DRUID ? fitPathFor(druid) : join(directory, `${druid}.json`);
}

// ------------------------------------------------------------- seed spread

type SeedSpread = {
  readonly seeds: readonly number[];
  /** Largest difference between seeds, per half and parameter. */
  readonly perParameter: Record<Half, Parameters>;
  /** The same for the two held-out rmse added together. */
  readonly heldOutRmse: number;
};

function seedFitsIn(directory: string, druid: string): Fit[] {
  if (!existsSync(directory)) return [];
  const prefix = `${druid}-seed`;
  return readdirSync(directory)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
    .map((name) => readFit(join(directory, name)))
    .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0));
}

function spanOf(values: readonly number[]): number {
  return values.length < 2 ? Number.NaN : Math.max(...values) - Math.min(...values);
}

function seedSpreadOf(fits: readonly Fit[], model: Model): SeedSpread | undefined {
  if (fits.length < 2) return undefined;
  const perParameter = Object.fromEntries(
    HALVES.map((half) => [
      half,
      Object.fromEntries(
        model.spec.map((entry) => [
          entry.name,
          spanOf(fits.flatMap((fit) => fit.byHalf[half].params[entry.name] ?? [])),
        ]),
      ),
    ]),
  ) as Record<Half, Parameters>;

  return {
    seeds: fits.map((fit) => fit.seed ?? Number.NaN),
    perParameter,
    heldOutRmse: spanOf(
      fits.map((fit) => HALVES.reduce((total, half) => total + fit.byHalf[half].test.rmse, 0)),
    ),
  };
}

// ------------------------------------------------------ measured constants

type MeasuredConstant = {
  readonly value: number;
  /** Whether the roll shows enough of it for the fit to pin it in stage 1. */
  readonly pinned: boolean;
  readonly evidence: string;
};

/**
 * The four measured constants with the evidence behind each, including the ones
 * the roll cannot settle: a number the fit refused to pin is worth seeing beside
 * the fitted one.
 */
function measuredConstantsOf(measured: HalfMeasurement, thickness: number): Record<string, MeasuredConstant> {
  const withheld = new Set(withheldFrom(measured).flatMap((entry) => entry.names));
  const { rails, hook, lead } = measured;
  const shown = (name: string, value: number, evidence: string): [string, MeasuredConstant] => [
    name,
    { value, pinned: !withheld.has(name), evidence },
  ];
  const rest = `rest histogram over ${measured.observedRows} observed rows`;
  return Object.fromEntries([
    shown("piano", rails.piano, rest),
    shown("forte", rails.forte, rest),
    shown("mezzoforte", hook.level + thickness / 2, `${hook.arrivals} arrivals, sd ${fixed(hook.spread)}`),
    shown("leadRows", -lead.aheadRows, `${lead.falls} collapses, iqr ${fixed(lead.iqrRows, 1)}`),
  ]);
}

// ------------------------------------------------------------------- rolls

type Roll = {
  readonly druid: string;
  readonly fit: Fit;
  readonly loaded: LoadedRoll;
  readonly measured: RollMeasurement;
  readonly constants: Record<Half, Record<string, MeasuredConstant>>;
  /** Where this roll's own line sits on its own paper, for the second transfer variant. */
  readonly registration: Record<Half, Parameters>;
  readonly spread: SeedSpread | undefined;
};

function registrationOf(constants: Record<string, MeasuredConstant>): Parameters {
  return Object.fromEntries(
    REGISTRATION.flatMap((name) => {
      const measured = constants[name];
      return measured && measured.pinned && Number.isFinite(measured.value) ? [[name, measured.value]] : [];
    }),
  );
}

function readRolls(druids: readonly string[], directory: string): Roll[] {
  const thickness = MF_THICKNESS;
  return druids.map((druid) => {
    const fit = readFit(fitPathFrom(directory, druid));
    process.stderr.write(`loading ${druid} for ${fit.path}\n`);
    const loaded = loadRoll(druid, axisFrom(process.argv));
    const measured = measureRoll(loaded);
    const constants = Object.fromEntries(
      HALVES.map((half) => [half, measuredConstantsOf(measured[half], thickness)]),
    ) as Record<Half, Record<string, MeasuredConstant>>;
    return {
      druid,
      fit,
      loaded,
      measured,
      constants,
      registration: Object.fromEntries(
        HALVES.map((half) => [half, registrationOf(constants[half])]),
      ) as Record<Half, Parameters>,
      spread: seedSpreadOf(seedFitsIn(directory, druid), fit.model),
    };
  });
}

/** What the model is actually run with: its own defaults, then the fit. */
function complete(model: Model, params: Parameters): Parameters {
  return { ...model.defaults, ...params };
}

// ---------------------------------------------------------------- transfer

const VARIANTS = ["as fitted", "re-registered"] as const;
type Variant = (typeof VARIANTS)[number];

type TransferCell = {
  readonly from: string;
  readonly onto: string;
  readonly half: Half;
  readonly variant: Variant;
  readonly rows: number;
  readonly rmse: number;
  readonly mae: number;
  readonly correlation: number;
  readonly bias: number;
  /** On the diagonal only: the fit's own held-out score, over a subset of these rows. */
  readonly heldOutRmse: number | undefined;
};

/**
 * A's constants scored on B's punched code against B's drawn line, over every
 * row B's tracer witnessed. The whole roll, so the diagonal is not the held-out
 * number the fit reports and is carried beside it rather than in place of it.
 */
function transfer(from: Roll, onto: Roll, half: Half, variant: Variant): TransferCell {
  const model = from.fit.model;
  const fitted = from.fit.byHalf[half].params;
  const params = complete(model, variant === "as fitted" ? fitted : { ...fitted, ...onto.registration[half] });
  const truth = halfOf(onto.loaded.curves, half);
  const output = model.run(onto.loaded.inputFor(half, from.fit.ports), params);
  const whole = agreement(output, truth.value, truth.observed);
  const heldOut =
    from === onto
      ? agreement(output, truth.value, alternatingBlocks(onto.loaded.grid, truth.observed).test).rmse
      : undefined;
  return {
    from: from.druid,
    onto: onto.druid,
    half,
    variant,
    rows: whole.n,
    rmse: whole.rmse,
    mae: whole.mae,
    correlation: whole.correlation,
    bias: whole.bias,
    heldOutRmse: heldOut,
  };
}

function transferMatrix(rolls: readonly Roll[]): TransferCell[] {
  return rolls.flatMap((from) =>
    rolls.flatMap((onto) => HALVES.flatMap((half) => VARIANTS.map((variant) => transfer(from, onto, half, variant)))),
  );
}

/**
 * The diagonal of the "as fitted" matrix, recomputed on the fit's own held-out
 * mask, against what the fit file recorded. They should agree to the last digit;
 * anything else means the fit was made under different settings than these.
 */
type Reproduction = { readonly druid: string; readonly half: Half; readonly recorded: number; readonly here: number };

function reproductions(rolls: readonly Roll[], cells: readonly TransferCell[]): Reproduction[] {
  return rolls.flatMap((roll) =>
    HALVES.flatMap((half) => {
      const cell = cells.find(
        (entry) =>
          entry.from === roll.druid && entry.onto === roll.druid && entry.half === half && entry.variant === "as fitted",
      );
      return cell?.heldOutRmse === undefined
        ? []
        : [{ druid: roll.druid, half, recorded: roll.fit.byHalf[half].test.rmse, here: cell.heldOutRmse }];
    }),
  );
}

// ----------------------------------------------------------- travel times

type Travel = {
  readonly druid: string;
  readonly half: Half;
  readonly span: string;
  readonly from: string;
  readonly to: string;
  readonly ms: string;
  readonly schmitz: string;
};

/**
 * Time for the gap to the release asymptote to shrink by a factor e, starting at
 * the fitted pin. Exact for the model's flow law `dx/dt = -g·|x-T|^α`, and the
 * one quantity comparable with the exponential Schmitz fits to his crescendo
 * piano, which the traversal below is not.
 */
function decayMilliseconds(params: Parameters): number {
  const gap = (params.mezzoforte ?? 0) - (params.releaseTarget ?? 0);
  const rate = params.releaseRate ?? 0;
  const exponent = 1 - (params.alpha ?? 1);
  if (!(gap > 0) || !(rate > 0)) return Number.NaN;
  if (Math.abs(exponent) < 1e-9) return 1000 / rate;
  return (1000 * gap ** exponent * (1 - Math.exp(-exponent))) / (rate * exponent);
}

/** The row `traversals` does not carry, because a time constant is not a traversal. */
function decayRow(druid: string, half: Half, params: Parameters): Travel {
  const from = params.mezzoforte ?? 0;
  const gap = from - (params.releaseTarget ?? 0);
  return {
    druid,
    half,
    span: DECAY_SPAN,
    from: fixed(from, 3),
    to: fixed(from - gap / Math.E, 3),
    ms: fixed(decayMilliseconds(params), 0),
    schmitz: SCHMITZ_BILD_4.get(DECAY_SPAN) ?? "—",
  };
}

function travelTimes(rolls: readonly Roll[]): Travel[] {
  return rolls.flatMap((roll) =>
    HALVES.flatMap((half) => {
      const params = complete(roll.fit.model, roll.fit.byHalf[half].params);
      return [
        ...describeTraversals(params).map((entry) => ({
          druid: roll.druid,
          half,
          span: entry.span,
          from: entry.from,
          to: entry.to,
          ms: entry.ms,
          schmitz: SCHMITZ_BILD_4.get(entry.span) ?? "—",
        })),
        decayRow(roll.druid, half, params),
      ];
    }),
  );
}

// ---------------------------------------------------------------- markdown

type Column<Row> = { readonly head: string; readonly right?: true; readonly cell: (row: Row) => string };

function table<Row>(columns: readonly Column<Row>[], rows: readonly Row[]): string {
  const line = (cells: readonly string[]): string => `| ${cells.join(" | ")} |`;
  return [
    line(columns.map((column) => column.head)),
    line(columns.map((column) => (column.right ? "---:" : "---"))),
    ...rows.map((row) => line(columns.map((column) => column.cell(row)))),
  ].join("\n");
}

/**
 * One roll's value of one parameter, with what is known about it: `†` measured
 * off this roll and pinned in the fit's first stage, `=` settled before the fit,
 * `↑` or `↓` resting on its own bound, and the spread between seed runs.
 */
function constantCell(roll: Roll, half: Half, entry: ParameterSpec): string {
  const fitted = roll.fit.byHalf[half].params[entry.name];
  const value = fitted ?? complete(roll.fit.model, {})[entry.name];
  if (value === undefined) return "—";
  // One part in a thousand of the box rather than an exact equality: the
  // coordinate sweep stops a little short of a wall it is pressed against, and
  // 0.74985 against an upper bound of 0.75 is a value the bound is setting.
  const margin = (entry.upper - entry.lower) / 1000;
  const bound =
    fitted === undefined ? "" : value <= entry.lower + margin ? " ↓" : value >= entry.upper - margin ? " ↑" : "";
  const settled = fitted === undefined ? " =" : "";
  const pinned = roll.constants[half][entry.name]?.pinned ? " †" : "";
  const spread = roll.spread?.perParameter[half][entry.name];
  const between = spread !== undefined && Number.isFinite(spread) ? ` ±${Number(spread.toPrecision(2))}` : "";
  return `${Number(value.toPrecision(4))}${bound}${settled}${pinned}${between}`;
}

function constantsSection(rolls: readonly Roll[], model: Model, checks: readonly Reproduction[]): string {
  const perHalf = HALVES.map((half) => {
    const columns: Column<ParameterSpec>[] = [
      { head: "parameter", cell: (entry) => `\`${entry.name}\`` },
      { head: "unit", cell: (entry) => entry.unit },
      ...rolls.map((roll) => ({
        head: roll.druid,
        right: true as const,
        cell: (entry: ParameterSpec) => constantCell(roll, half, entry),
      })),
    ];
    return `**${half}**\n\n${table(columns, model.spec)}`;
  }).join("\n\n");

  const measuredRows = rolls.flatMap((roll) =>
    HALVES.flatMap((half) =>
      Object.entries(roll.constants[half]).map(([name, measured]) => ({ roll, half, name, measured })),
    ),
  );
  const measured = table(
    [
      { head: "roll", cell: (row) => row.roll.druid },
      { head: "half", cell: (row) => row.half },
      { head: "parameter", cell: (row) => `\`${row.name}\`` },
      { head: "measured", right: true, cell: (row) => fixed(row.measured.value) },
      { head: "fitted", right: true, cell: (row) => fixed(row.roll.fit.byHalf[row.half].params[row.name]) },
      { head: "pinned", cell: (row) => (row.measured.pinned ? "yes" : "left to the fit") },
      { head: "evidence", cell: (row) => row.measured.evidence },
    ],
    measuredRows,
  );

  const scoreRows = rolls.flatMap((roll) => HALVES.map((half) => ({ roll, half })));
  const scores = table(
    [
      { head: "roll", cell: (row) => row.roll.druid },
      { head: "half", cell: (row) => row.half },
      { head: "rows", right: true, cell: (row) => String(row.roll.fit.byHalf[row.half].test.n) },
      { head: "RMSE", right: true, cell: (row) => fixed(row.roll.fit.byHalf[row.half].test.rmse) },
      {
        head: "RMSE recomputed",
        right: true,
        cell: (row) =>
          fixed(checks.find((check) => check.druid === row.roll.druid && check.half === row.half)?.here),
      },
      { head: "MAE", right: true, cell: (row) => fixed(row.roll.fit.byHalf[row.half].test.mae) },
      { head: "r", right: true, cell: (row) => fixed(row.roll.fit.byHalf[row.half].test.correlation, 3) },
      { head: "bias", right: true, cell: (row) => fixed(row.roll.fit.byHalf[row.half].test.bias) },
      {
        head: "seeds",
        right: true,
        cell: (row) => (row.roll.spread ? row.roll.spread.seeds.join(", ") : "—"),
      },
      {
        head: "summed RMSE between seeds",
        right: true,
        cell: (row) => fixed(row.roll.spread?.heldOutRmse),
      },
    ],
    scoreRows,
  );

  return `## 1. Constants

Fitted values in units of the roll's printed scale unless the unit says otherwise. \`†\` marks a
parameter this roll measures directly, which the fit holds in its first stage and releases in its
second; \`=\` one settled before any fit; \`↑\` and \`↓\` a value within a thousandth of its box of its
own bound, which means the bound and not the roll is setting it. \`±\` is the largest difference between the seed
runs \`<druid>-seed<N>.json\`, so a difference between rolls smaller than it is a difference
between runs.

${perHalf}

Measured off each roll by \`src/truth/measure.ts\`, beside what the fit made of it. A constant the
roll cannot settle is left to the fit rather than pinned at a number nothing supports.

${measured}

Held-out agreement, on the alternating blocks the fit never saw. The recomputed column runs the
recorded parameters through the model again on the same mask, so a roll whose two RMSE columns
disagree has a fit file written under code that no longer produces it.

${scores}`;
}

function matrixSection(rolls: readonly Roll[], cells: readonly TransferCell[]): string {
  const matrices = VARIANTS.flatMap((variant) =>
    HALVES.map((half) => {
      const cellFor = (from: Roll, onto: Roll): TransferCell | undefined =>
        cells.find(
          (entry) =>
            entry.from === from.druid && entry.onto === onto.druid && entry.half === half && entry.variant === variant,
        );
      const columns: Column<Roll>[] = [
        { head: "constants of ↓ on →", cell: (from) => from.druid },
        ...rolls.map((onto) => ({
          head: onto.druid,
          right: true as const,
          cell: (from: Roll) => {
            const cell = cellFor(from, onto);
            if (!cell) return "—";
            return cell.heldOutRmse === undefined
              ? fixed(cell.rmse)
              : `${fixed(cell.rmse)} (${fixed(cell.heldOutRmse)})`;
          },
        })),
      ];
      return `**${variant}, ${half}**\n\n${table(columns, rolls)}`;
    }),
  ).join("\n\n");

  return `## 2. Transfer

RMSE of the row's constants run on the column's punched code, against the column's drawn line, over
every row that column's tracer witnessed. The diagonal is therefore the whole roll and not the
held-out number the fit reports; that one is in brackets beside it.

*As fitted* takes the row's parameters unchanged. *Re-registered* replaces \`piano\`, \`forte\` and
\`leadRows\` with the column roll's own measured values wherever its trace settles them, which the
pinned column of the measurement table above says. Those three are where the drawing apparatus put
the pen on that sheet rather than anything about the mechanism, so a roll that settles none of them
gets the same number in both variants. \`mezzoforte\` stays the row's, the pin being a regulation of
the instrument. \`scaleWarp\` and the four relative lead offsets also stay the row's: no roll
measures them, and taking them from the column's fit would make the transfer partly that fit.

${matrices}`;
}

function travelSection(rolls: readonly Roll[], travels: readonly Travel[]): string {
  const spans = [...new Set(travels.map((travel) => travel.span))];
  const columns: Column<string>[] = [
    { head: "span", cell: (span) => span },
    ...rolls.flatMap((roll) =>
      HALVES.map((half) => ({
        head: `${roll.druid} ${half}`,
        right: true as const,
        cell: (span: string) =>
          travels.find((travel) => travel.druid === roll.druid && travel.half === half && travel.span === span)?.ms ??
          "—",
      })),
    ),
    {
      head: "Schmitz 1981",
      right: true,
      cell: (span) => travels.find((travel) => travel.span === span)?.schmitz ?? "—",
    },
  ];

  return `## 3. Travel times

Milliseconds of free travel from \`src/model/timings.ts\`: nothing is clamped and the Mezzoforte pin
is ignored, and the integration is in the model's own bellows travel, which \`scaleWarp\` bends onto
the printed scale afterwards. The last column is Schmitz 1981, Bild 4, as \`docs/sources.md\`
digitises it, from rolls other than these and from a hand drawing. His decay is a time constant, so
the row it belongs to is the e-folding time rather than a traversal. 30000 is the integrator's own
limit, and means the target lies short of the destination so that the span is never crossed.

${table(columns, spans)}`;
}

type Report = {
  readonly rolls: readonly Roll[];
  readonly model: Model;
  readonly cells: readonly TransferCell[];
  readonly travels: readonly Travel[];
  readonly checks: readonly Reproduction[];
};

function markdown({ rolls, model, cells, travels, checks }: Report): string {
  return `# Rolls compared

${rolls.length} ${rolls.length === 1 ? "roll" : "rolls"} fitted separately with the \`${
    model.name
  }\` model, from ${rolls.map((roll) => `\`${roll.fit.path}\``).join(", ")}.

Generated by \`src/cli/compare.ts\`; do not edit by hand.

${constantsSection(rolls, model, checks)}

${matrixSection(rolls, cells)}

${travelSection(rolls, travels)}
`;
}

function document({ rolls, model, cells, travels, checks }: Report): object {
  return {
    model: model.name,
    rolls: rolls.map((roll) => ({
      druid: roll.druid,
      fit: roll.fit.path,
      ports: roll.fit.ports,
      seed: roll.fit.seed,
      generations: roll.fit.generations,
      rows: roll.loaded.grid.length,
      axis: roll.loaded.roll.timing.axis.name,
      measured: roll.measured,
      constants: roll.constants,
      registration: roll.registration,
      spread: roll.spread,
      fitted: Object.fromEntries(HALVES.map((half) => [half, roll.fit.byHalf[half]])),
    })),
    transfer: cells,
    travel: travels,
    reproduction: checks,
  };
}

/** The two things worth seeing without opening a file: the check, and the transfer. */
function printSummary({ cells, checks }: Report): void {
  console.table(
    checks.map((check) => ({
      roll: check.druid,
      half: check.half,
      "held-out rmse, recorded": fixed(check.recorded, 6),
      "recomputed here": fixed(check.here, 6),
    })),
  );
  console.table(
    cells
      .filter((cell) => cell.variant === "re-registered")
      .map((cell) => ({
        constants: cell.from,
        "run on": cell.onto,
        half: cell.half,
        rows: cell.rows,
        rmse: fixed(cell.rmse),
        r: fixed(cell.correlation, 3),
      })),
  );
}

// -------------------------------------------------------------------- main

function main(): void {
  const druids = [...new Set(option("rolls", HEADLINE_DRUID).split(",").filter(Boolean))];
  const directory = option("fits", "docs/fits");
  const out = option("out", "docs/rolls.json");
  const md = option("md", "docs/rolls.md");

  const rolls = readRolls(druids, directory);
  const models = new Set(rolls.map((roll) => roll.fit.model.name));
  if (models.size > 1) throw new Error(`the fits name different models (${[...models].join(", ")})`);
  const model = rolls[0]?.fit.model;
  if (!model) throw new Error("--rolls wants at least one druid");

  const cells = transferMatrix(rolls);
  const report: Report = { rolls, model, cells, travels: travelTimes(rolls), checks: reproductions(rolls, cells) };
  printSummary(report);

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(document(report), null, 2));
  mkdirSync(dirname(md), { recursive: true });
  writeFileSync(md, markdown(report));
  process.stderr.write(`wrote ${out} and ${md}\n`);
}

// Only when run as a command. These modules hold constants other code imports,
// and several of them start a fit or an ablation, so an import that ran them
// would quietly spend an hour of a machine.
if (import.meta.main) main();
