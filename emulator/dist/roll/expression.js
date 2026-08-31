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
export function noteOnsets(roll, half) {
    const track = roll.smf.tracks[half === "bass" ? 1 : 2] ?? [];
    return track.filter((event) => event.kind === "note-on").map((event) => event.tick);
}
