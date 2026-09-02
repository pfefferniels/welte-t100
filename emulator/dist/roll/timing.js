/**
 * The roll's own time axis.
 *
 * In a SUPRA raw MIDI one tick is one pixel row of the scan and tick zero is the
 * row named by `@FIRST_HOLE`. Seconds are not proportional to ticks, because the
 * take-up spool fills as the roll plays and the paper runs faster for it. Two
 * readings of that acceleration are available here.
 *
 * `spoolAxis` is the default and is Gottschewski's, derived in `spool.ts` from
 * the spool's geometry and his measurements of it. `scanAxis` is the tempo map
 * the SUPRA file carries on track 0, one event every 3600 ticks, which compounds
 * the speed by a constant 0.22 % per foot from an undocumented constant that
 * midi2exp used before 2021 (`docs/prior-art.md` §E.3). The two agree on this
 * roll to within 1.6 % of the local step and 0.7 % of the total duration, so the
 * choice is a question of provenance rather than of fit.
 */
import { parseSmf } from "./smf.js";
import { paperSeconds, WELTE_SPOOL } from "./spool.js";
const SET_TEMPO = 0x51;
const TEXT_META = new Set([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
const METADATA_LINE = /^@([A-Z_]+):\s*(.*)$/;
const CM_PER_INCH = 2.54;
/** Roughly a foot of paper, and the step the SUPRA maps themselves are written at. */
const SEGMENT_TICKS = 3600;
/** The scan's own tempo map, read as it stands. */
export function scanAxis(segments) {
    const segmentAt = (tick) => {
        const found = segments.findLastIndex((segment) => segment.tick <= tick);
        return segments[Math.max(found, 0)];
    };
    return {
        name: "scan tempo map",
        segments,
        secondsAtTick(tick) {
            const segment = segmentAt(tick);
            return segment.seconds + (tick - segment.tick) / segment.ticksPerSecond;
        },
    };
}
/**
 * The paper speed the take-up spool sets, evaluated in closed form at every tick.
 * The segments are that same curve sampled for export, so a file written from
 * them plays on the axis the model ran on.
 */
export function spoolAxis(spool, pixelsPerInch, lengthTicks) {
    const secondsAtTick = (tick) => paperSeconds(spool, (tick / pixelsPerInch) * CM_PER_INCH);
    const steps = Math.max(Math.ceil(lengthTicks / SEGMENT_TICKS), 1);
    return {
        name: `spool, ${spool.circumferenceCm} cm at ${spool.circumferenceEffect * 100} % effect`,
        segments: Array.from({ length: steps }, (_, index) => {
            const tick = index * SEGMENT_TICKS;
            return {
                tick,
                seconds: secondsAtTick(tick),
                ticksPerSecond: SEGMENT_TICKS / (secondsAtTick(tick + SEGMENT_TICKS) - secondsAtTick(tick)),
            };
        }),
        secondsAtTick,
    };
}
export class RollTiming {
    firstHole;
    division;
    axis;
    constructor(firstHole, division, axis) {
        this.firstHole = firstHole;
        this.division = division;
        this.axis = axis;
    }
    secondsAtTick(tick) {
        return this.axis.secondsAtTick(tick);
    }
    secondsAtRow(row) {
        return this.secondsAtTick(row - this.firstHole);
    }
    rowAtTick(tick) {
        return tick + this.firstHole;
    }
}
function decodeText(event) {
    if (event.kind !== "meta" || !TEXT_META.has(event.type))
        return undefined;
    return new TextDecoder().decode(event.data).trim();
}
function rollMetadata(events) {
    const pairs = events
        .map(decodeText)
        .map((line) => line?.match(METADATA_LINE))
        .filter((match) => match !== null && match !== undefined)
        .map((match) => [match[1], match[2].trim()]);
    return new Map(pairs);
}
function tempoMap(events, division) {
    const changes = events
        .filter((event) => event.kind === "meta" && event.type === SET_TEMPO)
        .map((event) => {
        const data = event.data;
        const microsPerQuarter = (data[0] << 16) | (data[1] << 8) | data[2];
        return { tick: event.tick, ticksPerSecond: (division * 1e6) / microsPerQuarter };
    })
        .sort((a, b) => a.tick - b.tick);
    return changes.reduce((segments, change) => {
        const previous = segments.at(-1);
        const seconds = previous
            ? previous.seconds + (change.tick - previous.tick) / previous.ticksPerSecond
            : 0;
        return [...segments, { ...change, seconds }];
    }, []);
}
/** A pixel measurement such as `"16482px"`, as a number. */
export function pixels(value) {
    return Number.parseFloat((value ?? "").replace(/px$/, ""));
}
/** A scan resolution such as `"300.25ppi"`, in pixel rows per inch of paper. */
export function pixelsPerInch(value) {
    return Number.parseFloat((value ?? "").replace(/ppi$/, ""));
}
function lastTick(smf) {
    return smf.tracks.flat().reduce((latest, event) => Math.max(latest, event.tick), 0);
}
function axisOf(choice, smf, metadata) {
    if (choice === "scan")
        return scanAxis(tempoMap(smf.tracks[0] ?? [], smf.division));
    const resolution = pixelsPerInch(metadata.get("LENGTH_DPI"));
    if (!Number.isFinite(resolution)) {
        throw new Error("the roll gives no @LENGTH_DPI, so a pixel row is of unknown length in paper");
    }
    return spoolAxis(choice, resolution, lastTick(smf));
}
export function readRoll(druid, data, axis = WELTE_SPOOL) {
    const smf = parseSmf(data);
    const metadata = rollMetadata(smf.tracks.flat());
    const timing = new RollTiming(pixels(metadata.get("FIRST_HOLE")), smf.division, axisOf(axis, smf, metadata));
    return { druid, metadata, timing, smf };
}
