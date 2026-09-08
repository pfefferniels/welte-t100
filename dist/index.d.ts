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
export { circumferenceAt, paperAt, paperSeconds, paperSpeed, WELTE_SPOOL, WELTE_T98_SPOOL, type Spool } from "./core/spool.ts";
export { Grid, type RowTiming } from "./core/grid.ts";
export { aperturePorts, DEFAULT_GEOMETRY, DEFAULT_PUNCH_MM, geometryInMm, ROWS_PER_INCH, ROWS_PER_MM, slots, TRACKER_BORE_MM, type PortGeometry, type Slot, } from "./core/aperture.ts";
export { portKey, portSeries, type PortKey, type PunchAt } from "./core/ports.ts";
export { conductanceFor, drive } from "./core/flow.ts";
export { heldAbove, heldValve, latched, momentary, TRIP_THRESHOLD, type ValveSpec } from "./core/valve.ts";
export { limitAtStop, MF_THICKNESS, newStopState, type StopState } from "./core/stop.ts";
export type { HalfProvenance } from "./core/provenance.ts";
export { mezzoforteTravel, runBellows, travelBetweenRails, type BellowsState, type Drive, } from "./core/nuancing.ts";
export { unitsOf, type Scaling, type Units } from "./core/units.ts";
export { clamp, HALVES, parametersFrom, parameterVector, shiftedByDriftingRows, shiftedByRows, simulate, withFixed, withTied, type Half, type Model, type ModelInput, type Parameters, type ParameterSpec, } from "./core/types.ts";
export { halfPedalling, heldCommand, latchedCommand, pedalBrushing, pedalDefaults, pedalSpec, pedalSpans, pedalTravel, tiedToRise, type HalfPedalling, type PedalCommand, type PedalControl, type PedalEdges, type PedalInput, type PedalReading, type PedalSpan, type PedalTravel, } from "./core/pedal.ts";
export { DAMPER_CC, levelChanges, pedalMessages, SOFT_CC, type ControllerOptions, type LevelChange, type PedalMode, } from "./core/midi/pedal.ts";
export { parseSmf, type SmfFile, type TrackEvent } from "./core/smf.ts";
export { noteOff, noteOn, setTempo, trackName, writeSmf, type MidiTrack } from "./core/write.ts";
