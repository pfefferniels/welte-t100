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
import type { Roll } from "./timing.ts";
export type Half = "bass" | "treble";
/**
 * `windResistance` is Hagmann's *Widerstand ab/an* (Anhang 10, p. 178), the
 * two-speed control of the blower, which midi2exp and pianolatron both read as
 * the motor switch. On roll 3309 it is worked twenty-two times at musical
 * junctures, so it is plainly an expression device and not a transport control:
 * it changes the blower's output, and with it both the vacuum delivered to the
 * note pneumatics and the vacuum available in the relay to move the bellows.
 */
export type Control = "mezzoforte" | "crescendo" | "sforzando" | "hammerRail" | "sustainPedal" | "windResistance" | "rewind" | "electricCutoff";
export type Action = "on" | "off";
export type CodeMeaning = {
    readonly half: Half;
    readonly control: Control;
    readonly action: Action;
};
export declare function meaningOf(key: number): CodeMeaning | undefined;
/**
 * One hole in the paper as the tracker bar meets it: which port it serves, and
 * the first and last row of ink. No tracker-bar correction has been applied.
 * This is all the mechanism needs to know about a perforation.
 */
export type Punch = CodeMeaning & {
    readonly rowOn: number;
    readonly rowOff: number;
};
/**
 * A punch as a SUPRA scan records it: `tickOn`/`tickOff` are the same rows on
 * the MIDI's tick axis. Chains of punches that the image parser bridged into one
 * slot appear as a single perforation.
 */
export type Perforation = Punch & {
    readonly key: number;
    readonly tickOn: number;
    readonly tickOff: number;
    readonly secondsOn: number;
    readonly secondsOff: number;
};
export declare function perforations(roll: Roll): Perforation[];
export declare function noteOnsets(roll: Roll, half: Half): number[];
