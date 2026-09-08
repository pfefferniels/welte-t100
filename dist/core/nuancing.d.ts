/**
 * The Nuancierbalg, and everything that happens after the drives are summed.
 *
 * Hagmann divides the Nuancierungseinrichtung in two (p. 96): the Relais, which
 * turns the weak impulses from paper and tracker bar into stronger movement
 * impulses, and the Nuancierung proper, which turns those into movements of
 * bellows and valves. Of the second he writes that it is "von geringfügigen
 * Unterschieden abgesehen, für beide Blockskalen gleich konstruiert". His Anhang
 * 13 (T-100) and Anhang 14 (T-98) carry the identical block with the identical
 * part numbers 85–101, both captioned "Nach Welte 2", a manual that covers the
 * T-98. So this file is written once and each scale's relay stands in front of it.
 *
 * The state `x` is the closure of the nuance bellows 90, Welte's letter N: 0
 * fully open, which sets the cone valve 87 for the least vacuum and so the
 * softest attack, 1 fully closed and loudest. What a relay supplies is the summed
 * dx/dt of its own conduits; what happens to it here is the same on both scales:
 *
 *   - `inertiaMs` gives the bellows, chain and cone valve a little mass, so the
 *     velocity relaxes towards the flow-driven velocity instead of taking it at
 *     once. At zero the model is first order.
 *   - the Mezzoforte pin arrests the board at whichever of its two faces the
 *     board arrived at, and `stopRestitution` sends what is left of the momentum
 *     back the way it came.
 *   - the two rails clamp the travel and stop the bellows dead on contact.
 *   - `scaleWarp`, last, bends the whole trace, which models the pen on a
 *     swinging board and not the bellows. At zero it is the identity.
 *
 * That the model may stop at the bellows — that the map from valve position to
 * striking vacuum is instantaneous — is Welte's own claim for the regulator of
 * DRP 354 925, "Spannungsregler für Musikwerke": it acts "mit augenblicklicher
 * Wirkung", and the small loss hole H is there so that the chamber takes its
 * pressure "ohne Verzögerung". Nothing connects that patent to a T-98 instrument
 * in particular; the date and the firm fit.
 */
import type { Grid } from "./grid.ts";
import { type StopState } from "./stop.ts";
import { type Parameters } from "./types.ts";
export type BellowsState = {
    x: number;
    velocity: number;
    stop: StopState;
};
/** dx/dt before inertia, at this row: what the relay's conduits ask of the bellows. */
export type Drive = (state: BellowsState, index: number, dt: number) => number;
/**
 * The bellows, stepped once per grid row. `engaged` is the Mezzoforte pin, row
 * by row, which each scale derives from its own relay.
 */
export declare function runBellows(grid: Grid, params: Parameters, drive: Drive, engaged: Uint8Array): Float64Array;
/**
 * The model's output as a fraction of the bellows' travel: 0 at the open rail,
 * 1 at the closed rail. An instrument in travel units already is that; a fit on
 * a roll's printed scale needs its own rails taken out first.
 */
export declare function travelBetweenRails(output: Float64Array, params: Parameters): Float64Array;
/** Where the centre of the Mezzoforte pin sits on that fraction of the travel. */
export declare function mezzoforteTravel(params: Parameters): number;
