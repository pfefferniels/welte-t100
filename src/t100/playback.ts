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

import { instrumentParameters } from "./instruments.ts";
import type { Half } from "../core/types.ts";
import type { Parameters } from "../core/types.ts";

export { DRAWING_APPARATUS } from "./units.ts";
export { mezzoforteTravel, travelBetweenRails } from "../core/nuancing.ts";

/** The consensus instrument, in bellows travel. `instrumentParameters` offers the rest. */
export function playbackParameters(half: Half): Parameters {
  return instrumentParameters(half, "consensus");
}
