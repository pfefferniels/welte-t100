/**
 * Bundle one roll for the overlay viewer: the drawn lines, a fitted model's
 * output for both halves, the punched code and the numbers that go with them.
 *
 *   node src/cli/export-view.ts [--druid D] [--fit FILE] [--out FILE]
 *
 * Four series of two hundred thousand samples are far too much as JSON text, so
 * each is quantised to Uint16 over its own range, the sections are laid end to
 * end in one buffer and that buffer is base64'd into a single assignment. Every
 * range and step travels with the bundle, so the viewer inverts the
 * quantisation rather than guessing at it, and each section carries the worst
 * reconstruction error it actually incurs.
 *
 * The time axis is stored as the residual from a straight ramp between the first
 * and last second. The roll accelerates by about five seconds over its length,
 * so that residual fits Uint16 at well under a tenth of a millisecond.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { loadRoll } from "../roll/load.js";
import { FLAGS, halfOf } from "../truth/curves.js";
import { agreement } from "../eval/metrics.js";
import { alternatingBlocks } from "../eval/split.js";
import { midi2expModel } from "../model/midi2exp.js";
import { pneumaticModel } from "../model/pneumatic.js";
import { clamp } from "../model/types.js";
const MODELS = new Map([
    [midi2expModel.name, midi2expModel],
    [pneumaticModel.name, pneumaticModel],
]);
const HALVES = ["bass", "treble"];
const ACTIONS = ["on", "off"];
const LEVELS = 65535;
function option(name, fallback) {
    const at = process.argv.indexOf(`--${name}`);
    return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}
function scaleOver(values) {
    const min = values.reduce((low, value) => Math.min(low, value), Number.POSITIVE_INFINITY);
    const max = values.reduce((high, value) => Math.max(high, value), Number.NEGATIVE_INFINITY);
    const span = max - min;
    return { min, step: span > 0 ? span / LEVELS : 1 };
}
function quantise(values, scale) {
    return Uint16Array.from(values, (value) => clamp(Math.round((value - scale.min) / scale.step), 0, LEVELS));
}
function worstError(values, scale, codes) {
    const error = (value, index) => Math.abs(scale.min + scale.step * codes[index] - value);
    return values.reduce((worst, value, index) => Math.max(worst, error(value, index)), 0);
}
/** Appends sections to one buffer and reports where each of them landed. */
function collector() {
    const parts = [];
    let length = 0;
    return {
        add(view) {
            const at = length;
            parts.push(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
            length += view.byteLength;
            return at;
        },
        concat() {
            const whole = new Uint8Array(length);
            parts.reduce((at, part) => {
                whole.set(part, at);
                return at + part.byteLength;
            }, 0);
            return whole;
        },
    };
}
function packSeries(pack, values) {
    const scale = scaleOver(values);
    const codes = quantise(values, scale);
    return { ...scale, bytes: pack.add(codes), maxError: worstError(values, scale, codes) };
}
/** The straight line between first and last sample, which the roll's acceleration departs from. */
function ramp(seconds) {
    const base = seconds[0];
    const slope = (seconds.at(-1) - base) / (seconds.length - 1);
    return { base, slope, residual: Float64Array.from(seconds, (value, index) => value - (base + slope * index)) };
}
function punchTable(punches) {
    const controls = [...new Set(punches.map((punch) => punch.control))].sort();
    return {
        controls,
        halves: HALVES,
        actions: ACTIONS,
        half: punches.map((punch) => HALVES.indexOf(punch.half)),
        control: punches.map((punch) => controls.indexOf(punch.control)),
        action: punches.map((punch) => ACTIONS.indexOf(punch.action)),
        rowOn: punches.map((punch) => punch.rowOn),
        rowOff: punches.map((punch) => punch.rowOff),
    };
}
function readFit(path) {
    return path ? JSON.parse(readFileSync(path, "utf8")) : {};
}
/**
 * A fit written before a parameter existed leaves it out, so the model's own
 * default stands in and the substitution is recorded with the bundle.
 */
function parametersFor(model, fit, half) {
    const fitted = fit.results?.find((result) => result.half === half)?.params ?? {};
    return {
        params: { ...model.defaults, ...fitted },
        fromDefaults: model.spec.map((entry) => entry.name).filter((name) => !(name in fitted)),
    };
}
function halfBundle(loaded, model, fit, ports, pack, half) {
    const truth = halfOf(loaded.curves, half);
    const { params, fromDefaults } = parametersFor(model, fit, half);
    const output = model.run(loaded.inputFor(half, ports), params);
    const split = alternatingBlocks(loaded.grid, truth.observed);
    return {
        drawn: packSeries(pack, truth.value),
        model: packSeries(pack, output),
        params,
        fromDefaults,
        agreement: {
            all: agreement(output, truth.value, truth.observed),
            train: agreement(output, truth.value, split.train),
            test: agreement(output, truth.value, split.test),
        },
    };
}
function main() {
    const fitPath = option("fit", "");
    const fit = readFit(fitPath);
    const druid = option("druid", fit.druid ?? "jq774vx6544");
    const ports = option("ports", fit.ports ?? "aperture");
    const out = option("out", "view/data.js");
    const model = MODELS.get(option("model", fit.model ?? pneumaticModel.name));
    if (!model)
        throw new Error(`unknown model; have ${[...MODELS.keys()].join(", ")}`);
    if (!fitPath)
        console.error("no --fit given: exporting the model's default parameters");
    const loaded = loadRoll(druid);
    const grid = loaded.grid;
    const pack = collector();
    const time = ramp(grid.seconds);
    const seconds = { base: time.base, slope: time.slope, ...packSeries(pack, time.residual) };
    const halves = {
        bass: halfBundle(loaded, model, fit, ports, pack, "bass"),
        treble: halfBundle(loaded, model, fit, ports, pack, "treble"),
    };
    // The flags are bytes and follow every Uint16 section, so those stay two-byte
    // aligned and the viewer can take plain typed-array views into the buffer.
    const flags = {
        bass: pack.add(loaded.curves.bass.flag),
        treble: pack.add(loaded.curves.treble.flag),
    };
    const buffer = pack.concat();
    const bundle = {
        format: 1,
        druid,
        label: loaded.roll.metadata.get("LABEL") ?? druid,
        composer: loaded.roll.metadata.get("COMPOSER") ?? "",
        performer: loaded.roll.metadata.get("PERFORMER") ?? "",
        model: model.name,
        modelSummary: model.summary,
        spec: model.spec,
        ports,
        fit: fitPath,
        rows: grid.length,
        startRow: grid.startRow,
        levels: LEVELS,
        seconds,
        flagNames: FLAGS,
        observedFlags: ["ink", "faint"],
        halves,
        flags,
        punches: punchTable(loaded.perforations),
        buffer: Buffer.from(buffer).toString("base64"),
    };
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `window.NUANCE_DATA = ${JSON.stringify(bundle)};\n`);
    const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    console.error(`${grid.length} rows, ${loaded.perforations.length} perforations`);
    console.error(`time axis exact to ${(seconds.maxError * 1000).toFixed(4)} ms`);
    HALVES.forEach((half) => {
        const entry = halves[half];
        console.error(`${half}: test rmse ${entry.agreement.test.rmse.toFixed(4)}, r ${entry.agreement.test.correlation.toFixed(3)}` +
            (entry.fromDefaults.length > 0 ? `, defaults for ${entry.fromDefaults.join(", ")}` : ""));
    });
    console.error(`wrote ${out}: ${megabytes(buffer.byteLength)} packed, ${megabytes(statSync(out).size)} on disk`);
}
main();
