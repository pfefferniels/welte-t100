/**
 * Welte's own regulation instructions, as tests.
 *
 * Each control of Hagmann's Anhang 12 and of Welte's *Skala-Rolle 98* states a
 * relation between perforations of the same length rather than a length Welte
 * prints, so all of them can be run against any parameter set and none of them
 * needs a fit. They are a **gate** on a fitted result and not a term in its
 * objective: a parameter set that violates one is reported as violating it, and
 * where several score alike on a drawn line the one that satisfies the controls
 * is preferred.
 *
 * The set under test is the unfitted starting values, so several of these record
 * a violation with its number rather than asserting Welte's own requirement.
 * That is deliberate. Every such test says what Welte requires, what the starting
 * values do, and which constant the gap belongs to, so that the numbers cannot
 * drift silently and a fit has somewhere to aim.
 *
 * A caution about the step-count controls: Welte does not say how far apart the
 * six or three test perforations sit, and the automatic decrescendo pulls the
 * bellows back between them, so the step count depends on that pitch. It is
 * stated here as 20 mm, about 560 ms, which is far enough apart for a technician
 * to see six distinct movements.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import type { Parameters } from "../core/types.ts";
import { PUNCH_T98_MM } from "./geometry.ts";
import { STARTING_VALUES } from "./instruments.ts";
import { levelAt, punch, steps, travelOf } from "./synthetic.ts";

const BASS: Parameters = STARTING_VALUES.bass;
const HOOK = BASS.mezzoforte!;
const PITCH = 20;
const LENGTH = 900;

/** Where the bellows has come to rest after the `index`-th of a run of steps. */
const afterStep = (travel: Float64Array, index: number, from = 100): number =>
  levelAt(travel, from + index * PITCH + PITCH * 0.9);

/** How many of Welte's short forzando-forte perforations it takes to reach the hook. */
function stepsToHook(params: Parameters, count = 8): number {
  const travel = travelOf(LENGTH, steps("sforzandoForte", 100, count, { pitchMm: PITCH }), params);
  const reached = Array.from({ length: count }, (_, index) => afterStep(travel, index)).findIndex(
    (level) => level >= (params.mezzoforte ?? HOOK),
  );
  return reached < 0 ? Number.POSITIVE_INFINITY : reached + 1;
}

test("six short forzando-forte perforations climb in six visible steps", () => {
  // Skala-Rolle §6, Hagmann control 4b: the bellows makes six short jerking
  // movements upward. Whether the sixth is the one that touches the hook is the
  // next test; that each perforation gives a distinct upward step, and that they
  // shrink as the bellows approaches its target, is a property of the flow law
  // and holds whatever the rates are.
  const travel = travelOf(LENGTH, steps("sforzandoForte", 100, 6, { pitchMm: PITCH }), BASS);
  const levels = Array.from({ length: 6 }, (_, index) => afterStep(travel, index));

  levels.forEach((level, index) => {
    if (index === 0) return;
    assert.ok(level > levels[index - 1]! + 0.005, `step ${index + 1} did not rise: ${levels.join(" ")}`);
  });

  const gains = levels.map((level, index) => level - (index === 0 ? 0 : levels[index - 1]!));
  assert.ok(gains[5]! < gains[0]!, "and the steps shrink as the target is approached, which alpha = 0 would not give");
});

test("the starting values reach the hook after three steps, where Welte requires six", () => {
  // Skala-Rolle §6: "Trifft schon die fünfte an den Haken, so macht man das
  // Entziehungsloch der Membrane des Forzando-F-Ventils größer." The starting
  // value of `sforzandoForteRate` is therefore about twice too fast, and the
  // reason is that §2.7 of the model specification derived it on the assumption
  // that the valve lift follows the port aperture, with no threshold and no
  // tail, while §2.2's relay has both: a 75 ms tail on a 45 ms punch more than
  // doubles the time conduit 23 actually draws. The control is the constraint a
  // fit should carry, and this records the gap rather than tuning it away.
  assert.equal(stepsToHook(BASS), 3);

  // and the control does bite: a slower conduit 23 needs more of them
  assert.ok(stepsToHook({ ...BASS, sforzandoForteRate: BASS.sforzandoForteRate! / 3 }) > 3);
});

test("three short forzando-piano perforations should return the bellows, and one already does", () => {
  // Skala-Rolle §4, third movement, and Hagmann control 4e: from full closure
  // three short forzando-P perforations must leave the bellows just fully open
  // after the third and not yet after the second. "Öffnet die dritte Lochung den
  // Balg noch nicht vollständig, so ist das Entziehungsloch zu groß."
  const closed = punch("crescendo", 0, 300);
  const travel = travelOf(LENGTH, [closed, ...steps("sforzandoPiano", 320, 3, { pitchMm: PITCH })], BASS);
  assert.ok(levelAt(travel, 315) > 0.6, "the crescendo has closed the bellows first");

  const after = Array.from({ length: 3 }, (_, index) => afterStep(travel, index, 320));
  assert.ok(after[0]! < 0.1, `the first already all but empties it: ${after.map((v) => v.toFixed(3)).join(" ")}`);
  // The same finding as the forzando-forte control, on the other conductance:
  // `sforzandoPianoRate` is about three times too fast once the relay's tail is
  // taken into account.
  assert.ok(after[1]! < 1e-3 && after[2]! < 1e-3, "and the second and third have nothing left to do");
});

test("a short forzando-piano halts short of rest and then creeps towards it", () => {
  // Skala-Rolle §4, second movement: after a short forzando-P from full closure
  // the bellows "darf nicht sofort in die Ruhestellung zurückkehren, sondern soll
  // einige mm vor derselben Halt machen und sich dann langsam öffnen." The model
  // reproduces it with no special case: the valve's charge falls back below the
  // trip before the bellows has arrived, and bore 100 finishes the journey.
  const travel = travelOf(
    LENGTH,
    [punch("crescendo", 0, 300), punch("sforzandoPiano", 320, PUNCH_T98_MM)],
    { ...BASS, sforzandoPianoRate: BASS.sforzandoPianoRate! / 4 },
  );
  const halted = levelAt(travel, 340);
  assert.ok(halted > 0.02 && halted < 0.5, `halted at ${halted.toFixed(4)}, which is short of rest but well down`);
  assert.ok(levelAt(travel, 500) < halted, "and it goes on opening slowly afterwards");
  assert.ok(levelAt(travel, 880) < 0.01, "until it is at rest");
});

test("a long forzando-piano from the closed rail reaches the open one", () => {
  // Skala-Rolle §4, first movement, and Hagmann control 4c.
  const travel = travelOf(LENGTH, [punch("crescendo", 0, 300), punch("sforzandoPiano", 320, 20)], BASS);
  assert.ok(levelAt(travel, 315) > 0.6);
  assert.ok(levelAt(travel, 350) < 1e-3, "fully open before the perforation has passed");
});

test("mezzoforte holds the bellows at the hook and releasing it lets it run to forte", () => {
  // Hagmann control 7 and Welte, Betriebsanleitung p. 12: mezzoforte with
  // crescendo and sforzando-forte commanded holds the bellows at the hook, and
  // when the mezzoforte perforation ends it must move "rasch in die
  // Forte-Stellung". The spring on bellows 93 opens it even under the pin's
  // load, which is what Test Roll §7 checks.
  const travel = travelOf(LENGTH, [
    punch("mezzoforte", 100, 300),
    punch("crescendo", 110, 700),
    punch("sforzandoForte", 110, 700),
  ], BASS);
  const heldAt = levelAt(travel, 380);
  assert.ok(Math.abs(heldAt - HOOK) < 0.04, `held at ${heldAt.toFixed(3)} against a hook at ${HOOK}`);
  assert.ok(levelAt(travel, 450) > heldAt + 0.2, "and once the pin withdraws it runs on rapidly");
  assert.ok(levelAt(travel, 600) > 0.95, "to forte");
});

test("sforzando pairs during a crescendo hold the bellows down while they last", () => {
  // Hagmann controls 6a and 6c: five sforzando on/off pairs during a crescendo do
  // not stop the bellows closing fully, and nine hold it at mezzoforte. The green
  // roll has no "off" line, so a pair is a forzando-forte perforation followed by
  // a forzando-piano one, which is the punching Schmitz describes: "einer
  // forzando-forte-Lochung von 1,8 mm Länge kann 0,7 mm hinter dem Lochanfang
  // eine forzando-piano-Lochung folgen" (1981, p. 7).
  const pairs = (count: number) =>
    Array.from({ length: count }, (_, index) => [
      punch("sforzandoForte", 150 + index * 30, PUNCH_T98_MM),
      punch("sforzandoPiano", 150 + index * 30 + 8, PUNCH_T98_MM),
    ]).flat();

  const withFive = travelOf(1400, [punch("crescendo", 50, 1300), ...pairs(5)], BASS);
  const withNine = travelOf(1400, [punch("crescendo", 50, 1300), ...pairs(9)], BASS);
  assert.ok(levelAt(withFive, 1300) > 0.85, "five pairs do not stop the crescendo closing the bellows");
  assert.ok(levelAt(withNine, 400) < levelAt(withFive, 400), "and more of them hold it lower for longer");
});

test("the crescendo's ceiling and the bleed are what the two screws are", () => {
  // Welte, Betriebsanleitung p. 13: opening bore 100 weakens the crescendo, "man
  // muß deshalb die Einstellung der Creszendo-F.-Schraube korrigieren, sobald man
  // die des Creszendo P. verändert hat, und umgekehrt". The interaction is not
  // asserted anywhere in the model; it is what the balance of the two produces.
  const ceilingWith = (bleedRate: number): number =>
    Math.max(...travelOf(6000, [punch("crescendo", 50, 5900)], { ...BASS, alpha: 1, releaseTarget: 0, bleedRate }));
  assert.ok(ceilingWith(BASS.bleedRate! * 3) < ceilingWith(BASS.bleedRate!), "a wider Crescendo-P lowers the ceiling");
  assert.ok(ceilingWith(0) > 0.99, "and with it shut the crescendo alone would close the bellows fully");
});
