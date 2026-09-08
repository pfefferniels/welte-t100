/**
 * The shut-off, which hangs on the bass sforzando-piano valve.
 *
 * This is the best-documented part of the T-98 and the part every existing
 * program gets wrong. Welte, Skala-Rolle §10: "Nach vollendetem Spiel einer
 * Welte-Mignon-Notenrolle wird der Spielhebel automatisch durch eine lange
 * Lochung (1. Loch von links) auf ‚zurück' gestellt … Dieses selbe Loch dient
 * normaler Weise als Forzando-Piano. Damit die stets kurzen
 * Forzando-P-Lochungen während des Spiels den Kontakt nicht auslösen können, muß
 * der Abstellbalg beträchtlichen toten Gang haben, in dem sich die Bewegungen
 * der kurzen Forzando-P-Lochungen verlieren. Außerdem ist die Bewegung des
 * Abstellbalges durch die an demselben befindliche Drosselschraube regulierbar."
 * The Betriebsanleitung says the same at pp. 17 f. and numbers the parts: "Balg 1
 * ist deshalb mit beträchtlichem toten Gang versehen; außerdem ist die
 * Saugluftzufuhr durch Schraube 2 gedrosselt."
 *
 * So the rewind is **not a second reading of the code**. It is a second,
 * deliberately sluggish and dead-banded integrator hanging on the same valve
 * output as the bass sforzando-piano, and the dynamic function acts as usual
 * throughout, which at the end of a roll is musically harmless and is what the
 * instrument does.
 *
 * When it fires, everything stops. During rewind, valve 4 "Zurück" gives the wind
 * motor undrosselte suction, shuts off the suction to the primary pneumatics so
 * that no note sounds, and closes the Hauptventil so that the striker pneumatics
 * and the expression apparatus are out of action (Betriebsanleitung p. 17). The
 * performance ends at the trip; it does not continue quietly.
 *
 * What the prior art does: midi2exp reads every perforation on MIDI 16 as a fast
 * decrescendo, so a rewind hole becomes a fast decrescendo lasting as long as the
 * rewind; pianolatron uses hole 16 only to check that the roll ends as expected;
 * roll-image-parser notes "1st hole from left (bass), but only if 'long'" and does
 * not implement it; PlaySK's WelteT98 has no rewind handling at all. A model that
 * handles it correctly diverges from all four at the end of every green roll, and
 * that divergence is a result to be reported rather than a discrepancy to be
 * tuned away.
 */

import { simulate } from "../core/types.ts";

/**
 * **A proposal, calibrated on one roll.** No source gives a length. Welte's scale
 * roll carries two test perforations, the shorter of which must not trip the
 * contact and the longer of which must, but their lengths are not printed. On the
 * green copy of roll 225 the bass sforzando-piano track carries 30 chained
 * groups: 29 musical ones of 1.4 to 4.7 mm, and one of 385.8 mm made of 177
 * punches. Two orders of magnitude separate them, so any threshold between about
 * 10 mm and 300 mm of paper decides correctly on that roll.
 *
 * These constants trip at about 20 mm of paper, some 0.55 s at 2.13 m/min: four
 * times the longest musical group measured and one twentieth of the rewind.
 * Expect to revise them on the next green roll read.
 */
export const SHUT_OFF: ShutOff = {
  /** Welte's throttle screw 2 on the Abstellbalg. */
  riseMs: 800,
  /** How fast it refills between perforations. */
  fallMs: 400,
  /** The dead motion, in which the movements of the short forzando-P holes are lost. */
  trip: 0.5,
};

export type ShutOff = {
  readonly riseMs: number;
  readonly fallMs: number;
  readonly trip: number;
};

/** How far the Abstellbalg has closed, row by row. */
export function shutOffTravel(lift: Float64Array, dt: Float64Array, shutOff: ShutOff = SHUT_OFF): Float64Array {
  return simulate(lift.length, { closed: 0 }, (state, index) => {
    const towards = lift[index]! > 0 ? 1 : 0;
    const tau = towards === 1 ? shutOff.riseMs : shutOff.fallMs;
    state.closed = towards + (state.closed - towards) * Math.exp((-dt[index]! * 1000) / tau);
    return state.closed;
  });
}

/**
 * The row at which the mercury contact is released and the roll goes back, or
 * `undefined` where the roll carries no perforation long enough.
 */
export function rewindAt(lift: Float64Array, dt: Float64Array, shutOff: ShutOff = SHUT_OFF): number | undefined {
  const travel = shutOffTravel(lift, dt, shutOff);
  const index = travel.findIndex((closed) => closed >= shutOff.trip);
  return index < 0 ? undefined : index;
}
