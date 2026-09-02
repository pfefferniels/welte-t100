/**
 * The traced Handnuancierung lines, as produced by `trace_roll.py`.
 *
 * `value` is the position on the roll's own printed scale: 0 at the half's P.P.
 * gridline, 0.5 at M.F., 1 at the shared F.F. line, piecewise linear through the
 * M.F. anchor. Nothing is clamped to that range.
 *
 * The flags decide what may be measured against. Only `ink` and `faint` are
 * sightings of the drawn line; `hole` means a punch has removed the paper under
 * it, `rule` that it coincides with a printed gridline and cannot be told apart
 * from it, `gap` that nothing was visible and the path was bridged. The last
 * three are the tracer's interpolation and carry no evidence, so they are
 * excluded from every metric.
 */

import { readFileSync } from "node:fs";
import { Grid } from "../roll/grid.ts";
import type { Half } from "../roll/expression.ts";

export const FLAGS = ["ink", "faint", "hole", "rule", "gap"] as const;
export type Flag = (typeof FLAGS)[number];

const FLAG_CODE: ReadonlyMap<string, number> = new Map(FLAGS.map((flag, index) => [flag, index]));
const OBSERVED = new Set<number>([FLAG_CODE.get("ink")!, FLAG_CODE.get("faint")!]);

export type TracedCurve = {
  readonly value: Float64Array;
  readonly x: Float64Array;
  readonly flag: Uint8Array;
  readonly observed: Uint8Array;
};

export type TracedCurves = {
  readonly grid: Grid;
  readonly bass: TracedCurve;
  readonly treble: TracedCurve;
};

export function flagName(code: number): Flag {
  return FLAGS[code] ?? "gap";
}

function emptyCurve(length: number): { value: Float64Array; x: Float64Array; flag: Uint8Array } {
  return { value: new Float64Array(length), x: new Float64Array(length), flag: new Uint8Array(length) };
}

/**
 * Rows the tracer saw, with sightings stranded inside unreadable stretches
 * dropped.
 *
 * A single `ink` row in the middle of a long `gap` is not a sighting of the
 * line. In the run-out of roll 3309, past the last expression code, the flags
 * are 54 % `gap` and 17 % `rule`, and the handful still marked `ink` or `faint`
 * are scattered isolated dots ranging over 0.3 scale units with no line between
 * them. Kept, they are 2 % of the scored rows and carry 8 % (Bass) and 13 %
 * (Discant) of the squared error, all of it against marks that are not the
 * drawn line.
 *
 * The rule is local rather than a hand-placed boundary on this roll: a sighting
 * counts only if its own neighbourhood was mostly readable.
 *
 * The risk in that is dropping good rows where punches are dense, since a `hole`
 * is unreadable for a quite different reason. It does not happen: of the 1271
 * (Bass) and 1033 (Discant) sightings dropped, the neighbourhood is dominated by
 * `gap` for 86 % and 96 % and by `rule` for 11 % and 4 %, and by `hole` for 3 %
 * and none.
 */
const CONTEXT_ROWS = 150;
const CONTEXT_SHARE = 0.5;

function withObserved(curve: { value: Float64Array; x: Float64Array; flag: Uint8Array }): TracedCurve {
  const seen = Uint8Array.from(curve.flag, (code) => (OBSERVED.has(code) ? 1 : 0));
  const running = new Int32Array(seen.length + 1);
  seen.forEach((v, i) => { running[i + 1] = running[i]! + v; });
  const near = (index: number): number => {
    const from = Math.max(0, index - CONTEXT_ROWS);
    const to = Math.min(seen.length, index + CONTEXT_ROWS + 1);
    return (running[to]! - running[from]!) / (to - from);
  };
  return { ...curve, observed: Uint8Array.from(seen, (v, i) => (v && near(i) >= CONTEXT_SHARE ? 1 : 0)) };
}

export function readTracedCurves(path: string): TracedCurves {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const header = (lines[0] ?? "").split(",");
  const column = (name: string): number => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`${path}: no column ${name}`);
    return index;
  };
  const [rowAt, bassX, bassValue, bassFlag, trebleX, trebleValue, trebleFlag] = [
    "y_px",
    "bass_x",
    "bass_value",
    "bass_flag",
    "treble_x",
    "treble_value",
    "treble_flag",
  ].map(column) as [number, number, number, number, number, number, number];
  const secondsAt = column("seconds");

  const body = lines.slice(1).filter((line) => line.length > 0);
  const seconds = new Float64Array(body.length);
  const bass = emptyCurve(body.length);
  const treble = emptyCurve(body.length);
  let startRow = 0;

  body.forEach((line, index) => {
    const cell = line.split(",");
    if (index === 0) startRow = Number(cell[rowAt]);
    seconds[index] = Number(cell[secondsAt]);
    bass.x[index] = Number(cell[bassX]);
    bass.value[index] = Number(cell[bassValue]);
    bass.flag[index] = FLAG_CODE.get(cell[bassFlag] ?? "gap") ?? FLAGS.length - 1;
    treble.x[index] = Number(cell[trebleX]);
    treble.value[index] = Number(cell[trebleValue]);
    treble.flag[index] = FLAG_CODE.get(cell[trebleFlag] ?? "gap") ?? FLAGS.length - 1;
  });

  return { grid: new Grid(startRow, seconds), bass: withObserved(bass), treble: withObserved(treble) };
}

export function halfOf(curves: TracedCurves, half: Half): TracedCurve {
  return half === "bass" ? curves.bass : curves.treble;
}
