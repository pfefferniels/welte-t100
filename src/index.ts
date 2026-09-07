/**
 * What the emulator offers as a library: the take-up spool that sets a roll's
 * time axis, the tracker-bar ports a punched roll opens, the nuancing and pedal
 * mechanisms that read them, and the instruments they run as. The fitting that
 * produced those instruments lives in `empirics/` of roll-nuance-tracer and
 * builds on this surface; what it reaches for beneath the playback names comes last.
 */

export { circumferenceAt, paperAt, paperSeconds, paperSpeed, WELTE_SPOOL, type Spool } from "./roll/spool.ts";
export { Grid } from "./roll/grid.ts";
export {
  meaningOf,
  type Action,
  type CodeMeaning,
  type Control,
  type Half,
  type Punch,
} from "./roll/expression.ts";
export {
  aperturePorts,
  DEFAULT_GEOMETRY,
  DEFAULT_PUNCH_MM,
  geometryInMm,
  portKey,
  portSeries,
  ROWS_PER_INCH,
  ROWS_PER_MM,
  TRACKER_BORE_MM,
  type PortGeometry,
  type PortKey,
} from "./roll/aperture.ts";

export { pneumaticModel } from "./model/pneumatic.ts";
export { DRAWING_APPARATUS, mezzoforteTravel, playbackParameters, travelBetweenRails } from "./model/playback.ts";
export {
  CONSENSUS,
  PRESETS,
  instrumentOf,
  instrumentParameters,
  type HalfProvenance,
  type Instrument,
  type InstrumentChoice,
  type Provenance,
  type RollNumber,
} from "./model/instruments.ts";
export { inTravelUnits, onPrintedScale } from "./model/units.ts";
export type { Model, ModelInput, Parameters, ParameterSpec } from "./model/types.ts";

export {
  halfPedalling,
  pedalDefaults,
  pedalSpec,
  pedalSpans,
  runPedals,
  tiedToRise,
  type HalfPedalling,
  type PedalInput,
  type PedalSpan,
  type PedalTravel,
} from "./model/pedal.ts";
export {
  DAMPER_CC,
  levelChanges,
  SOFT_CC,
  type ControllerOptions,
  type LevelChange,
  type PedalMode,
} from "./midi/pedal.ts";

// Beneath the playback surface: the roll as SUPRA's MIDI records it, the
// perforations of the code, the transforms a fit applies to a model, the valves
// and the stop for controls that bypass the models, and a MIDI file to write into.
export { pixels, pixelsPerInch, readRoll, type AxisChoice, type Roll } from "./roll/timing.ts";
export { HALVES, perforations, type Perforation } from "./roll/expression.ts";
export { slots, type Slot } from "./roll/aperture.ts";
export { clamp, parametersFrom, parameterVector, shiftedByRows, simulate, withFixed, withTied } from "./model/types.ts";
export { latched, momentary, portOf, TRIP_THRESHOLD } from "./model/latch.ts";
export { limitAtStop, MF_THICKNESS, newStopState, type StopState } from "./model/stop.ts";
export { noteOff, noteOn, setTempo, trackName, writeSmf, type MidiTrack } from "./midi/write.ts";
export { pedalMessages } from "./midi/pedal.ts";
