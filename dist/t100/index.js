/**
 * The red Welte (T-100): the latching relay, the instruments it was fitted as,
 * and the readers for a SUPRA scan of one of its rolls.
 *
 * Everything downstream of the relay is shared with the T-98 and lives at the
 * package root. The fitting that produced these instruments lives in `empirics/`
 * of roll-nuance-tracer and builds on both surfaces.
 */
export { aperturePorts, halfLabel, meaningOf, perforations, portKey, portOf, shiftedPortOf, slots, } from "./codes.js";
export { HALVES } from "./codes.js";
export { pneumaticModel, T100_SCALING } from "./model.js";
export { t100Relay } from "./relay.js";
export { DRAWING_APPARATUS, inTravelUnits, onPrintedScale } from "./units.js";
export { mezzoforteTravel, playbackParameters, travelBetweenRails } from "./playback.js";
export { CONSENSUS, PRESETS, instrumentOf, instrumentParameters, } from "./instruments.js";
export { runPedals } from "../core/pedal.js";
export { pixels, pixelsPerInch, readRoll, RollTiming } from "./timing.js";
