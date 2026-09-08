/**
 * The punched expression code of a red Welte (T-100) roll.
 *
 * Ten tracker holes at each edge of the paper carry the dynamics. Hagmann
 * describes them as six openings per half for the nuancing proper, ordered so
 * that each function's cancel line precedes its set line across the glide
 * block, plus the pedal and motor lines. Stanford's roll-image-parser maps them
 * onto MIDI keys 14..23 (bass) and 104..113 (treble), mirrored, and puts them on
 * tracks 3 and 4 of the raw file.
 */
import { aperturePorts as portsOf, slots as slotsOf, DEFAULT_GEOMETRY, } from "../core/aperture.js";
import { portKey as joinKey, portSeries } from "../core/ports.js";
import { shiftedByDriftingRows } from "../core/types.js";
export { HALVES } from "../core/types.js";
const BASS_CODES = new Map([
    [14, ["mezzoforte", "off"]],
    [15, ["mezzoforte", "on"]],
    [16, ["crescendo", "off"]],
    [17, ["crescendo", "on"]],
    [18, ["sforzando", "off"]],
    [19, ["sforzando", "on"]],
    [20, ["hammerRail", "off"]],
    [21, ["hammerRail", "on"]],
    [22, ["windResistance", "off"]],
    [23, ["windResistance", "on"]],
]);
const TREBLE_CODES = new Map([
    [104, ["rewind", "on"]],
    [105, ["electricCutoff", "on"]],
    [106, ["sustainPedal", "on"]],
    [107, ["sustainPedal", "off"]],
    [108, ["sforzando", "on"]],
    [109, ["sforzando", "off"]],
    [110, ["crescendo", "on"]],
    [111, ["crescendo", "off"]],
    [112, ["mezzoforte", "on"]],
    [113, ["mezzoforte", "off"]],
]);
export function meaningOf(key) {
    const bass = BASS_CODES.get(key);
    if (bass)
        return { half: "bass", control: bass[0], action: bass[1] };
    const treble = TREBLE_CODES.get(key);
    if (treble)
        return { half: "treble", control: treble[0], action: treble[1] };
    return undefined;
}
const EXPRESSION_TRACKS = [3, 4];
function pairNotes(events) {
    const open = new Map();
    return events.flatMap((event) => {
        if (event.kind === "note-on") {
            open.set(event.key, event.tick);
            return [];
        }
        if (event.kind !== "note-off")
            return [];
        const tickOn = open.get(event.key);
        if (tickOn === undefined)
            return [];
        open.delete(event.key);
        return [{ key: event.key, tickOn, tickOff: event.tick }];
    });
}
export function portKey(half, control, action) {
    return joinKey(half, control, action);
}
/** A punch named for the port it opens, which is all the aperture geometry needs. */
const punchAt = (punch) => ({
    key: portKey(punch.half, punch.control, punch.action),
    rowOn: punch.rowOn,
    rowOff: punch.rowOff,
});
/** Perforations of one port that touch or overlap are one slot in the paper. */
export function slots(punches) {
    return slotsOf(punches.map(punchAt));
}
/** Continuous open fraction per grid row, keyed by half, control and action. */
export function aperturePorts(grid, punches, geometry = DEFAULT_GEOMETRY) {
    return portsOf(grid, punches.map(punchAt), geometry);
}
export function portOf(input, control, action) {
    return portSeries(input.ports, portKey(input.half, control, action), input.grid.length);
}
/**
 * The port as the mechanism saw it, slid along the paper.
 *
 * The drawn line runs ahead of the punches, and by different amounts for
 * different codes: measured on roll 3309 the sforzando-on code sits 5.8 ms
 * (bass) and 10.7 ms (treble) later than the sforzando-off code, both sharp
 * enough to place, and the crescendo codes tens of milliseconds earlier again.
 * Fitted on the six lined rolls, each of the two relative offsets keeps that
 * sign on nine of the twelve halves, the rest undecided between seeds.
 * One offset for the whole half therefore mis-places most of the roll. Sliding
 * each port by its own amount is also the right place to do it: the offset
 * belongs to how the paper was laid out, which is an input to the mechanism, not
 * something the mechanism does.
 */
export function shiftedPortOf(input, control, action, rows, drift) {
    return shiftedByDriftingRows(portOf(input, control, action), rows, drift);
}
export function halfLabel(half) {
    return half === "bass" ? "Bass" : "Diskant";
}
export function perforations(roll) {
    const fromTracks = EXPRESSION_TRACKS.flatMap((index) => pairNotes(roll.smf.tracks[index] ?? []));
    return fromTracks
        .flatMap((note) => {
        const meaning = meaningOf(note.key);
        return meaning
            ? [
                {
                    ...meaning,
                    key: note.key,
                    tickOn: note.tickOn,
                    tickOff: note.tickOff,
                    rowOn: roll.timing.rowAtTick(note.tickOn),
                    rowOff: roll.timing.rowAtTick(note.tickOff),
                    secondsOn: roll.timing.secondsAtTick(note.tickOn),
                    secondsOff: roll.timing.secondsAtTick(note.tickOff),
                },
            ]
            : [];
    })
        .sort((a, b) => a.tickOn - b.tickOn || a.key - b.key);
}
