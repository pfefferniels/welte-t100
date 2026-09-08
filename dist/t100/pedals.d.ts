/**
 * How a red Welte's paper reaches the pedal bellows: a set/cancel pair on each,
 * with the sustain punched on the treble edge (lines 93 and 94) and the hammer
 * rail on the bass (lines 8 and 7), after Hagmann's Anhang 10.
 */
import { type PedalEdges, type PedalInput, type PedalReading, type PedalTravel } from "../core/pedal.ts";
import type { Parameters } from "../core/types.ts";
export declare const T100_PEDAL_EDGES: PedalEdges;
export declare const T100_PEDALS: PedalReading;
export declare function runPedals(input: PedalInput, params?: Parameters): PedalTravel;
