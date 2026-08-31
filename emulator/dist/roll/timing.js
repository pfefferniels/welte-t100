/**
 * The roll's own time axis.
 *
 * In a SUPRA raw MIDI one tick is one pixel row of the scan and tick zero is the
 * row named by `@FIRST_HOLE`. Track 0 carries a tempo event every 3600 ticks;
 * those model the take-up spool filling, so the paper accelerates and seconds
 * are not proportional to ticks. Reading the map is free and correct, so nothing
 * here assumes a constant speed.
 */
import { parseSmf } from "./smf.js";
const SET_TEMPO = 0x51;
const TEXT_META = new Set([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
const METADATA_LINE = /^@([A-Z_]+):\s*(.*)$/;
export class RollTiming {
    firstHole;
    division;
    segments;
    constructor(firstHole, division, segments) {
        this.firstHole = firstHole;
        this.division = division;
        this.segments = segments;
    }
    /** Index of the last segment starting at or before `tick`; 0 for ticks before the map. */
    #segmentAt(tick) {
        const found = this.segments.findLastIndex((segment) => segment.tick <= tick);
        return this.segments[Math.max(found, 0)];
    }
    secondsAtTick(tick) {
        const segment = this.#segmentAt(tick);
        return segment.seconds + (tick - segment.tick) / segment.ticksPerSecond;
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
export function readRoll(druid, data) {
    const smf = parseSmf(data);
    const metadata = rollMetadata(smf.tracks.flat());
    const timing = new RollTiming(pixels(metadata.get("FIRST_HOLE")), smf.division, tempoMap(smf.tracks[0] ?? [], smf.division));
    return { druid, metadata, timing, smf };
}
