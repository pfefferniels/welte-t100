/**
 * The model put through Welte's own acceptance tests.
 *
 *   node src/cli/skalarolle.ts [--fit docs/fit-pneumatic.json]
 *
 * Anhang 12 of Hagmann is the regulation procedure for the T-100, taken from
 * Welte's scale-roll booklet: a technician plays a test roll and checks that the
 * bellows do particular things. Those are statements about the instrument that
 * owe nothing to roll 3309, so putting the fitted model through them tests it
 * against something it was never fitted to. Nothing here is a metric to optimise;
 * it either behaves as the manual requires or it does not.
 *
 * The tests are run on a synthetic roll built at this roll's own speed.
 */

import { readFileSync } from "node:fs";

import { Grid } from "../roll/grid.ts";
import { aperturePorts } from "../roll/aperture.ts";
import { pneumaticModel } from "../model/pneumatic.ts";
import type { Action, Control, Half, Perforation } from "../roll/expression.ts";
import type { ModelInput, Parameters } from "../model/types.ts";

const ROWS_PER_SECOND = 604;
/** Median sforzando-on perforation on roll 3309, bass, in scan rows. */
const TYPICAL_PUNCH = 39;

type Cue = { readonly control: Control; readonly action: Action; readonly at: number; readonly length: number };

function punch(control: Control, action: Action, at: number, length = TYPICAL_PUNCH): Cue {
  return { control, action, at, length };
}

function bench(seconds: number, cues: readonly Cue[]): ModelInput {
  const length = Math.round(seconds * ROWS_PER_SECOND);
  const grid = new Grid(0, Float64Array.from({ length }, (_, index) => index / ROWS_PER_SECOND));
  const perforations: Perforation[] = cues.map((cue) => ({
    half: "bass" as Half,
    control: cue.control,
    action: cue.action,
    key: 0,
    tickOn: cue.at,
    tickOff: cue.at + cue.length,
    rowOn: cue.at,
    rowOff: cue.at + cue.length,
    secondsOn: cue.at / ROWS_PER_SECOND,
    secondsOff: (cue.at + cue.length) / ROWS_PER_SECOND,
  }));
  const quiet = new Float64Array(length);
  return {
    grid,
    half: "bass",
    ports: aperturePorts(grid, perforations),
    noteDensity: quiet,
    totalNoteDensity: quiet,
  };
}

function run(params: Parameters, seconds: number, cues: readonly Cue[]): Float64Array {
  return pneumaticModel.run(bench(seconds, cues), { ...params, leadRows: 0, leadDriftRows: 0 });
}

const at = (travel: Float64Array, seconds: number): number =>
  travel[Math.min(Math.round(seconds * ROWS_PER_SECOND), travel.length - 1)]!;

/**
 * The staircase: the peak reached after each pulse. Between pulses the bellows
 * falls back, so the step is the crest, not where it settles.
 */
function pulses(params: Parameters, count: number, length: number, spacingSeconds: number): number[] {
  const cues = Array.from({ length: count }, (_, index) =>
    punch("sforzando", "on", Math.round((0.5 + index * spacingSeconds) * ROWS_PER_SECOND), length),
  );
  const travel = run(params, 1 + count * spacingSeconds + 0.5, cues);
  return Array.from({ length: count }, (_, index) => {
    const from = Math.round((0.5 + index * spacingSeconds) * ROWS_PER_SECOND);
    const to = Math.round((0.5 + (index + 1) * spacingSeconds) * ROWS_PER_SECOND);
    return travel.subarray(from, Math.min(to, travel.length)).reduce((high, value) => Math.max(high, value), 0);
  });
}

function control4b(params: Parameters, mezzoforte: number, piano: number) {
  // "sechs kurzen Perforationen Sforzando an: Die Nuancierbälge müssen sich in
  // sechs Schritten von der Piano- zur Mezzoforte-Stellung bewegen. … Eingabe von
  // sechs noch kürzeren Perforationen: Die Nuancierbälge dürfen sich nicht bewegen."
  // Nothing below one punch diameter is a real perforation; a punch is a punch.
  const lengths = [21, 26, 32, 39, 48, 60, 76];
  return lengths.flatMap((length) =>
    [0.2, 0.35].map((spacing) => {
      const steps = pulses(params, 6, length, spacing);
      const reached = steps.at(-1)!;
      const rising = steps.every((value, index) => index === 0 || value > steps[index - 1]! + 0.004);
      return {
        "punch, rows": length,
        "ms open": (((length + 16.7) / ROWS_PER_SECOND) * 1000).toFixed(0),
        "gap, s": spacing,
        staircase: steps.map((value) => value.toFixed(2)).join(" "),
        "as fraction of P–M.F.": ((reached - piano) / (mezzoforte - piano)).toFixed(2),
        "six rising steps": rising ? "yes" : "no",
      };
    }),
  );
}

function control6c(params: Parameters) {
  // "9x Eingabe von Sforzando an-ab: die Nuancierbälge sollen sich stets auf
  // Mezzoforte-Stellung halten."
  const cues = Array.from({ length: 9 }, (_, index) => [
    punch("sforzando", "on", Math.round((0.5 + index * 0.6) * ROWS_PER_SECOND)),
    punch("sforzando", "off", Math.round((0.8 + index * 0.6) * ROWS_PER_SECOND)),
  ]).flat();
  const travel = run(params, 7, cues);
  const window = Array.from({ length: 9 }, (_, index) => at(travel, 0.75 + index * 0.6));
  return { peaks: window.map((value) => value.toFixed(3)).join("  ") };
}

function control6a(params: Parameters) {
  // "Eingabe von Crescendo: Die Nuancierbälge bewegen sich langsam vom p zum f.
  //  Gleichzeitig 5x Eingabe von Sforzando an-ab: Trotz der Eingabe von
  //  Sforzando-Bewegungen sollen sich die Nuancierbälge vollständig schliessen."
  const pairs = Array.from({ length: 5 }, (_, index) => [
    punch("sforzando", "on", Math.round((1.0 + index * 1.2) * ROWS_PER_SECOND)),
    punch("sforzando", "off", Math.round((1.4 + index * 1.2) * ROWS_PER_SECOND)),
  ]).flat();
  const alone = run(params, 9, [punch("crescendo", "on", 200)]);
  const disturbed = run(params, 9, [punch("crescendo", "on", 200), ...pairs]);
  return {
    "crescendo alone ends at": alone.at(-1)!.toFixed(3),
    "with five sforzando pairs": disturbed.at(-1)!.toFixed(3),
    "still closes": disturbed.at(-1)! > alone.at(-1)! - 0.03 ? "yes" : "no",
  };
}

function control6b(params: Parameters, forte: number) {
  // "Eingabe von 5 kurzen Perforationen Sforzando an: Trotz des automatischen
  //  Eintritts der Decrescendo-Bewegung müssen die Bälge immer wieder die
  //  Forte-Stellung erreichen."
  const cues = Array.from({ length: 5 }, (_, index) =>
    punch("sforzando", "on", Math.round((0.6 + index * 0.9) * ROWS_PER_SECOND), 90),
  );
  const travel = run(params, 6, cues);
  const peaks = Array.from({ length: 5 }, (_, index) => {
    const from = Math.round((0.6 + index * 0.9) * ROWS_PER_SECOND);
    const to = Math.min(from + Math.round(0.55 * ROWS_PER_SECOND), travel.length - 1);
    return travel.subarray(from, to).reduce((high, value) => Math.max(high, value), 0);
  });
  return {
    peaks: peaks.map((value) => value.toFixed(2)).join("  "),
    "forte stop": forte.toFixed(3),
    "each reaches forte": peaks.every((value) => value > forte - 0.05) ? "yes" : "no",
  };
}

function control7(params: Parameters, mezzoforte: number) {
  // "Eingabe von Mezzoforte, Crescendo und Sforzando an: Die Nuancierbälge
  // schliessen sich rasch bis zur Mezzoforte-Stellung. Anschliessend Auslösung des
  // Mezzoforte: Die Nuancierbälge bewegen sich rasch in die Forte-Stellung."
  const cues = [
    punch("mezzoforte", "on", 300),
    punch("crescendo", "on", 300),
    punch("sforzando", "on", 300, 200),
    punch("mezzoforte", "off", Math.round(2 * ROWS_PER_SECOND)),
  ];
  const travel = run(params, 5, cues);
  return {
    "held before release": at(travel, 1.9).toFixed(3),
    "M.F. level": mezzoforte.toFixed(3),
    "after release": at(travel, 4.5).toFixed(3),
  };
}

function control3(params: Parameters, mezzoforte: number, piano: number) {
  // "Oeffnung und Schliessung in gleicher Geschwindigkeit": the crescendo up to
  // mezzoforte and the decrescendo back should take the same time.
  const rise = run(params, 12, [punch("crescendo", "on", 300)]);
  const first = (travel: Float64Array, level: number, from = 0): number => {
    const index = travel.findIndex((value, at2) => at2 > from && value >= level);
    return index < 0 ? Number.NaN : index / ROWS_PER_SECOND;
  };
  const low = piano + 0.1 * (mezzoforte - piano);
  const climb = first(rise, mezzoforte) - first(rise, low);

  const fall = run(params, 12, [punch("crescendo", "on", 300), punch("crescendo", "off", Math.round(6 * ROWS_PER_SECOND))]);
  const start = fall.findIndex((_, index) => index > 6 * ROWS_PER_SECOND);
  const dropTo = (level: number): number => {
    const index = fall.findIndex((value, at2) => at2 > start && value <= level);
    return index < 0 ? Number.NaN : index / ROWS_PER_SECOND;
  };
  const descend = dropTo(low) - dropTo(mezzoforte);

  return {
    "crescendo, 10 % to M.F. (ms)": (climb * 1000).toFixed(0),
    "decrescendo, M.F. to 10 % (ms)": (descend * 1000).toFixed(0),
    "ratio": (descend / climb).toFixed(2),
  };
}

/**
 * Two claims from the Leseregeln of Pfeffer's dissertation, which are statements
 * about the mechanism rather than about this roll, so they test the model the
 * same way Welte's controls do.
 *
 *   "Mit einem bloßen Crescendo an kann langsam ein Forte erreicht werden, bei dem
 *    sich der Balg zwischen mittlerer und vollständig geschlossener Stellung
 *    befindet. … Mittels eines Sforzandos kann der Bereich oberhalb von Forte
 *    gesteuert werden."
 *
 *   "Je näher der Nuancierbalg der vollständig geschlossenen Position ist, desto
 *    mehr verlangsamt sich auch der Anstieg eines Sforzandos. Durch die Kombination
 *    mit einem parallelen Crescendo an kann diese Verlangsamung verhindert werden."
 */
function leseregeln(params: Parameters, mezzoforte: number) {
  const held = run(params, 20, [punch("crescendo", "on", 300)]);
  const crescendoAlone = held.at(-1)!;

  const withSforzando = run(params, 20, [
    punch("crescendo", "on", 300),
    ...Array.from({ length: 14 }, (_, index) => punch("sforzando", "on", 400 + index * 90)),
  ]);

  // The sforzando's climb high up the travel, with the crescendo relay set and cancelled.
  const climbAbove = (crescendo: boolean): number => {
    const cues = [
      ...(crescendo ? [punch("crescendo", "on", 200)] : [punch("crescendo", "off", 200)]),
      ...Array.from({ length: 20 }, (_, index) => punch("sforzando", "on", 300 + index * 70)),
    ];
    const travel = run(params, 6, cues);
    const from = travel.findIndex((value) => value > 0.75);
    if (from < 0) return Number.NaN;
    const to = Math.min(from + Math.round(0.4 * ROWS_PER_SECOND), travel.length - 1);
    return (travel[to]! - travel[from]!) / 0.4;
  };

  return [
    {
      claim: "a crescendo alone settles between M.F. and fully closed",
      observed: crescendoAlone.toFixed(3),
      "M.F. face": mezzoforte.toFixed(3),
      forte: params.forte!.toFixed(3),
      holds: crescendoAlone > mezzoforte && crescendoAlone < params.forte! - 0.01 ? "yes" : "no",
    },
    {
      claim: "a sforzando reaches above what a crescendo alone can",
      observed: Math.max(...withSforzando).toFixed(3),
      "M.F. face": "",
      forte: crescendoAlone.toFixed(3),
      holds: Math.max(...withSforzando) > crescendoAlone + 0.01 ? "yes" : "no",
    },
    {
      claim: "a parallel crescendo removes the sforzando's slowdown high up",
      observed: `${climbAbove(true).toFixed(2)} /s with, ${climbAbove(false).toFixed(2)} /s without`,
      "M.F. face": "",
      forte: "",
      holds: climbAbove(true) > climbAbove(false) ? "yes" : "no",
    },
  ];
}

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function main(): void {
  const path = option("fit", "");
  const fits = path
    ? (JSON.parse(readFileSync(path, "utf8")) as { results: { half: Half; params: Parameters }[] }).results
    : [{ half: "bass" as Half, params: pneumaticModel.defaults }];

  fits.forEach(({ half, params: fitted }) => {
    const params = { ...pneumaticModel.defaults, ...fitted };
    const mezzoforte = params.mezzoforte! + params.mfThickness! / 2;
    const piano = params.piano!;
    console.log(`\n=== ${half}${path ? "" : " (model defaults)"} ===`);
    console.log(`piano ${piano.toFixed(3)}  M.F. face ${mezzoforte.toFixed(3)}  forte ${params.forte!.toFixed(3)}`);

    console.log("\ncontrol 4b — six short Sforzando-an pulses must climb from piano to mezzoforte in six steps");
    console.table(control4b(params, mezzoforte, piano));

    console.log("control 6a — a crescendo disturbed by five sforzando pairs must still close fully");
    console.table([control6a(params)]);

    console.log("control 6b — five short Sforzando-an pulses must each reach forte against the decay");
    console.table([control6b(params, params.forte!)]);

    console.log("control 6c — nine Sforzando an-ab pairs should hold at mezzoforte");
    console.log(" ", control6c(params).peaks);

    console.log("\ncontrol 7 — M.F. with crescendo and sforzando holds at mezzoforte, then releases to forte");
    console.table([control7(params, mezzoforte)]);

    console.log("control 3 — crescendo and decrescendo regulated to the same time");
    console.table([control3(params, mezzoforte, piano)]);

    console.log("Leseregeln — claims about the mechanism from the dissertation");
    console.table(leseregeln(params, mezzoforte));
  });
}

// Only when run as a command. These modules hold constants other code imports,
// and several of them start a fit or an ablation, so an import that ran them
// would quietly spend an hour of a machine.
if (import.meta.main) main();
