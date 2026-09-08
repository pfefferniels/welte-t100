/**
 * Where this model deliberately differs from midi2exp, pianolatron and PlaySK,
 * and why. §10.3 of the model specification lists seven such places; the ones
 * that can be shown without a fit are here.
 *
 * The three programs disagree with each other as much as with this model — by a
 * factor of 1.6 on the green fast crescendo (midi2exp 245 ms min to mf, PlaySK
 * 400 ms) and 1.5 on the fast decrescendo (269 ms against 180 ms) — and neither
 * author documents a source. So these are not claims that the prior art is wrong
 * about a number. They are claims about the *shape* of the reading, each with a
 * source behind it.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { ROWS_PER_MM } from "../core/aperture.ts";
import type { Parameters } from "../core/types.ts";
import { aperturePorts, portKey, type Punch } from "./codes.ts";
import { PUNCH_T98_MM, TRACKER_BORE_T98_MM } from "./geometry.ts";
import { STARTING_VALUES } from "./instruments.ts";
import { greenGrid, levelAt, punch, steps, travelOf } from "./synthetic.ts";

const BASS: Parameters = STARTING_VALUES.bass;

/**
 * midi2exp keeps the port binary and lengthens every perforation by 0.75 tracker
 * diameters at its tail end (`Expressionizer.cpp:1878`), so the open port of a
 * hole of ink length L is a rectangle of L + 0.75 bore.
 */
const midi2expPort = (inkMm: number): number => inkMm + 0.75 * TRACKER_BORE_T98_MM;

/** Millimetres of fully-open port the aperture model gives the same hole. */
function openPort(inkMm: number): number {
  const grid = greenGrid(200);
  const hole: Punch = punch("sforzandoForte", 50, inkMm);
  const series = aperturePorts(grid, [hole]).get(portKey("bass", "sforzandoForte"))!;
  return series.reduce((total, value) => total + value, 0) / ROWS_PER_MM;
}

test("midi2exp's fixed tail extension reaches the hook in three perforations, not six", () => {
  // This is the strongest single argument for the aperture model over the prior
  // art's, and it is Welte's own test that makes it. Skala-Rolle §4 has one
  // forzando-forte perforation of the scale roll's own length carry the bellows
  // from rest to the mezzoforte hook; §6 has six short ones do the same in six
  // steps. The two controls have to agree, so six short holes must present the
  // same open port as one long one.
  //
  // A fixed 1.06 mm added to every hole is negligible on a long command and
  // doubles a short one, so under midi2exp's reading the six short holes present
  // nearly twice the open port of the single long one, and a rate calibrated on
  // the long one carries the bellows to the hook less than half way through.
  const SHORT = 1.8; // Schmitz 1981, p. 7: the smallest green forzando-forte hole
  const LONG = 9.7; // §2.7: what §4's single hole must measure for the two controls to agree
  const SPEED = 35.56; // mm/s, Hall's 7 ft/min
  const REST_TO_HOOK_MS = 245; // midi2exp's green `fastC_decay_rate`

  const inflation = (ink: number): number => midi2expPort(ink) / openPort(ink);
  assert.ok(inflation(SHORT) > 1.7, `a short hole is inflated by ${inflation(SHORT).toFixed(2)}`);
  assert.ok(inflation(LONG) < 1.2, `a long one by only ${inflation(LONG).toFixed(2)}`);

  // Welte's two controls agree under the aperture model: six short holes present
  // as much open port as the single long one, which is what §4 and §6 require of
  // one another.
  assert.ok(
    Math.abs((6 * openPort(SHORT)) / openPort(LONG) - 1) < 0.05,
    `six short holes give ${(6 * openPort(SHORT)).toFixed(2)} mm against the long hole's ${openPort(LONG).toFixed(2)} mm`,
  );

  // Run against a rate calibrated at 245 ms from rest to the hook, the number of
  // short holes it takes to get there is what each port model says it is.
  const holesToHook = (port: (ink: number) => number): number =>
    REST_TO_HOOK_MS / ((port(SHORT) / SPEED) * 1000);
  assert.ok(Math.round(holesToHook(openPort)) === 5 || Math.round(holesToHook(openPort)) === 6,
    `the aperture model needs ${holesToHook(openPort).toFixed(1)}, and Welte says six`);
  assert.equal(Math.round(holesToHook(midi2expPort)), 3,
    `midi2exp needs only ${holesToHook(midi2expPort).toFixed(1)}, so it arrives after three and is clamped for the other three`);
});

test("the crescendo ceiling is an asymptote a sforzando can pass, not a cap", () => {
  // midi2exp clamps at `welte_loud` = 75 and PlaySK at 0.70. Here the ceiling is
  // the balance of throttle 98 against bore 100, so nothing stops conduit 23
  // driving the bellows past it.
  const params: Parameters = { ...BASS, alpha: 1, releaseTarget: 0 };
  const ceiling = params.crescendoRate! / (params.crescendoRate! + params.bleedRate!);
  const crescendoAlone = travelOf(6000, [punch("crescendo", 50, 5900)], params);
  assert.ok(Math.max(...crescendoAlone) <= ceiling + 1e-6, "a crescendo alone never passes it");

  const withSforzando = travelOf(6000, [punch("crescendo", 50, 5900), punch("sforzandoForte", 3000, 40)], params);
  assert.ok(Math.max(...withSforzando) > ceiling + 0.02, "and a sforzando carries it above");
});

test("every function starts late by its charge and ends late by its tail", () => {
  // All three prior programs switch on the port. Here the relay's membrane has to
  // charge before the valve lifts and bleeds away after the punch has gone, so
  // both edges are displaced, which is the whole of what the T-98 gives up by
  // deleting the hold chamber and keeps by keeping the bleed bore.
  const command = punch("crescendo", 100, 60);
  const travel = travelOf(900, [command], BASS);
  const rises = travel.findIndex((value) => value > 1e-4) / ROWS_PER_MM;
  const peaks = travel.reduce((most, value, index) => (value > travel[most]! ? index : most), 0) / ROWS_PER_MM;

  assert.ok(rises >= 100 - TRACKER_BORE_T98_MM, `the port cannot open before ${rises.toFixed(2)} mm`);
  assert.ok(peaks > 160, `and the bellows was still rising at ${peaks.toFixed(1)} mm, past the ink at 160`);
});

test("a constant-rate law and a gap-dependent one part company over a fast movement", () => {
  // midi2exp, pianolatron and PlaySK all move the dynamic at a fixed number of
  // units per millisecond for as long as a valve is open, which is alpha = 0 in
  // this family. PlaySK's curvature enters afterwards, through an assumed
  // quadratic position-to-vacuum fit, and not through a flow law.
  const code = [punch("sforzandoForte", 100, 30)];
  const gapDependent = travelOf(900, code, BASS);
  const constantRate = travelOf(900, code, { ...BASS, alpha: 0 });

  const divergence = (fromMm: number, toMm: number): number =>
    Math.max(
      ...Array.from({ length: Math.round((toMm - fromMm) * ROWS_PER_MM) }, (_, offset) => {
        const row = Math.round(fromMm * ROWS_PER_MM) + offset;
        return Math.abs(gapDependent[row]! - constantRate[row]!);
      }),
    );
  assert.ok(divergence(100, 130) > 0.3, `over the movement the two laws part by ${divergence(100, 130).toFixed(2)} of the scale`);
  assert.ok(
    levelAt(gapDependent, 110) > levelAt(constantRate, 110),
    "the gap-dependent law is ahead while the gap is wide, which is the whole of the movement",
  );
  assert.ok(divergence(300, 900) < divergence(100, 130), "and they come back together once nothing is commanded");
});

test("a shorter perforation does less, but never nothing, and the fill time is why", () => {
  // Welte's §6 requires six perforations "appreciably shorter" than the six test
  // ones to move the bellows *not at all*, and §2.2 of the specification reads
  // that as the relay's threshold. `tripThreshold` cannot deliver it: a punched
  // hole is round and 1.594 mm across, so a slot of any length whatever still
  // uncovers the whole of the 1.413 mm bore as its centre passes, and the charge
  // reaches the trip however short the ink is. What separates a short hole from a
  // long one is only how long the port stays open, so the separation is carried
  // by `forteFillMs` and grows with it — and even at 60 ms it is a fifth of a
  // step, not nothing.
  //
  // Recorded rather than repaired. Two readings are open and the tests cannot
  // choose between them: either Welte's "kürzere" holes are fewer punches rather
  // than shorter slots, which is what §2.4a's 2.66 mm grid implies for green
  // paper, or the scale roll is punched with a smaller tool than a music roll.
  // The T-100's fitted fill times of 0.4 and 3.0 ms are in any case far too fast
  // for a threshold of this kind; its own default of 30 ms is nearer.
  const reachedWith = (inkMm: number, fillMs: number): number =>
    Math.max(...travelOf(900, steps("sforzandoForte", 100, 6, { lengthMm: inkMm, pitchMm: 20 }), { ...BASS, forteFillMs: fillMs }));
  const separation = (fillMs: number): number => reachedWith(PUNCH_T98_MM, fillMs) - reachedWith(0.1, fillMs);

  assert.ok(separation(BASS.forteFillMs!) > 0, "a shorter hole does move the bellows less");
  assert.ok(separation(BASS.forteFillMs!) < 0.02, `but at the fitted fill time only by ${separation(BASS.forteFillMs!).toFixed(4)}`);
  assert.ok(separation(60) > 2 * separation(BASS.forteFillMs!), "a slower chamber separates them further");
  assert.ok(separation(60) < 0.1, `and even at 60 ms only by ${separation(60).toFixed(4)}, which is not "not at all"`);
});
