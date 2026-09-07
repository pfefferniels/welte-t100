/**
 * The model's constants on two scales.
 *
 * A fit lives on its roll's printed scale, where the rails sit wherever the pen
 * rested on that sheet. An instrument lives in bellows travel, where the rails
 * are 0 and 1, so that one instrument can be compared with another and applied
 * to a roll whose rails sit elsewhere. The flow law converts exactly: with
 * x = piano + s·u and s the span between the rails,
 *
 *     dx/dt = g · |T − x|^α   becomes   du/dt = g · s^(α−1) · |T_u − u|^α
 *
 * so levels map linearly, a conductance picks up the factor s^(α−1) on the way
 * into travel units, and the through-flow load, which multiplies a conductance
 * times a gap, the factor s.
 * Times, thresholds, shares and the flow exponent are the same on both scales.
 * The offsets of the pen are in scan rows and the scale warp is already defined
 * on the travel between the rails, so both pass through unchanged.
 *
 * Two constants of the model stay in printed-scale units, the pin's thickness
 * and the floor below which an arrival does not rebound, so an instrument
 * applied to a roll sees them scaled by that roll's span, a few percent.
 */
import type { Parameters } from "./types.ts";
/**
 * The terms that describe the drawing apparatus rather than the mechanism: the
 * lead of the punches over the drawn line, its variation by code and along the
 * roll, and the bend of the printed scale (`docs/measurements.md` §5). A piano
 * reads the punches where they are, so an instrument carries them switched off.
 */
export declare const DRAWING_APPARATUS: Parameters;
/** A fit on its roll's printed scale, expressed in bellows travel with the rails at 0 and 1. */
export declare function inTravelUnits(params: Parameters): Parameters;
/** An instrument in bellows travel, put onto a roll whose rails sit at `piano` and `forte`. */
export declare function onPrintedScale(instrument: Parameters, piano: number, forte: number): Parameters;
