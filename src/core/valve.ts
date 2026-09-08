/**
 * The relay valves, which both scales build the same way.
 *
 * A relay valve does not follow its port. Air enters the membrane chamber
 * through the port and leaves through a bleed bore, and the valve lifts only
 * once the chamber has charged past the membrane's threshold. Hagmann says it of
 * the T-100's crescendo bore 37 (p. 98) and word for word of the T-98's bore 78
 * (p. 101): the bore is dimensioned to hold the working vacuum but not to
 * neutralise the incoming puff.
 *
 * What the two scales do with that is where they part. The T-100 puts a hold
 * chamber above each "on" valve, so a short punch sets a function that stands
 * until its cancel line is read, and `latched` is the whole of its memory. The
 * T-98's Anhang 14 has no hold chamber on any unit, so "die Funktion bleibt
 * genau so lange ausgeführt, als die entsprechende Perforation im Notenband über
 * die Gleitblock-Oeffnung läuft" (Hagmann, pp. 100 f.), and `heldValve` is the
 * whole of its reading. The chamber and the bleed are the same part on both.
 */

import { simulate } from "./types.ts";

export const TRIP_THRESHOLD = 0.05;

/** 1 while the function is set, 0 while cancelled. Cancel wins a tie. */
export function latched(
  on: Float64Array,
  off: Float64Array,
  threshold = TRIP_THRESHOLD,
  initial = 0,
): Uint8Array {
  const state = new Uint8Array(on.length);
  let held = initial;
  for (let index = 0; index < on.length; index += 1) {
    if (off[index]! >= threshold) held = 0;
    else if (on[index]! >= threshold) held = 1;
    state[index] = held;
  }
  return state;
}

/** 1 only while the port itself is open, which is how midi2exp reads Sforzando. */
export function momentary(port: Float64Array, threshold = TRIP_THRESHOLD): Uint8Array {
  return Uint8Array.from(port, (value) => (value >= threshold ? 1 : 0));
}

/**
 * One relay unit as its two bores set it: the conduit and the bellows' volume
 * fill the chamber, the bleed empties it, and the membrane needs a pressure
 * before it lifts at all.
 */
export type ValveSpec = {
  /** How fast the membrane chamber charges through the conduit. */
  readonly fillMs: number;
  /** How fast it bleeds away again; the same bore also sets the trip. */
  readonly tailMs: number;
  readonly tripThreshold: number;
  /** Share of the charge above the trip over which it lifts; 1 is the whole of it. */
  readonly band: number;
};

/** Pressure in the membrane chamber, row by row, as a fraction of full. */
function chargeOf(port: Float64Array, dt: Float64Array, fillMs: number, tailMs: number): Float64Array {
  return simulate(port.length, { charge: 0 }, (state, index) => {
    const open = port[index]!;
    const tau = open > state.charge ? fillMs : tailMs;
    state.charge = tau <= 0 ? open : open + (state.charge - open) * Math.exp((-dt[index]! * 1000) / tau);
    return state.charge;
  });
}

/** How far the valve stands open at that charge: nothing below the trip, then linear over the band. */
function liftAt(charge: number, tripThreshold: number, band: number): number {
  const width = (1 - tripThreshold) * band;
  return charge <= tripThreshold ? 0 : Math.min((charge - tripThreshold) / width, 1);
}

/**
 * How far the valve stands open, row by row, given how far its port stands open.
 *
 * The threshold is what lets Welte's control 4b ask for six short perforations
 * to give six steps while six shorter ones give none: a punch too brief to charge
 * the chamber does nothing at all. The tail is what keeps the valve open a little
 * after the punch has gone, rounding every trailing edge, and on a green roll it
 * is also what carries the charge across the paper bridges of a chain punching.
 */
export function heldValve(port: Float64Array, dt: Float64Array, spec: ValveSpec): Float64Array {
  return chargeOf(port, dt, spec.fillMs, spec.tailMs).map((charge) =>
    liftAt(charge, spec.tripThreshold, spec.band),
  );
}

/** 1 while the valve stands open at all. */
export function heldAbove(lift: Float64Array): Uint8Array {
  return Uint8Array.from(lift, (value) => (value > 0 ? 1 : 0));
}
