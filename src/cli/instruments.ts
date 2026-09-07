/**
 * Write the instruments the library ships, out of the fits.
 *
 *   node src/cli/instruments.ts --fits docs/fits-lean --consensus docs/consensus/*.json
 *                               [--traces DIR] [--label "round 2"] [--out src/model/instruments.data.ts]
 *
 * One preset per roll from `<fits>/<druid>.json`, its seed runs beside it for the
 * spread, expressed in bellows travel with the drawing apparatus off; and the
 * consensus from the pooled fits, the best seed per half. The traces are read
 * for the coverage and the hook arrivals the provenance records.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Instrument, Provenance } from "../model/instruments.ts";
import { pneumaticModel } from "../model/pneumatic.ts";
import type { Parameters } from "../model/types.ts";
import { DRAWING_APPARATUS, inTravelUnits } from "../model/units.ts";
import { HALVES, type Half } from "../roll/expression.ts";
import { DEFAULT_TRACES, loadRoll } from "../roll/load.ts";
import { measureRoll } from "../truth/measure.ts";
import { axisFrom } from "./settings.ts";

/** The six rolls with drawn lines, as the SUPRA index records them. */
const ROLLS = [
  { welte: "1348", druid: "jn038xx9588", performer: "Felix Mottl", title: "Wagner, Lohengrin" },
  { welte: "1474", druid: "ns598kr8616", performer: "Olga Samaroff", title: "Liszt, Tannhäuser march" },
  { welte: "1478", druid: "ym773gh2267", performer: "Olga Samaroff", title: "Grieg, concerto in A minor" },
  {
    welte: "2739",
    druid: "ws250sr1272",
    performer: "Claude Debussy",
    title: "Préludes",
    note: "The drawing is faint, and the treble rests on the P.P. rule for much of the roll.",
  },
  { welte: "3309", druid: "jq774vx6544", performer: "Wilhelm Backhaus", title: "Schubert, Militärmarsch" },
  {
    welte: "3357",
    druid: "kw215gn3365",
    performer: "Hubert Flohr",
    title: "Raff, Cachoucha",
    note: "The strokes are wide with a dark edge on the soft side, which the tracer rides, so levels may sit a few hundredths off, consistently.",
  },
] as const;

type FitHalf = { readonly half: Half; readonly params: Parameters; readonly test: { readonly rmse: number } };
type FitFile = { readonly results: readonly FitHalf[] };
type PooledHalf = {
  readonly half: Half;
  readonly params: Parameters;
  readonly perRoll: readonly { readonly druid: string; readonly test: { readonly rmse: number } }[];
  readonly meanTestRmse: number;
};
type PooledFile = { readonly rolls: readonly string[]; readonly results: readonly PooledHalf[] };

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

/** Every value after `--name` up to the next option, so a shell glob or a comma list both work. */
function options(name: string): string[] {
  const at = process.argv.indexOf(`--${name}`);
  if (at < 0) return [];
  const rest = process.argv.slice(at + 1);
  const end = rest.findIndex((argument) => argument.startsWith("--"));
  return (end < 0 ? rest : rest.slice(0, end)).flatMap((argument) => argument.split(",")).filter(Boolean);
}

const NAMES = pneumaticModel.spec.map((entry) => entry.name);

/** In bellows travel, the drawing apparatus off, and nothing but the model's own parameters. */
function asInstrument(params: Parameters): Parameters {
  const travel = { ...pneumaticModel.defaults, ...inTravelUnits(params), ...DRAWING_APPARATUS };
  return Object.fromEntries(NAMES.map((name) => [name, travel[name]!]));
}

function halfOf(file: FitFile, half: Half): FitHalf {
  return file.results.find((result) => result.half === half)!;
}

function summed(file: FitFile): number {
  return file.results.reduce((total, result) => total + result.test.rmse, 0);
}

function seedFilesIn(fits: string, druid: string): FitFile[] {
  const found: FitFile[] = [];
  for (let seed = 1; seed <= 9; seed += 1) {
    try {
      found.push(JSON.parse(readFileSync(join(fits, `${druid}-seed${seed}.json`), "utf8")) as FitFile);
    } catch {
      break;
    }
  }
  return found;
}

function preset(roll: (typeof ROLLS)[number], fits: string, traces: string, label: string): Instrument {
  const best = JSON.parse(readFileSync(join(fits, `${roll.druid}.json`), "utf8")) as FitFile;
  const seeds = seedFilesIn(fits, roll.druid);
  const loaded = loadRoll(roll.druid, axisFrom(process.argv), traces);
  const measured = measureRoll(loaded);
  const spread = seeds.length > 1 ? { seedSpread: Math.max(...seeds.map(summed)) - Math.min(...seeds.map(summed)) } : {};
  const halfProvenance = (half: Half) => ({
    heldOutRmse: halfOf(best, half).test.rmse,
    coverage: measured[half].observedRows / loaded.grid.length,
    hookArrivals: measured[half].hook.arrivals,
  });
  const provenance: Provenance = {
    druid: roll.druid,
    performer: roll.performer,
    title: roll.title,
    traces: label,
    seeds: seeds.length,
    ...spread,
    bass: halfProvenance("bass"),
    treble: halfProvenance("treble"),
    ...("note" in roll ? { note: roll.note } : {}),
  };
  return {
    name: roll.welte,
    bass: asInstrument(halfOf(best, "bass").params),
    treble: asInstrument(halfOf(best, "treble").params),
    provenance,
  };
}

function consensus(paths: readonly string[], label: string): Instrument {
  const files = paths.map((path) => JSON.parse(readFileSync(path, "utf8")) as PooledFile);
  const bestOf = (half: Half): PooledHalf => {
    const candidates = files.flatMap((file) => file.results.filter((result) => result.half === half));
    if (candidates.length === 0) throw new Error(`no pooled fit of the ${half}`);
    return candidates.reduce((best, entry) => (entry.meanTestRmse < best.meanTestRmse ? entry : best));
  };
  const scoresOf = (half: Half): number[] =>
    files.flatMap((file) => file.results.filter((r) => r.half === half).map((r) => r.meanTestRmse));
  const spreadOf = (half: Half): number => Math.max(...scoresOf(half)) - Math.min(...scoresOf(half));
  const seeds = Math.min(...HALVES.map((half) => scoresOf(half).length));
  const halves = { bass: bestOf("bass"), treble: bestOf("treble") };
  const welteOf = (druid: string): string => ROLLS.find((roll) => roll.druid === druid)?.welte ?? druid;
  const pooled = Object.fromEntries(
    halves.bass.perRoll.map((entry) => [
      welteOf(entry.druid),
      {
        bass: entry.test.rmse,
        treble: halves.treble.perRoll.find((other) => other.druid === entry.druid)!.test.rmse,
      },
    ]),
  );
  return {
    name: "consensus",
    bass: asInstrument({ ...pneumaticModel.defaults, ...halves.bass.params, piano: 0, forte: 1 }),
    treble: asInstrument({ ...pneumaticModel.defaults, ...halves.treble.params, piano: 0, forte: 1 }),
    provenance: {
      traces: label,
      seeds,
      ...(seeds > 1 ? { seedSpread: spreadOf("bass") + spreadOf("treble") } : {}),
      bass: { heldOutRmse: halves.bass.meanTestRmse },
      treble: { heldOutRmse: halves.treble.meanTestRmse },
      pooled,
    },
  };
}

function main(): void {
  const fits = option("fits", "docs/fits-lean");
  const pooledPaths = options("consensus");
  if (pooledPaths.length === 0) throw new Error("--consensus names the pooled fit files");
  const traces = option("traces", DEFAULT_TRACES);
  const label = option("label", "round 2");
  const out = option("out", "src/model/instruments.data.ts");

  const presets = Object.fromEntries(ROLLS.map((roll) => [roll.welte, preset(roll, fits, traces, label)]));
  const pooled = consensus(pooledPaths, label);
  const literal = (value: unknown): string => JSON.stringify(value, null, 2);

  writeFileSync(
    out,
    `// Generated by src/cli/instruments.ts from ${fits} and ${pooledPaths.join(", ")}; do not edit by hand.
// Bellows travel, rails at 0 and 1, drawing apparatus off. The test beside instruments.ts keeps it so.

import type { Instrument } from "./instruments.ts";

export const PRESET_DATA: Readonly<Record<${ROLLS.map((roll) => `"${roll.welte}"`).join(" | ")}, Instrument>> = ${literal(presets)};

export const CONSENSUS_DATA: Instrument = ${literal(pooled)};
`,
  );
  console.error(`wrote ${out}: ${ROLLS.length} presets and the consensus`);
  const shown = (value: number | undefined): string => (value === undefined ? "—" : value.toFixed(4));
  console.table(
    [...Object.values(presets), pooled].map((instrument) => ({
      instrument: instrument.name,
      "bass held out": shown(instrument.provenance.bass.heldOutRmse),
      "treble held out": shown(instrument.provenance.treble.heldOutRmse),
      "seed spread": shown(instrument.provenance.seedSpread),
      "hook arrivals": `${instrument.provenance.bass.hookArrivals ?? "—"} / ${instrument.provenance.treble.hookArrivals ?? "—"}`,
    })),
  );
}

// Only when run as a command: the module holds the roll table other code may want.
if (import.meta.main) main();
