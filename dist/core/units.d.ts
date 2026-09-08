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
 * Which of a model's parameters carry a dimension the two scales differ in. The
 * two relays name their conduits differently, so the vocabulary belongs to the
 * model rather than to this file, and every `Model` states it.
 */
export type Scaling = {
    readonly levels: readonly string[];
    readonly conductances: readonly string[];
    readonly loads: readonly string[];
};
/** The two conversions for one model's parameter vocabulary. */
export type Units = {
    /** A fit on its roll's printed scale, expressed in bellows travel with the rails at 0 and 1. */
    inTravelUnits(params: Parameters): Parameters;
    /** An instrument in bellows travel, put onto a roll whose rails sit at `piano` and `forte`. */
    onPrintedScale(instrument: Parameters, piano: number, forte: number): Parameters;
};
export declare function unitsOf(scaling: Scaling): Units;
