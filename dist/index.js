/**
 * What the emulator offers as a library: the take-up spool that sets a roll's
 * time axis, the tracker-bar ports a punched roll opens, the nuancing and pedal
 * mechanisms that read them, and the instruments they run as. The fitting that
 * produced those instruments lives in `empirics/` of roll-nuance-tracer and
 * builds on this surface; what it reaches for beneath the playback names comes last.
 */
export { circumferenceAt, paperAt, paperSeconds, paperSpeed, WELTE_SPOOL } from "./roll/spool.js";
export { Grid } from "./roll/grid.js";
export { meaningOf, } from "./roll/expression.js";
export { aperturePorts, DEFAULT_GEOMETRY, DEFAULT_PUNCH_MM, geometryInMm, portKey, portSeries, ROWS_PER_INCH, ROWS_PER_MM, TRACKER_BORE_MM, } from "./roll/aperture.js";
export { pneumaticModel } from "./model/pneumatic.js";
export { DRAWING_APPARATUS, mezzoforteTravel, playbackParameters, travelBetweenRails } from "./model/playback.js";
export { CONSENSUS, PRESETS, instrumentOf, instrumentParameters, } from "./model/instruments.js";
export { inTravelUnits, onPrintedScale } from "./model/units.js";
export { halfPedalling, pedalDefaults, pedalSpec, pedalSpans, runPedals, tiedToRise, } from "./model/pedal.js";
export { DAMPER_CC, levelChanges, SOFT_CC, } from "./midi/pedal.js";
// Beneath the playback surface: the roll as SUPRA's MIDI records it, the
// perforations of the code, the transforms a fit applies to a model, the valves
// and the stop for controls that bypass the models, and a MIDI file to write into.
export { pixels, pixelsPerInch, readRoll } from "./roll/timing.js";
export { HALVES, perforations } from "./roll/expression.js";
export { slots } from "./roll/aperture.js";
export { clamp, parametersFrom, parameterVector, shiftedByRows, simulate, withFixed, withTied } from "./model/types.js";
export { latched, momentary, portOf, TRIP_THRESHOLD } from "./model/latch.js";
export { limitAtStop, MF_THICKNESS, newStopState } from "./model/stop.js";
export { noteOff, noteOn, setTempo, trackName, writeSmf } from "./midi/write.js";
export { pedalMessages } from "./midi/pedal.js";
