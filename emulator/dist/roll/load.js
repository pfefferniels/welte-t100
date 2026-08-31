/**
 * Everything one roll needs, assembled: the punched code, the drawn curves, and
 * the grid they share. Paths follow the tracer's own layout one directory up.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readRoll } from "./timing.js";
import { noteOnsets, perforations } from "./expression.js";
import { aperturePorts, binaryPorts, DEFAULT_GEOMETRY } from "./aperture.js";
import { readTracedCurves } from "../truth/curves.js";
import { Grid } from "./grid.js";
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
/** Note onsets per second, in a window centred on each row. */
function noteDensity(grid, timing, onsets, windowSeconds = 0.5) {
    const counts = new Float64Array(grid.length);
    onsets.forEach((tick) => {
        const index = grid.indexOfRow(timing.rowAtTick(tick));
        counts[index] = counts[index] + 1;
    });
    const prefix = new Float64Array(grid.length + 1);
    counts.forEach((count, index) => {
        prefix[index + 1] = prefix[index] + count;
    });
    const span = grid.seconds.at(-1) - grid.seconds[0];
    const halfWindow = Math.max(Math.round(((windowSeconds / 2) * (grid.length - 1)) / span), 1);
    return Float64Array.from(counts, (_, index) => {
        const low = Math.max(index - halfWindow, 0);
        const high = Math.min(index + halfWindow, grid.length - 1);
        const seconds = grid.seconds[high] - grid.seconds[low];
        return seconds > 0 ? (prefix[high + 1] - prefix[low]) / seconds : 0;
    });
}
export function loadRoll(druid) {
    const roll = readRoll(druid, readFileSync(join(REPO, "cache", druid, `${druid}_raw.mid`)));
    const curves = readTracedCurves(join(REPO, "out", druid, "curves.csv"));
    const punches = perforations(roll);
    const grid = curves.grid;
    const portCache = new Map();
    const densityCache = new Map();
    const densityFor = (which) => {
        const held = densityCache.get(which);
        if (held)
            return held;
        const onsets = which === "both" ? [...noteOnsets(roll, "bass"), ...noteOnsets(roll, "treble")] : noteOnsets(roll, which);
        const made = noteDensity(grid, roll.timing, onsets);
        densityCache.set(which, made);
        return made;
    };
    return {
        roll,
        curves,
        perforations: punches,
        grid,
        inputFor(half, portModel, geometry = DEFAULT_GEOMETRY) {
            const cacheKey = `${portModel}:${geometry.punchDiameterPx}:${geometry.trackerDiameterPx}`;
            const ports = portCache.get(cacheKey) ??
                (portModel === "aperture" ? aperturePorts(grid, punches, geometry) : binaryPorts(grid, punches, geometry));
            portCache.set(cacheKey, ports);
            return { grid, half, ports, noteDensity: densityFor(half), totalNoteDensity: densityFor("both") };
        },
        inputOver(half, punches, portModel) {
            const build = portModel === "aperture" ? aperturePorts : binaryPorts;
            return {
                grid,
                half,
                ports: build(grid, punches, DEFAULT_GEOMETRY),
                noteDensity: densityFor(half),
                totalNoteDensity: densityFor("both"),
            };
        },
    };
}
/**
 * The whole punched code slid along the roll and wrapped round, so every
 * statistic of it survives and only its alignment with the drawn line is gone.
 * Whatever a model still scores against this is what its own shape buys it
 * rather than what it reads off the punches.
 */
export function circularShift(punches, rows, span) {
    const [first, last] = span;
    const length = last - first;
    const wrap = (row) => first + (((row - first + rows) % length) + length) % length;
    return punches
        .map((punch) => {
        const rowOn = wrap(punch.rowOn);
        const shift = rowOn - punch.rowOn;
        return {
            ...punch,
            rowOn,
            rowOff: punch.rowOff + shift,
            tickOn: punch.tickOn + shift,
            tickOff: punch.tickOff + shift,
        };
    })
        .sort((a, b) => a.rowOn - b.rowOn);
}
