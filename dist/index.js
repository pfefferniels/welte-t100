/**
 * What both Welte-Mignon scales share: the take-up spool that sets a roll's time
 * axis, the tracker-bar ports a punched roll opens, the relay valves that read
 * them, the nuancing bellows they drive, and the pedal mechanism below the
 * command.
 *
 * Hagmann divides the Nuancierungseinrichtung in two (p. 96), and this entry
 * point is the second half: the Nuancierung proper, "von geringfügigen
 * Unterschieden abgesehen, für beide Blockskalen gleich konstruiert". The two
 * relays that stand in front of it are `welte-mignon-emulator/t100` and
 * `welte-mignon-emulator/t98`, and the instruments each was fitted as live there.
 */
export { circumferenceAt, paperAt, paperSeconds, paperSpeed, WELTE_SPOOL, WELTE_T98_SPOOL } from "./core/spool.js";
export { Grid } from "./core/grid.js";
export { aperturePorts, DEFAULT_GEOMETRY, DEFAULT_PUNCH_MM, geometryInMm, ROWS_PER_INCH, ROWS_PER_MM, slots, TRACKER_BORE_MM, } from "./core/aperture.js";
export { portKey, portSeries } from "./core/ports.js";
export { conductanceFor, drive } from "./core/flow.js";
export { heldValve, latched, momentary, TRIP_THRESHOLD } from "./core/valve.js";
export { limitAtStop, MF_THICKNESS, newStopState } from "./core/stop.js";
export { mezzoforteTravel, runBellows, travelBetweenRails, } from "./core/nuancing.js";
export { unitsOf } from "./core/units.js";
export { clamp, HALVES, parametersFrom, parameterVector, shiftedByDriftingRows, shiftedByRows, simulate, withFixed, withTied, } from "./core/types.js";
export { halfPedalling, pedalBrushing, pedalDefaults, pedalSpec, pedalSpans, runPedals, tiedToRise, } from "./core/pedal.js";
export { DAMPER_CC, levelChanges, pedalMessages, SOFT_CC, } from "./core/midi/pedal.js";
export { parseSmf } from "./core/smf.js";
export { noteOff, noteOn, setTempo, trackName, writeSmf } from "./core/write.js";
