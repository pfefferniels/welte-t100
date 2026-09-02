/**
 * What the emulator offers as a library: the take-up spool that sets a roll's
 * time axis, the tracker-bar ports a punched roll opens, the nuancing and pedal
 * mechanisms that read them, and the constants they run on. Reading SUPRA scans,
 * the traced line and the fitting stay behind the command-line tools.
 */
export { circumferenceAt, paperAt, paperSeconds, paperSpeed, WELTE_SPOOL } from "./roll/spool.js";
export { Grid } from "./roll/grid.js";
export { meaningOf, } from "./roll/expression.js";
export { aperturePorts, DEFAULT_GEOMETRY, DEFAULT_PUNCH_MM, geometryInMm, portKey, portSeries, ROWS_PER_INCH, ROWS_PER_MM, TRACKER_BORE_MM, } from "./roll/aperture.js";
export { noteDensity } from "./roll/density.js";
export { pneumaticModel } from "./model/pneumatic.js";
export { midi2expModel } from "./model/midi2exp.js";
export { DRAWING_APPARATUS, FITTED, mezzoforteTravel, playbackParameters, travelBetweenRails, } from "./model/playback.js";
export { describeTraversals, traversals } from "./model/timings.js";
export { halfPedalling, pedalDefaults, pedalSpec, pedalSpans, runPedals, tiedToRise, } from "./model/pedal.js";
export { DAMPER_CC, levelChanges, SOFT_CC, } from "./midi/pedal.js";
