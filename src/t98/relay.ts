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

import { drive } from "../core/flow.ts";
import type { Drive } from "../core/nuancing.ts";
import type { ModelInput, Parameters } from "../core/types.ts";
import { heldAbove, heldValve, type ValveSpec } from "../core/valve.ts";
import { shiftedPortOf, type Control } from "./codes.ts";

/**
 * Bores 74 (mezzoforte) and 78 (crescendo) are lifted over the whole charge
 * above the trip. Welte's controls norm 70 and 82 by counting steps, which is
 * what a partial lift produces; nothing norms 74 or 78, and giving them a band
 * of their own would be a free parameter no source asks for.
 */
const WHOLE_BAND = 1;

/** What the T-98 relay hands the nuancing block. */
export type T98Relay = {
  readonly drive: Drive;
  /** The Mezzoforte pin, row by row: in only while its own perforation runs. */
  readonly engaged: Uint8Array;
  /** How far throttle 96 stands open, which the rewind and the delivery dump also read. */
  readonly sforzandoPiano: Float64Array;
};

export function t98Relay(input: ModelInput, params: Parameters): T98Relay {
  const p = params as Record<string, number>;
  const alpha = p.alpha!;
  const bleedRate = p.bleedRate!;
  const crescendoRate = p.crescendoRate!;
  const crescendoTarget = p.crescendoTarget!;
  const releaseTarget = p.releaseTarget!;
  const forteRate = p.sforzandoForteRate!;
  const sforzandoTarget = p.sforzandoTarget!;
  const pianoRate = p.sforzandoPianoRate!;
  const throughFlowLoad = p.throughFlowLoad!;
  const trip = p.tripThreshold!;
  const blowerThreshold = p.blowerThreshold!;
  const blowerStep = p.blowerStep!;
  const blowerHysteresis = p.blowerHysteresis!;

  const lead = p.leadRows!;
  const drift = p.leadDriftRows!;
  const at = (control: Control, extra: number): Float64Array =>
    shiftedPortOf(input, control, lead + extra, drift);

  const valve = (spec: ValveSpec, control: Control, extra: number): Float64Array =>
    heldValve(at(control, extra), input.grid.dt, spec);

  const sforzandoPiano = valve(
    { fillMs: p.pianoFillMs!, tailMs: p.pianoTailMs!, tripThreshold: trip, band: p.pianoBand! },
    "sforzandoPiano",
    0,
  );
  const sforzandoForte = valve(
    { fillMs: p.forteFillMs!, tailMs: p.forteTailMs!, tripThreshold: trip, band: p.forteBand! },
    "sforzandoForte",
    p.leadSforzandoOnRows!,
  );
  const crescendo = valve(
    { fillMs: p.crescendoFillMs!, tailMs: p.crescendoTailMs!, tripThreshold: trip, band: WHOLE_BAND },
    "crescendo",
    p.leadCrescendoRows!,
  );
  // Conduit 54 carries no throttle on either plate and no control in Anhang 12
  // times the Mezzofortebalg, so the hook is in or out with no travel of its own.
  const mezzoforte = valve(
    { fillMs: p.mezzoforteFillMs!, tailMs: p.mezzoforteTailMs!, tripThreshold: trip, band: WHOLE_BAND },
    "mezzoforte",
    p.leadMezzoforteRows!,
  );

  // The blower's two speeds are a T-98 problem the T-100 does not have. On a red
  // instrument the roll commands them; the T-98 has no Widerstand line and
  // switches automatically, on a mercury contact that closes "sobald die
  // Tonstärke den Forte-Grad erreicht" (Skala-Rolle §12). Welte never says where
  // in the travel the step lies, and Hagmann predicts from it "erhebliche
  // Differenzen in der dynamischen Gestalt, insbesondere zu einer Nivellierung
  // der Akzente bei den jüngeren Rollen" (p. 75), marking it as his own
  // deduction. So the term is specified, shipped switched off at blowerStep 0,
  // and priced later, as the T-100 project treated its own rejected readings.
  const blower = { above: false };
  const supplyStep = (x: number): number => {
    if (blowerStep === 0) return 1;
    blower.above = blower.above
      ? x >= blowerThreshold - blowerHysteresis
      : x >= blowerThreshold + blowerHysteresis;
    return blower.above ? 1 + blowerStep : 1;
  };

  return {
    engaged: heldAbove(mezzoforte),
    sforzandoPiano,
    drive: (state, index) => {
      const liftC = crescendo[index]!;
      const liftF = sforzandoForte[index]!;
      const liftP = sforzandoPiano[index]!;
      // Only the two paths that draw on wind chamber 68 scale with the supply:
      // conduit 39 while valve 80 is lifted, which "öffnet die Ventilkammer zur
      // Windkammer 68" (Hagmann p. 101), and conduit 23. §1.5 of the model
      // specification names paths 3 and 4 in a parenthesis, which its own prose
      // and Hagmann contradict; the prose governs.
      const step = supplyStep(state.x);
      const drawnRate = liftC * crescendoRate + liftF * forteRate;

      // Air admitted while vacuum is drawn runs straight through the bellows
      // without moving it and the blower's supply sags. The normaliser makes the
      // term reduce exactly to the T-100's when only conduit 23 draws.
      const admitted = bleedRate + (1 - liftC) * crescendoRate + liftP * pianoRate;
      const towardsOpen = Math.abs(drive(releaseTarget, state.x, alpha));
      const throughFlow =
        throughFlowLoad > 0 && forteRate > 0 ? (admitted * drawnRate * towardsOpen) / forteRate : 0;
      const supply = 1 / (1 + throughFlowLoad * throughFlow);
      const sag = (target: number): number => releaseTarget + (target - releaseTarget) * supply;

      const towardsRelease = drive(releaseTarget, state.x, alpha);
      const bore100 = bleedRate * towardsRelease;
      // Double valve 80 in mid-travel leaks both ways, so the two targets are
      // mixed in proportion to the lift. That the mixture is *linear* in the lift
      // is a proposal: it matters only over the few tens of milliseconds of each
      // edge, and it makes the crescendo's edges continuous instead of stepped.
      const conduit39 =
        crescendoRate *
        (liftC * step * supply * drive(sag(crescendoTarget), state.x, alpha) + (1 - liftC) * towardsRelease);
      const conduit23 = liftF > 0 ? liftF * step * supply * forteRate * drive(sag(sforzandoTarget), state.x, alpha) : 0;
      const throttle96 = liftP > 0 ? liftP * pianoRate * towardsRelease : 0;

      // Four conduits stand on one bellows and nothing arbitrates between them,
      // so the drives add as flows on a common volume add and the bellows goes
      // where they balance. That is neither midi2exp's arithmetic cancellation of
      // constant velocity steps nor PlaySK's forte-wins: the balance is a
      // position, at which sforzandoForteRate·|sforzandoTarget − x|^α equals
      // sforzandoPianoRate·|x − releaseTarget|^α, and near either rail one of the
      // two wins outright.
      return bore100 + conduit39 + conduit23 + throttle96;
    },
  };
}
