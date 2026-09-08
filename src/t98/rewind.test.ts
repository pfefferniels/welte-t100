import { test } from "node:test";
import assert from "node:assert/strict";

import type { Parameters } from "../core/types.ts";
import type { Punch } from "./codes.ts";
import { PUNCH_T98_MM } from "./geometry.ts";
import { STARTING_VALUES } from "./instruments.ts";
import { sforzandoPianoLift } from "./model.ts";
import { rewindAt, shutOffTravel, SHUT_OFF } from "./rewind.ts";
import { chained, greenGrid, GREEN_SPEED, inputOver, punch, steps } from "./synthetic.ts";

const BASS: Parameters = STARTING_VALUES.bass;
const LENGTH = 900;

const liftOver = (punches: readonly Punch[]): Float64Array =>
  sforzandoPianoLift(inputOver(greenGrid(LENGTH), punches), BASS);

const tripsAt = (punches: readonly Punch[]): number | undefined => {
  const grid = greenGrid(LENGTH);
  return rewindAt(sforzandoPianoLift(inputOver(grid, punches), BASS), grid.dt);
};

test("the musical forzando-piano perforations of a green roll do not trip the shut-off", () => {
  // Skala-Rolle §10: the Abstellbalg must have "beträchtlichen toten Gang, in dem
  // sich die Bewegungen der kurzen Forzando-P-Lochungen verlieren". On the green
  // copy of roll 225 the 29 musical groups on that track run 1.4 to 4.7 mm.
  assert.equal(tripsAt([punch("sforzandoPiano", 100, 4.7)]), undefined, "the longest musical group measured");
  assert.equal(tripsAt(steps("sforzandoPiano", 100, 12, { lengthMm: 4.7, pitchMm: 20 })), undefined, "nor a dozen of them");
});

test("a long perforation trips it, and the roll goes back", () => {
  // The rewind chain on that roll is 385.8 mm of 177 punches, two orders of
  // magnitude longer than any musical group.
  const trip = tripsAt(chained("sforzandoPiano", 100, 385.8));
  assert.ok(trip !== undefined, "a 385.8 mm chain trips the contact");

  const grid = greenGrid(LENGTH);
  const paper = grid.rowAt(trip!) / (grid.length / LENGTH);
  assert.ok(paper > 100 && paper < 100 + 60, `it trips ${(paper - 100).toFixed(0)} mm into the perforation, not at its start`);
});

test("Welte's own test pair decides the right way round", () => {
  // Skala-Rolle §10 carries two test perforations, "die erste kürzere darf der
  // Kontakt nicht ausgelöst werden; dagegen durch die zweite längere muß er
  // ausgelöst werden". Neither length is printed, so what is testable is that
  // some threshold separates them; these constants put it at about 20 mm of
  // paper, four times the longest musical group and one twentieth of the rewind.
  assert.equal(tripsAt([punch("sforzandoPiano", 100, 10)]), undefined, "10 mm does not");
  assert.ok(tripsAt([punch("sforzandoPiano", 100, 40)]) !== undefined, "40 mm does");

  const grid = greenGrid(LENGTH);
  const trip = rewindAt(sforzandoPianoLift(inputOver(grid, [punch("sforzandoPiano", 100, 40)]), BASS), grid.dt)!;
  const seconds = grid.seconds[trip]!;
  const intoThePerforation = seconds * GREEN_SPEED - 100;
  assert.ok(
    intoThePerforation > 15 && intoThePerforation < 25,
    `it trips ${intoThePerforation.toFixed(1)} mm in, and the constants are calibrated for about 20`,
  );
});

test("the shut-off is throttled and dead-banded, which is what the two adjusters are", () => {
  const grid = greenGrid(LENGTH);
  const lift = sforzandoPianoLift(inputOver(grid, [punch("sforzandoPiano", 100, 40)]), BASS);
  const quick = shutOffTravel(lift, grid.dt, { ...SHUT_OFF, riseMs: SHUT_OFF.riseMs / 4 });
  const slow = shutOffTravel(lift, grid.dt, SHUT_OFF);
  assert.ok(Math.max(...quick) > Math.max(...slow), "throttle screw 2 sets how fast the bellows is drawn shut");

  const deeper = rewindAt(lift, grid.dt, { ...SHUT_OFF, trip: 0.9 });
  const shallower = rewindAt(lift, grid.dt, { ...SHUT_OFF, trip: 0.1 });
  assert.ok(shallower !== undefined && (deeper === undefined || deeper > shallower), "and the dead motion sets how much paper it takes");
});

test("the same valve goes on serving the sforzando-piano throughout", () => {
  // Betriebsanleitung p. 17: "Der Rücklauf der Notenrolle erfolgt durch dasselbe
  // Ventil, welches die Forzando-Piano-Funktion des Baß-Betonungs-Apparates
  // betätigt." The rewind is a second reader of one valve, not a second reading
  // of the code, so a long perforation drives the dynamic as well.
  const lift = liftOver([punch("sforzandoPiano", 100, 40)]);
  assert.ok(Math.max(...lift) > 0.9, "the valve is fully open under the rewind perforation");
  const short = liftOver([punch("sforzandoPiano", 100, PUNCH_T98_MM)]);
  assert.ok(Math.max(...short) > 0.9, "and under a musical one");
});
