/**
 * How a red Welte's paper reaches the pedal bellows: a set/cancel pair on each,
 * with the sustain punched on the treble edge (lines 93 and 94) and the hammer
 * rail on the bass (lines 8 and 7), after Hagmann's Anhang 10.
 */
import { latchedCommand, pedalDefaults, pedalTravel } from "../core/pedal.js";
export const T100_PEDAL_EDGES = { sustainPedal: "treble", hammerRail: "bass" };
export const T100_PEDALS = { edges: T100_PEDAL_EDGES, command: latchedCommand };
export function runPedals(input, params = pedalDefaults) {
    return pedalTravel(input, params, T100_PEDALS);
}
