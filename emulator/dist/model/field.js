/**
 * The velocity field read straight off the drawn line, with no functional form
 * assumed.
 *
 * The pneumatic model claims that the bellows' speed is fixed by which valves
 * are open and how far it still has to travel. That claim can be tested without
 * committing to a flow law at all: bin the drawn line by valve state and by
 * position, take the mean observed speed in each bin, and then run that table
 * forward as if it were the model. Nothing is fitted except a few scalars, and
 * the table is built from the training blocks only.
 *
 * What comes out is an upper bound. If the field model beats the pneumatic one
 * by a wide margin, the flow law is wrong and worth changing; if the two are
 * close, the remaining error is not in the functional form but in the state —
 * something the mechanism responds to that the punched code does not carry.
 */
import { latched, momentary, portOf, TRIP_THRESHOLD } from "./latch.js";
import { limitAtStop, newStopState } from "./stop.js";
import { clamp, shiftedByRows, simulate, } from "./types.js";
export const REGIMES = ["quiescent", "crescendo", "sforzando", "release"];
const BINS = 24;
const LOW = -0.1;
const HIGH = 1.1;
/** Half-width, in scan rows, of the difference the speed is measured over. */
const DERIVATIVE_HALFWIDTH = 4;
function binOf(x) {
    return clamp(Math.floor(((x - LOW) / (HIGH - LOW)) * BINS), 0, BINS - 1);
}
function binCentre(bin) {
    return LOW + ((bin + 0.5) / BINS) * (HIGH - LOW);
}
/** Which valve state each row is in. A cancelling sforzando punch outranks the rest. */
export function regimesOf(input) {
    const crescendo = latched(portOf(input, "crescendo", "on"), portOf(input, "crescendo", "off"));
    const sforzando = latched(portOf(input, "sforzando", "on"), portOf(input, "sforzando", "off"));
    const releasing = momentary(portOf(input, "sforzando", "off"), TRIP_THRESHOLD);
    return Uint8Array.from(crescendo, (isCrescendo, index) => releasing[index] ? 3 : sforzando[index] ? 2 : isCrescendo ? 1 : 0);
}
export function estimateField(input, truth, mask) {
    const regimes = regimesOf(input);
    const total = new Float64Array(REGIMES.length * BINS);
    const count = new Float64Array(REGIMES.length * BINS);
    const { seconds } = input.grid;
    const width = DERIVATIVE_HALFWIDTH;
    for (let index = width; index + width < truth.value.length; index += 1) {
        if (!mask[index] || !truth.observed[index - width] || !truth.observed[index + width])
            continue;
        const span = seconds[index + width] - seconds[index - width];
        if (span <= 0)
            continue;
        const speed = (truth.value[index + width] - truth.value[index - width]) / span;
        const cell = regimes[index] * BINS + binOf(truth.value[index]);
        total[cell] = total[cell] + speed;
        count[cell] = count[cell] + 1;
    }
    return {
        mean: Float64Array.from(total, (sum, cell) => (count[cell] > 0 ? sum / count[cell] : 0)),
        count,
        bins: BINS,
    };
}
/**
 * The table with every empty bin filled from its nearest populated neighbour, so
 * that a simulation wandering outside the range the drawn line ever visited still
 * has a speed to read. Done once rather than per step.
 */
function filled(field) {
    const table = Float64Array.from(field.mean);
    REGIMES.forEach((_, regime) => {
        const populated = Array.from({ length: BINS }, (_, bin) => bin).filter((bin) => field.count[regime * BINS + bin] > 0);
        if (populated.length === 0)
            return;
        Array.from({ length: BINS }, (_, bin) => bin)
            .filter((bin) => field.count[regime * BINS + bin] === 0)
            .forEach((bin) => {
            const nearest = populated.reduce((best, other) => Math.abs(other - bin) < Math.abs(best - bin) ? other : best);
            table[regime * BINS + bin] = field.mean[regime * BINS + nearest];
        });
    });
    return table;
}
/** Linear interpolation between bin centres, held flat outside the populated range. */
function speedAt(table, regime, x) {
    const position = ((x - LOW) / (HIGH - LOW)) * BINS - 0.5;
    const low = clamp(Math.floor(position), 0, BINS - 1);
    const high = clamp(low + 1, 0, BINS - 1);
    const weight = clamp(position - low, 0, 1);
    return table[regime * BINS + low] * (1 - weight) + table[regime * BINS + high] * weight;
}
const SPEC = [
    { name: "start", lower: -0.2, upper: 1.2, unit: "scale", note: "where the bellows sits at the first row" },
    { name: "piano", lower: -0.25, upper: 0.2, unit: "scale", note: "fully open rail" },
    { name: "forte", lower: 0.8, upper: 1.25, unit: "scale", note: "fully closed rail" },
    { name: "mezzoforte", lower: 0.25, upper: 0.8, unit: "scale", note: "level of the Mezzoforte pin" },
    { name: "inertiaMs", lower: 0, upper: 400, unit: "ms", note: "smoothing of the velocity" },
    { name: "leadRows", lower: -260, upper: 260, unit: "scan rows", note: "shift along the paper" },
    { name: "gain", lower: 0.5, upper: 1.5, unit: "1", note: "overall scaling of the measured speeds" },
];
export function fieldModel(field) {
    const table = filled(field);
    const run = (input, params) => {
        const p = params;
        const regimes = regimesOf(input);
        const isMf = latched(portOf(input, "mezzoforte", "on"), portOf(input, "mezzoforte", "off"));
        const mezzoforte = p.mezzoforte;
        const advance = (state, index) => {
            const dt = input.grid.dt[index];
            const target = p.gain * speedAt(table, regimes[index], state.x);
            const smoothing = p.inertiaMs > 0 ? Math.exp((-dt * 1000) / p.inertiaMs) : 0;
            state.velocity = target + (state.velocity - target) * smoothing;
            const moved = state.x + state.velocity * dt;
            const held = limitAtStop(state.stop, isMf[index] === 1, state.x, moved, mezzoforte, false);
            const next = clamp(held, p.piano, p.forte);
            if (next !== moved)
                state.velocity = 0;
            state.x = next;
            return next;
        };
        const travel = simulate(input.grid.length, { x: p.start, velocity: 0, stop: newStopState() }, advance);
        return shiftedByRows(travel, p.leadRows);
    };
    return {
        name: "field",
        summary: "Speeds binned by valve state and position, run forward as a model.",
        spec: SPEC,
        defaults: { start: 0.15, piano: 0, forte: 1, mezzoforte: 0.58, inertiaMs: 30, leadRows: -60, gain: 1 },
        run,
    };
}
