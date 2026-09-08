/**
 * The green Welte (T-98): the duration-coded relay, the four conduits it opens
 * on one bellows, the shut-off that shares the bass sforzando-piano valve, and
 * the instruments — of which none is yet fitted.
 *
 * Everything downstream of the relay is shared with the T-100 and lives at the
 * package root, on Hagmann's authority that the nuancing unit is built the same
 * for both tracker scales (p. 96).
 */
export { aperturePorts, DYNAMIC_CONTROLS, HALVES, meaningOf, portKey, portOf, shiftedPortOf, slots, } from "./codes.js";
export { CHAIN_GAP_MM, CHAIN_GAP_ROWS, DEFAULT_T98_GEOMETRY, PUNCH_T98_MM, TRACKER_BORE_T98_MM, } from "./geometry.js";
export { pneumaticT98Model, runNuancing, sforzandoPianoLift, T98_SCALING } from "./model.js";
export { t98Relay } from "./relay.js";
export { rewindAt, shutOffTravel, SHUT_OFF } from "./rewind.js";
export { DRAWING_APPARATUS, inTravelUnits, onPrintedScale } from "./units.js";
export { runPedals, T98_PEDAL_EDGES, T98_PEDAL_VALVE, T98_PEDALS } from "./pedals.js";
export { DERIVED, GENUINE, instrumentsT98, instrumentT98Of, labelOf, nuanceOf, STARTING_VALUES, } from "./instruments.js";
