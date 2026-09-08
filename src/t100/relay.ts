/**
 * The latching relay of a red Welte, and the four conduits it opens.
 *
 * Six openings per half, in three set/cancel pairs. Each "on" valve carries a
 * doubled membrane chamber above it (Hagmann's Anhang 13: 24/25 over 22, 40/41
 * over 38, 55/56 over 53), which is the hold that lets a short punch set a
 * function until its cancel line is read. DRP 162 708's claim 3 states the
 * purpose: "daß man im Notenblatt nur kurze Öffnungen vorzusehen braucht, um
 * lang anhaltende Wirkungen hervorzubringen."
 *
 * What the relay hands the nuancing block is three flow paths:
 *
 *   - conduit 39 is always joined to the bellows and its far end is switched by
 *     the crescendo relay between blower vacuum and atmosphere, so it is one path
 *     with two targets. When crescendo is cancelled the refill runs through 39
 *     together with the throttled bore 100, which is why its conductance is
 *     fitted separately even though Hagmann says the two directions are regulated
 *     to take the same time.
 *   - conduit 23 is wider and opens only while the sforzando valve is set.
 *   - throttle 96 opens only while the cancelling perforation is present, and
 *     assists the reopening after a sforzando.
 *
 * Not modelled: throttle 97, which on a sforzando release dumps air straight into
 * the wind chamber and collapses the output pressure without moving the bellows,
 * and the regulator bellows 91, which acts on the cone valve and not on the
 * bellows either. Neither should appear in a line that records bellows travel.
 */

import { drive } from "../core/flow.ts";
import type { Drive } from "../core/nuancing.ts";
import type { ModelInput, Parameters } from "../core/types.ts";
import { heldValve, latched } from "../core/valve.ts";
import { shiftedPortOf, type Action, type Control } from "./codes.ts";

/** What one relay hands the nuancing block: the summed drive and the Mezzoforte pin. */
export type Relay = {
  readonly drive: Drive;
  readonly engaged: Uint8Array;
};

export function t100Relay(input: ModelInput, params: Parameters): Relay {
  const p = params as Record<string, number>;
  // Every parameter is read once here: the step below runs a couple of hundred
  // thousand times per evaluation and a property lookup per read is not free.
  const alpha = p.alpha!;
  const crescendoRate = p.crescendoRate!;
  const crescendoTarget = p.crescendoTarget!;
  const releaseRate = p.releaseRate!;
  const releaseTarget = p.releaseTarget!;
  const sforzandoRate = p.sforzandoRate!;
  const sforzandoTarget = p.sforzandoTarget!;
  const assistRate = p.sforzandoAssistRate!;
  const throughFlowLoad = p.throughFlowLoad!;
  const trip = p.tripThreshold!;

  // Each code is slid along the paper by its own measured offset before anything
  // else happens, so the mechanism sees the roll as it was laid out.
  const lead = p.leadRows!;
  const drift = p.leadDriftRows!;
  const at = (control: Control, action: Action, extra: number): Float64Array =>
    shiftedPortOf(input, control, action, lead + extra, drift);

  const crescendoShift = p.leadCrescendoRows!;
  const engaged = latched(at("mezzoforte", "on", 0), at("mezzoforte", "off", 0));
  const crescendoRelay = latched(at("crescendo", "on", crescendoShift), at("crescendo", "off", crescendoShift));

  // The sforzando valve lifts over a fitted band, about a sixth of the charge on
  // roll 3309 and anywhere from a hundredth to nine tenths across the six lined
  // rolls. The cancelling valve lifts over the whole of it, which is what lets a
  // short cancel return the bellows only part of the way, as Welte's controls 4c
  // and 4d require; a band of the cancel's own was priced and rejected. It also
  // charges more slowly, at its own bore 29, without which the model collapses to
  // the floor at cancels the drawn line barely registers.
  const tailMs = p.valveTailMs!;
  const openings = heldValve(at("sforzando", "on", p.leadSforzandoOnRows!), input.grid.dt, {
    fillMs: p.membraneFillMs!,
    tailMs,
    tripThreshold: trip,
    band: p.valveBand!,
  });
  const cancellings = heldValve(at("sforzando", "off", 0), input.grid.dt, {
    fillMs: p.assistFillMs!,
    tailMs,
    tripThreshold: trip,
    band: 1,
  });

  return {
    engaged,
    drive: (state, index) => {
      const crescendo = crescendoRelay[index] === 1;
      const opening = openings[index]!;

      // The blower feeds the relay's vacuum chamber as well as the note pneumatics,
      // and the nuancing system loads that supply itself. With the crescendo relay
      // off, conduit 39 stands open to atmosphere while the sforzando valve draws on
      // wind chamber 15, so air runs straight through the bellows and out through
      // 23 without moving it, and the draw grows with how far the bellows sits from
      // its open rest. Less vacuum both slows the closing and lowers the level it
      // can reach, so one factor scales the conductance and pulls the target back
      // towards the open end. Reopening runs off atmosphere and the bellows spring,
      // and is left alone. `empirics/docs/measurements.md` §4 motivates the term: additive
      // conductance accounts for only about two thirds of the gap between a
      // sforzando with the crescendo set and one without, and the observed gap
      // widens with position faster than the prediction.
      const throughFlow =
        !crescendo && opening > 0 ? opening * releaseRate * Math.abs(drive(releaseTarget, state.x, alpha)) : 0;
      const supply = 1 / (1 + throughFlowLoad * throughFlow);
      const sag = (target: number): number => releaseTarget + (target - releaseTarget) * supply;

      const conduit39 = crescendo
        ? supply * crescendoRate * drive(sag(crescendoTarget), state.x, alpha)
        : releaseRate * drive(releaseTarget, state.x, alpha);
      const conduit23 =
        opening > 0 ? supply * sforzandoRate * opening * drive(sag(sforzandoTarget), state.x, alpha) : 0;
      // A sforzando-on arriving while the reopening assist is still acting lifts
      // valve 22 and reconnects the bellows to the vacuum through conduit 23, which
      // is the wider of the two. The subito piano is countermanded rather than
      // fought: without this the model collapses to the floor at a cancel that the
      // drawn line barely registers, and those few rows carry a quarter of the
      // bass error and two fifths of the treble's.
      const cancelling = cancellings[index]!;
      const assist = cancelling > 0 ? assistRate * cancelling * drive(releaseTarget, state.x, alpha) : 0;

      return conduit39 + conduit23 + assist;
    },
  };
}
