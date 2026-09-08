/**
 * The duration-coded relay of a green Welte, and the four conduits it opens.
 *
 * Four openings per half, 64 to 67 on Hagmann's Anhang 14, each one conduit, one
 * bellows, one bleed bore and one valve on the common wind chamber 68, and **no
 * hold chamber on any of them**. The T-100's Anhang 13 carries a second, doubled
 * membrane chamber above each of its three "on" valves; the T-98 has nothing of
 * the kind, and DRP 162 708's claim 3 — the latch, whose stated purpose is "daß
 * man im Notenblatt nur kurze Öffnungen vorzusehen braucht, um lang anhaltende
 * Wirkungen hervorzubringen" — is exactly the claim the T-98 gives up.
 *
 * The four paths, with Hagmann's part numbers and Welte's screw names:
 *
 * | # | path | parts | screw | conductance | target |
 * |---|---|---|---|---|---|
 * | 1 | permanent bleed to atmosphere | bore 100 | Crescendo-P | `bleedRate` | `releaseTarget` |
 * | 2 | conduit 39, switched by double valve 80 | 77·79·78·80, throttle 98 | Crescendo-F | `crescendoRate` | `crescendoTarget` lifted, `releaseTarget` at rest |
 * | 3 | conduit 23 | 81·83·82·84, throttle 99 | Forzando-F | `sforzandoForteRate` | `sforzandoTarget` |
 * | 4 | throttle 96 opened by bellows 94 | 69·71·70·72 → 33 → 94 → 96 | Forzando-P | `sforzandoPianoRate` | `releaseTarget` |
 *
 * **Path 1 is the one structural departure from the T-100**, and it is Welte's
 * own statement in the Betriebsanleitung for the T-98 (p. 13): "Da durch die
 * gedrosselte Bohrung des Creszendo nicht schnell genug Luft in den Balg dringen
 * kann, ist eine besondere Bohrung vorgesehen, die in das Freie führt, und durch
 * die Schraube Creszendo P. reguliert werden kann. Durch diese Bohrung dringt
 * ständig etwas Luft in den Nuancierbalg und schwächt naturgemäß die regulierte
 * Saugluft des Creszendo-Ventils." The bore is open at all times, it weakens the
 * crescendo, and the two screws interact. The T-100 has no term of this shape;
 * its short-of-full crescendo ceiling is a fitted asymptote, and here the ceiling
 * is derived from the balance of the two bores instead.
 *
 * **There is no decrescendo valve.** The T-100 has one, relay r⁴ of DRP 162 708;
 * the T-98 deletes it and puts the permanent bleed in its place. So the T-100's
 * fitted `releaseRate` may be used to construct a starting value for
 * `crescendoRate + bleedRate` and may not be carried over as either.
 *
 * The **automatic decrescendo** is not a rule the model is given: nothing
 * switches paths 1 and 2 off, so the moment any commanded path closes the
 * bellows opens again. Hagmann says exactly this of the sforzando ("nach dem
 * Verschwinden der Perforation über der Oeffnung 67 greift die
 * Decrescendo-Wirkung von Oeffnung 66 Platz", p. 102) and Welte of the crescendo
 * ("nach dem Aufhören der Perforation von selbst in derselben Geschwindigkeit
 * wieder abnimmt", Betriebsanleitung p. 12).
 *
 * The unmodelled fifth path is throttle 97, which bellows 95 opens on the same
 * command as 96 and which dumps atmosphere into wind chamber 86 and conduit 88,
 * **downstream of the cone valve**, "für den sofortigen Abbau des Unterdrucks auf
 * das für den Piano-Anschlag erforderliche Minimum" (Hagmann p. 103). A trace of
 * bellows travel cannot show it; a trace of delivered vacuum would show a
 * downward spike at every sforzando-piano. `model.ts` carries it as an option on
 * the velocity map, switched off.
 */
import type { Drive } from "../core/nuancing.ts";
import type { ModelInput, Parameters } from "../core/types.ts";
/** What the T-98 relay hands the nuancing block. */
export type T98Relay = {
    readonly drive: Drive;
    /** The Mezzoforte pin, row by row: in only while its own perforation runs. */
    readonly engaged: Uint8Array;
    /** How far throttle 96 stands open, which the rewind and the delivery dump also read. */
    readonly sforzandoPiano: Float64Array;
};
export declare function t98Relay(input: ModelInput, params: Parameters): T98Relay;
