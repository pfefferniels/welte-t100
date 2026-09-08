/**
 * The Nuancierbalg of a green Welte: the duration-coded relay of `relay.ts` in
 * front of the shared nuancing block of `core/nuancing.ts`.
 *
 * The state `x` is the closure of the Nuancierbalg 90, Welte's letter N, and
 * everything after the summed drive is the T-100's, on Hagmann's authority that
 * the nuancing unit is built the same for both scales (p. 96). What differs is
 * the relay in front of it and one bore: the permanent bleed 100, which Welte
 * added because the crescendo's own throttle cannot readmit air fast enough
 * (Betriebsanleitung p. 13).
 *
 * **Nothing here is fitted.** The defaults are the starting values of the model
 * specification §6.1, built from Welte's own regulation controls, Schmitz's green
 * hole lengths, Hall's green paper speed and the T-100 consensus, and they are
 * where a fit starts rather than what a fit found. `instruments.ts` says which
 * sets exist and what each rests on.
 */
import { type Model, type ModelInput, type Parameters } from "../core/types.ts";
import type { Scaling } from "../core/units.ts";
/** Which of the T-98's constants carry the span between the rails. */
export declare const T98_SCALING: Scaling;
/** The bellows, and what the dump does to the vacuum it delivers. */
export type NuancingOutput = {
    /** One value per grid row, on the roll's printed scale. */
    readonly travel: Float64Array;
    /** How far the delivered vacuum has collapsed at each row, before `dumpDepth` scales it. */
    readonly dump: Float64Array;
};
export declare function runNuancing(input: ModelInput, params: Parameters): NuancingOutput;
/** How far throttle 96 stands open, which the rewind of `rewind.ts` reads on the bass side. */
export declare function sforzandoPianoLift(input: ModelInput, params: Parameters): Float64Array;
export declare const pneumaticT98Model: Model;
