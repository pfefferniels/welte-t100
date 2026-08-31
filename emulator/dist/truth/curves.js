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
import { Grid } from "../roll/grid.js";
export const FLAGS = ["ink", "faint", "hole", "rule", "gap"];
const FLAG_CODE = new Map(FLAGS.map((flag, index) => [flag, index]));
const OBSERVED = new Set([FLAG_CODE.get("ink"), FLAG_CODE.get("faint")]);
export function flagName(code) {
    return FLAGS[code] ?? "gap";
}
function emptyCurve(length) {
    return { value: new Float64Array(length), x: new Float64Array(length), flag: new Uint8Array(length) };
}
function withObserved(curve) {
    return { ...curve, observed: Uint8Array.from(curve.flag, (code) => (OBSERVED.has(code) ? 1 : 0)) };
}
export function readTracedCurves(path) {
    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    const header = (lines[0] ?? "").split(",");
    const column = (name) => {
        const index = header.indexOf(name);
        if (index < 0)
            throw new Error(`${path}: no column ${name}`);
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
    ].map(column);
    const secondsAt = column("seconds");
    const body = lines.slice(1).filter((line) => line.length > 0);
    const seconds = new Float64Array(body.length);
    const bass = emptyCurve(body.length);
    const treble = emptyCurve(body.length);
    let startRow = 0;
    body.forEach((line, index) => {
        const cell = line.split(",");
        if (index === 0)
            startRow = Number(cell[rowAt]);
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
export function halfOf(curves, half) {
    return half === "bass" ? curves.bass : curves.treble;
}
