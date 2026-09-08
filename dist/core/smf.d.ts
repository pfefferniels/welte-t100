/**
 * A standard MIDI file reader, enough of one for Stanford's SUPRA roll scans.
 *
 * Those files are format 1, one tick per pixel row of the scan, with the roll's
 * metadata in text meta events and the take-up spool's acceleration in the
 * tempo map of track 0.
 */
export type MetaEvent = {
    readonly kind: "meta";
    readonly tick: number;
    readonly type: number;
    readonly data: Uint8Array;
};
export type NoteEvent = {
    readonly kind: "note-on" | "note-off";
    readonly tick: number;
    readonly channel: number;
    readonly key: number;
    readonly velocity: number;
};
export type TrackEvent = MetaEvent | NoteEvent;
export type SmfFile = {
    readonly format: number;
    readonly division: number;
    readonly tracks: readonly (readonly TrackEvent[])[];
};
export declare function parseSmf(data: Uint8Array): SmfFile;
