/**
 * The nuancing constants a playback instrument runs on.
 *
 * A fit describes two things at once: the mechanism, and the apparatus that drew
 * the line the mechanism was fitted against. The lead of the punches over the
 * drawn line, its variation by code and along the roll, and the bend of the
 * printed scale all belong to the pen and the layout of the master roll
 * (`empirics/docs/measurements.md` §5). A piano reads the punches where they are, so for
 * playback those terms are switched off. `instruments.ts` holds the sets a
 * playback can choose between; the default is the consensus.
 */
import type { Half } from "../roll/expression.ts";
import type { Parameters } from "./types.ts";
export { DRAWING_APPARATUS } from "./units.ts";
/** The consensus instrument, in bellows travel. `instrumentParameters` offers the rest. */
export declare function playbackParameters(half: Half): Parameters;
/**
 * The model's output as a fraction of the bellows' travel: 0 at the open rail,
 * 1 at the closed rail. An instrument in travel units already is that; a fit on
 * a roll's printed scale needs its own rails taken out first.
 */
export declare function travelBetweenRails(output: Float64Array, params: Parameters): Float64Array;
/** Where the centre of the Mezzoforte pin sits on that fraction of the travel. */
export declare function mezzoforteTravel(params: Parameters): number;
