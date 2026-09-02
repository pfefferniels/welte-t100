/**
 * A standard MIDI file writer, the counterpart of the reader in `roll/smf.ts`.
 *
 * Format 1, one track chunk per track, no running status. The emulator reads a
 * SUPRA scan whose tick is a pixel row and whose tempo map carries the spool's
 * acceleration; writing the same division and the same map back out keeps the
 * output on the roll's own time axis, so a tick in and a tick out mean the same
 * pixel row of the same scan.
 */
export type MidiMessage = {
    readonly tick: number;
    readonly bytes: readonly number[];
};
export type MidiTrack = readonly MidiMessage[];
export declare function noteOn(tick: number, channel: number, key: number, velocity: number): MidiMessage;
export declare function noteOff(tick: number, channel: number, key: number): MidiMessage;
export declare function controlChange(tick: number, channel: number, controller: number, value: number): MidiMessage;
export declare function setTempo(tick: number, microsPerQuarter: number): MidiMessage;
export declare function trackName(name: string): MidiMessage;
export declare function writeSmf(division: number, tracks: readonly MidiTrack[]): Uint8Array;
