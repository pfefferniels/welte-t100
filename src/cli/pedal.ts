/**
 * Run the pedal mechanism over a roll and write it out as continuous MIDI.
 *
 *   node src/cli/pedal.ts [--druid D | --raw FILE.mid] [--out FILE]
 *                         [--mode continuous|switch] [--step N] [--csv FILE]
 *                         [--relay-lag-ms N] [--lift-ms N] [--fall-ms N]
 *                         [--shift-ms N] [--tied] [--sweep]
 *
 * `--druid` takes the roll from the tracer's own layout and runs on the grid of
 * the traced line; `--raw` takes any red Welte scan the Stanford image parser has
 * been over, and makes its own grid. Nothing here needs the traced line: the
 * pedals leave none.
 *
 * The MIDI it writes carries the roll's notes at a flat velocity and both pedal
 * controllers in full. Velocities are the nuancing model's business, not this
 * one's; `pedalMessages` is exported so whatever assembles the expressive file
 * can merge this controller stream into it rather than repeating the work.
 *
 * The table it prints is the point of the exercise. It counts the pedal changes
 * the roll asks for that the mechanism cannot complete before the next one
 * arrives, which are the only moments a red Welte holds its dampers anywhere
 * but at the two ends. `--sweep` runs that count across the range of travel
 * times the sources leave open, because the count is much more sensitive to
 * that number than the ramp itself is.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";

import { loadRoll } from "../roll/load.ts";
import { readRollFile, rollPorts } from "../roll/ports.ts";
import { halfPedalling, pedalDefaults, pedalSpans, runPedals, tiedToRise } from "../model/pedal.ts";
import { pedalMessages, type PedalMode } from "../midi/pedal.ts";
import { noteOff, noteOn, setTempo, trackName, writeSmf, type MidiTrack } from "../midi/write.ts";
import type { PedalInput, PedalTravel } from "../model/pedal.ts";
import type { Grid } from "../roll/grid.ts";
import type { Roll } from "../roll/timing.ts";
import type { Parameters } from "../model/types.ts";

const NOTE_TRACKS = [1, 2] as const;
const FLAT_VELOCITY = 64;

/** Travel budgets for `--sweep`, spanning what the sources leave open. */
const BUDGETS_MS = [100, 140, 180, 220, 260, 300, 360] as const;

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/**
 * The parameters as the command line leaves them: `--lift-ms 90` overrides
 * `liftMs`, and `--tied` imposes p. 107's regulation of throttle 17 afterwards,
 * so it wins over an explicit `--fall-ms`.
 */
function parameters(): Parameters {
  const dashed = (name: string): string => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  const given = Object.fromEntries(
    Object.entries(pedalDefaults).map(([name, value]) => [name, Number(option(dashed(name), String(value)))]),
  );
  return flag("tied") ? tiedToRise(given) : given;
}

function noteMessages(roll: Roll): MidiTrack {
  return NOTE_TRACKS.flatMap((index, channel) =>
    (roll.smf.tracks[index] ?? []).flatMap((event) => {
      if (event.kind === "note-on") return [noteOn(event.tick, channel, event.key, FLAT_VELOCITY)];
      return event.kind === "note-off" ? [noteOff(event.tick, channel, event.key)] : [];
    }),
  );
}

/** The time axis the model ran on, as a tempo map, so the output plays on it too. */
function tempoTrack(roll: Roll, name: string): MidiTrack {
  return [
    trackName(name),
    ...roll.timing.axis.segments.map((segment) =>
      setTempo(segment.tick, Math.round((roll.smf.division * 1e6) / segment.ticksPerSecond)),
    ),
  ];
}

/**
 * The two travels as CSV, one row wherever either changes at the controller's
 * own resolution. That is the same run-length encoding the MIDI carries, so the
 * file plots exactly what a renderer would receive and is no larger than it.
 */
function travelCsv(travel: PedalTravel, grid: Grid): string {
  const level = (value: number): number => Math.round(value * 127);
  const rows = [...travel.damper].flatMap((damper, index) => {
    const rail = travel.hammerRail[index]!;
    const changed =
      index === 0 ||
      level(damper) !== level(travel.damper[index - 1]!) ||
      level(rail) !== level(travel.hammerRail[index - 1]!);
    return changed
      ? [`${grid.seconds[index]!.toFixed(4)},${damper.toFixed(5)},${rail.toFixed(5)},${travel.damperLatch[index]}`]
      : [];
  });
  return ["seconds,damper,hammerRail,latch", ...rows].join("\n");
}

/**
 * The same count over a range of travel budgets. Hagmann gives no time for
 * either pedal, so the one defended in `docs/measurements.md` §13 is an argument and not a
 * measurement, and what it decides deserves to be seen varying. The relay keeps
 * a third of each budget throughout, which is the split the adjusters imply.
 */
function sweep(input: PedalInput): void {
  console.table(
    BUDGETS_MS.map((total) => {
      const relayLagMs = Math.round(total / 3);
      const bellowsMs = total - relayLagMs;
      const spans = pedalSpans(
        runPedals(input, { ...pedalDefaults, relayLagMs, liftMs: bellowsMs, fallMs: bellowsMs }),
        input.grid,
      );
      const summary = halfPedalling(spans);
      return {
        "travel (ms)": total,
        "relay / bellows": `${relayLagMs} / ${bellowsMs}`,
        "presses cut short": summary.unfinishedPresses,
        "lifts cut short": summary.unfinishedLifts,
        "dampers left up to": summary.deepestUnfinishedLift.toFixed(3),
      };
    }),
  );
}

type Source = { readonly name: string; readonly roll: Roll; readonly grid: Grid; readonly input: PedalInput };

/**
 * Either the tracer's own roll, on the grid of the line traced beside it, or any
 * red Welte scan the image parser has been over, on a grid of its own.
 */
function source(): Source {
  const raw = option("raw", "");
  if (raw !== "") {
    const parsed = rollPorts(readRollFile(raw, basename(raw)));
    return { name: basename(raw), roll: parsed.roll, grid: parsed.grid, input: parsed };
  }
  const druid = option("druid", "jq774vx6544");
  const loaded = loadRoll(druid);
  // Neither pedal belongs to a keyboard half, and `PedalInput` sees only the
  // grid and the ports, so which half is asked for here makes no difference.
  return { name: druid, roll: loaded.roll, grid: loaded.grid, input: loaded.inputFor("treble", "aperture") };
}

function main(): void {
  const mode = option("mode", "continuous") as PedalMode;
  const step = Number(option("step", "1"));

  const { name, roll, grid, input } = source();
  const outPath = option("out", `out/${name}-pedal.mid`);
  const params = parameters();

  const travel = runPedals(input, params);
  const spans = pedalSpans(travel, grid);
  const summary = halfPedalling(spans);
  const label = flag("tied") ? "pedal, fall tied to rise" : "pedal";

  console.log(`roll ${name}: ${grid.length} rows, ${grid.seconds.at(-1)!.toFixed(1)} s`);
  console.log(`${label}, ${JSON.stringify(params)}\n`);

  console.log(
    `damper: ${summary.presses} presses and ${summary.lifts} lifts asked for; ` +
      `${summary.unfinishedPresses} presses and ${summary.unfinishedLifts} lifts cut short`,
  );
  if (summary.unfinishedLifts > 0) {
    console.log(
      `        the deepest unfinished lift left the dampers ` +
        `${(summary.deepestUnfinishedLift * 100).toFixed(0)} % of the way up`,
    );
  }

  const lifts = spans.filter((span) => !span.down).toSorted((a, b) => a.milliseconds - b.milliseconds);
  console.log("\nthe eight shortest lifts the roll asks for:");
  console.table(
    lifts.slice(0, 8).map((span) => ({
      "at (s)": span.seconds.toFixed(1),
      "asked for (ms)": span.milliseconds.toFixed(0),
      "dampers reach": span.to.toFixed(3),
    })),
  );

  if (flag("sweep")) {
    console.log("across the travel times the sources leave open:");
    sweep(input);
  }

  // The traced grid opens some rows before the roll's first hole, so its first
  // rows have no tick of their own. Nothing has happened there — both pedals are
  // at rest — so they fold onto tick zero.
  const ticks = (index: number): number => Math.max(grid.rowAt(index) - roll.timing.firstHole, 0);
  const controllers = pedalMessages(travel, ticks, { mode, step, channel: 0 });
  const file = writeSmf(roll.smf.division, [
    tempoTrack(roll, `${name} ${label}`),
    noteMessages(roll),
    controllers,
  ]);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, file);
  console.log(`\n${controllers.length} controller messages, ${file.length} bytes -> ${outPath}`);

  const csvPath = option("csv", "");
  if (csvPath !== "") {
    mkdirSync(dirname(csvPath), { recursive: true });
    writeFileSync(csvPath, travelCsv(travel, grid));
    console.log(`travel -> ${csvPath}`);
  }
}

// Only when run as a command. These modules hold constants other code imports,
// and several of them start a fit or an ablation, so an import that ran them
// would quietly spend an hour of a machine.
if (import.meta.main) main();
