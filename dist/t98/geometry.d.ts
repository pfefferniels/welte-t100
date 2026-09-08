/**
 * What a green roll and a green tracker bar measure, which is a fact about the
 * reading rather than about the mechanism.
 */
import { type PortGeometry } from "../core/aperture.ts";
/**
 * Measured as `AVG_HOLE_WIDTH` on Julian Dyer's scan of the T-98 copy of roll
 * 225 at 300.25 ppi: 18.84 px, median circularity 0.91. It agrees with Schmitz
 * on green rolls generally — "einen Lochdurchmesser von 1,6 … 1,7 mm" (1981,
 * p. 7) — and with Hagmann's 1.6 mm (p. 76), from two other objects. Deutsches
 * Museum rolls 590 and 2431 measure 1.48 to 1.67 mm at mid ink threshold.
 */
export declare const PUNCH_T98_MM = 1.594;
/**
 * **A proposal.** No source read gives the T-98's tracker bore, so this is the
 * T-100's figure carried over. Phillips photographs the Mignon and Licensee bars
 * and reports the Mignon's holes "taller by 0.5 millimetres" (p. 180), but no
 * green bar is measured anywhere in his thesis and the difference he gives is
 * between two other bars.
 *
 * A floor of roughly 1.0 mm can be argued from the chain pitch: at 2.62 mm
 * centres a bore of 1.0 mm would shut the port completely at every trough, and a
 * perforator operator who had watched a chain-punched hold stutter would not
 * choose that. It turns on the pitch having been chosen deliberately, so it is an
 * argument and not a measurement.
 *
 * It matters most for the trough of a chain, which runs from about 6 % of the
 * port at 1.2 mm to 20 % at 1.7 mm, and hardly at all for the implied
 * rest-to-hook time, which moves 6 % over the whole plausible range.
 */
export declare const TRACKER_BORE_T98_MM = 1.413;
/**
 * **A proposal.** Chained punches whose gap is shorter than this are one hold.
 * One tracker bore plus a margin, which merges the 1.0 mm paper bridges measured
 * on three rolls from two collections while leaving anything a bore apart alone.
 */
export declare const CHAIN_GAP_MM = 1.8;
export declare const CHAIN_GAP_ROWS: number;
export declare const DEFAULT_T98_GEOMETRY: PortGeometry;
