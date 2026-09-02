/**
 * The Stanford model (Shi and Sapp, `midi2exp`), as a baseline.
 *
 * A first-order integrator with constant rates: a slow decrescendo runs
 * whenever nothing else is set, Crescendo and Sforzando add their own constant
 * rates on top, and the Mezzoforte hook clamps the value to whichever side of
 * the M.F. level it was already on. midi2exp works in MIDI velocity, with
 * welte_p 35, welte_mf 60, welte_f 90 and welte_loud 75; since every rule in it
 * is affine, running it in scale units with `mf` at 0.4545 reproduces it
 * exactly. That number is the point: the roll's own printed M.F. gridline sits
 * at 0.5, so the default parameters here already disagree with the paper about
 * where mezzoforte is.
 *
 * Sforzando is read as momentary — active only while the perforation is under
 * the tracker bar — which is midi2exp's reading and, on Hagmann's account of the
 * relay, probably wrong. `sforzandoLatches` switches to the other reading.
 */
import { type Model } from "./types.ts";
export declare const midi2expModel: Model;
