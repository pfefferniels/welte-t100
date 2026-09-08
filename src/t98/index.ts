/**
 * The green Welte (T-98): the duration-coded relay, the four conduits it opens
 * on one bellows, the shut-off that shares the bass sforzando-piano valve, and
 * the instruments — of which none is yet fitted.
 *
 * Everything downstream of the relay is shared with the T-100 and lives at the
 * package root, on Hagmann's authority that the nuancing unit is built the same
 * for both tracker scales (p. 96).
 */

export {
  aperturePorts,
  DYNAMIC_CONTROLS,
  HALVES,
  meaningOf,
  portKey,
  portOf,
  shiftedPortOf,
  slots,
  type CodeMeaning,
  type Control,
  type Half,
  type PortKey,
  type Punch,
} from "./codes.ts";
export {
  CHAIN_GAP_MM,
  CHAIN_GAP_ROWS,
  DEFAULT_T98_GEOMETRY,
  PUNCH_T98_MM,
  TRACKER_BORE_T98_MM,
} from "./geometry.ts";

export { pneumaticT98Model, runNuancing, sforzandoPianoLift, T98_SCALING, type NuancingOutput } from "./model.ts";
export { t98Relay, type T98Relay } from "./relay.ts";
export { rewindAt, shutOffTravel, SHUT_OFF, type ShutOff } from "./rewind.ts";
export { DRAWING_APPARATUS, inTravelUnits, onPrintedScale } from "./units.ts";
export { runPedals, T98_PEDAL_EDGES, T98_PEDAL_VALVE, T98_PEDALS } from "./pedals.ts";
export {
  DERIVED,
  GENUINE,
  instrumentsT98,
  instrumentT98Of,
  labelOf,
  nuanceOf,
  STARTING_VALUES,
  type DerivedPair,
  type DerivedProvenance,
  type GenuineProvenance,
  type GenuineRoll,
  type UnfittedProvenance,
  type WelteT98Instrument,
  type WelteT98InstrumentName,
} from "./instruments.ts";
