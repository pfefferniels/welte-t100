/**
 * The red Welte (T-100): the latching relay, the instruments it was fitted as,
 * and the readers for a SUPRA scan of one of its rolls.
 *
 * Everything downstream of the relay is shared with the T-98 and lives at the
 * package root. The fitting that produced these instruments lives in `empirics/`
 * of roll-nuance-tracer and builds on both surfaces.
 */
export { aperturePorts, halfLabel, meaningOf, perforations, portKey, portOf, shiftedPortOf, slots, type Action, type CodeMeaning, type Control, type Half, type Perforation, type PortKey, type Punch, } from "./codes.ts";
export { HALVES } from "./codes.ts";
export { pneumaticModel, T100_SCALING } from "./model.ts";
export { t100Relay, type Relay } from "./relay.ts";
export { DRAWING_APPARATUS, inTravelUnits, onPrintedScale } from "./units.ts";
export { mezzoforteTravel, playbackParameters, travelBetweenRails } from "./playback.ts";
export { CONSENSUS, PRESETS, instrumentOf, instrumentParameters, type HalfProvenance, type Instrument, type InstrumentChoice, type Provenance, type RollNumber, } from "./instruments.ts";
export { runPedals, T100_PEDAL_EDGES, T100_PEDALS } from "./pedals.ts";
export { pixels, pixelsPerInch, readRoll, RollTiming, type AxisChoice, type Roll } from "./timing.ts";
