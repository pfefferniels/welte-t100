/**
 * What the emulator offers as a library: the take-up spool that sets a roll's
 * time axis, the tracker-bar ports a punched roll opens, the nuancing and pedal
 * mechanisms that read them, and the constants they run on. Reading SUPRA scans,
 * the traced line and the fitting stay behind the command-line tools.
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
export { noteDensity } from "./roll/density.ts";

export { pneumaticModel } from "./model/pneumatic.ts";
export { midi2expModel } from "./model/midi2exp.ts";
export {
  DRAWING_APPARATUS,
  FITTED,
  mezzoforteTravel,
  playbackParameters,
  travelBetweenRails,
} from "./model/playback.ts";
export { describeTraversals, traversals, type Traversal } from "./model/timings.ts";
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
