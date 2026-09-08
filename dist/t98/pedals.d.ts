/**
 * How a green Welte's paper reaches the pedal bellows: one held perforation
 * each, with the sustain punched on the **bass** edge and the soft pedal on the
 * **treble**, which is the opposite of the T-100.
 *
 * Three sources agree. Hagmann's Anhang 11 puts Pedal on line 3 and Hammerleiste
 * on line 96, with his note 36 naming them "Rechtes Pedal/Anhebung der Dämpfer"
 * and "Linkes Pedal/Verschiebung der Hammerleiste". Welte's Betriebsanleitung
 * pp. 15 f.: "Das Fortepedal wird von der dritten Oeffnung links des Gleitblocks
 * betätigt", "Das Pianopedal … von der dritten Oeffnung rechts". And midi2exp's
 * and pianolatron's green profiles put sustain at MIDI 18 and soft at 111.
 *
 * They are held rather than latched, for the same reason as the nuancing
 * functions: "für die Bewegung der beiden Pedale [werden] statt vier nurmehr zwei
 * Linien beansprucht, weil die Informationseingabe und deren Negation über ein
 * und dieselbe Position des Gleitblocks erfolgen" (Hagmann p. 106). The
 * mechanism below the command is the T-100's, and Anhang 17 draws it with the
 * same throttles 11, 17 and 20.
 *
 * pianolatron searches both edges for both pedals, which silently hides a
 * mis-mapped roll. A mis-mapped pedal is exactly the error a T-98 system is most
 * likely to make, so the edges are declared and nothing is searched for.
 */
import { type PedalEdges, type PedalInput, type PedalReading, type PedalTravel } from "../core/pedal.ts";
import type { Parameters } from "../core/types.ts";
import type { ValveSpec } from "../core/valve.ts";
export declare const T98_PEDAL_EDGES: PedalEdges;
/**
 * The relay valve in front of each pedal. Hagmann, p. 106 n. 48: the
 * Vorpneumatik of the pedal action works "sinngemäss in gleicher Weise wie die
 * Ventile in den Relais der Nuancierungseinrichtungen", so these are the
 * nuancing relay's own constants. They are not fitted and cannot be: the pedals
 * leave no drawn line, which is why the T-100's pedal constants are not fitted
 * either.
 */
export declare const T98_PEDAL_VALVE: ValveSpec;
export declare const T98_PEDALS: PedalReading;
export declare function runPedals(input: PedalInput, params?: Parameters): PedalTravel;
