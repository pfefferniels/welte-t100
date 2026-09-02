/**
 * The nuancing constants a playback instrument runs on.
 *
 * The headline fit in `docs/fit-pneumatic.json` describes two things at once:
 * the mechanism, and the apparatus that drew the line the mechanism was fitted
 * against. The lead of the punches over the drawn line, its variation by code,
 * by level and along the roll, and the bend of the printed scale all belong to
 * the pen and the layout of the master roll (`docs/empirics.md` §1, §7). A
 * piano reads the punches where they are, so for playback those terms are
 * switched off and the rest is kept as fitted.
 *
 * What is claimed is only that this is the best estimate the one roll allows.
 * The two halves disagree on several constants that a shared mechanism ought to
 * share, and nothing here shows they transfer to another instrument.
 */
import type { Half } from "../roll/expression.ts";
import type { Parameters } from "./types.ts";
/** `docs/fit-pneumatic.json`, verbatim. The test beside this file keeps it so. */
export declare const FITTED: Record<Half, Parameters>;
/** The terms that describe the drawing apparatus rather than the mechanism. */
export declare const DRAWING_APPARATUS: Parameters;
export declare function playbackParameters(half: Half): Parameters;
/**
 * The model's output as a fraction of the bellows' travel: 0 at the open rail,
 * 1 at the closed rail. The rails are constants of the fit and differ between
 * the halves, so this is the scale on which the two can be compared, and on
 * which a velocity map has to be anchored.
 */
export declare function travelBetweenRails(output: Float64Array, params: Parameters): Float64Array;
/** Where the centre of the Mezzoforte pin sits on that fraction of the travel. */
export declare function mezzoforteTravel(params: Parameters): number;
