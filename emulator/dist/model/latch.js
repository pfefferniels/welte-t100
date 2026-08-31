/**
 * Set/cancel pairs, as the relay's memory valves behave.
 *
 * Crescendo and Mezzoforte are held by a double valve that stays where it was
 * put until the cancelling line is read; the perforation only has to be long
 * enough to trip it. So what matters is when the port first opens far enough,
 * not how long it stays open.
 */
import { portKey, portSeries } from "../roll/aperture.js";
export const TRIP_THRESHOLD = 0.05;
export function portOf(input, control, action) {
    return portSeries(input.ports, portKey(input.half, control, action), input.grid.length);
}
/** 1 while the function is set, 0 while cancelled. Cancel wins a tie. */
export function latched(on, off, threshold = TRIP_THRESHOLD, initial = 0) {
    const state = new Uint8Array(on.length);
    let held = initial;
    for (let index = 0; index < on.length; index += 1) {
        if (off[index] >= threshold)
            held = 0;
        else if (on[index] >= threshold)
            held = 1;
        state[index] = held;
    }
    return state;
}
/** 1 only while the port itself is open, which is how midi2exp reads Sforzando. */
export function momentary(port, threshold = TRIP_THRESHOLD) {
    return Uint8Array.from(port, (value) => (value >= threshold ? 1 : 0));
}
export function latchedControl(input, control, initial = 0) {
    return latched(portOf(input, control, "on"), portOf(input, control, "off"), TRIP_THRESHOLD, initial);
}
export function halfLabel(half) {
    return half === "bass" ? "Bass" : "Diskant";
}
