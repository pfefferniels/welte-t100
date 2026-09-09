import { test } from "node:test";
import assert from "node:assert/strict";

import {
  circumferenceAt,
  paperAt,
  paperSeconds,
  paperSpeed,
  WELTE_SPOOL,
  WELTE_T98_SPOOL,
  type Spool,
} from "./spool.ts";

/** Gottschewski's own worked figures, p. 135 and p. 137. */
const FIRST_STRETCH_CM = 145;

function close(actual: number, expected: number, tolerance: number, what: string): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${what}: ${actual.toFixed(6)} is further than ${tolerance} from ${expected}`,
  );
}

test("the circumference grows by 0.047 cm per revolution", () => {
  // One revolution takes up the paper its own circumference is long (p. 135).
  const wound = circumferenceAt(WELTE_SPOOL, WELTE_SPOOL.circumferenceCm);
  close(wound - WELTE_SPOOL.circumferenceCm, 0.047, 0.0005, "growth per revolution");
});

test("the first 1.45 m average 22.4 cm of circumference and take 30 s", () => {
  const end = circumferenceAt(WELTE_SPOOL, FIRST_STRETCH_CM);
  close((WELTE_SPOOL.circumferenceCm + end) / 2, 22.4, 0.01, "mean circumference");
  close(paperSeconds(WELTE_SPOOL, FIRST_STRETCH_CM), 30, 0.05, "seconds over the first stretch");
});

test("a falsified layer thickness is how the circumference effect enters", () => {
  // p. 137: 0.0060 in place of 0.0075 is his own way of writing 80 % effect.
  const falsified: Spool = { ...WELTE_SPOOL, layerCm: 0.006 };
  const eighty: Spool = { ...WELTE_SPOOL, circumferenceEffect: 0.8 };
  close(paperSeconds(eighty, 1600), paperSeconds(falsified, 1600), 1e-9, "80 % effect");
});

test("no effect leaves a constant paper speed", () => {
  const flat: Spool = { ...WELTE_SPOOL, circumferenceEffect: 0 };
  close(paperSpeed(flat, 1600), paperSpeed(flat, 0), 1e-12, "speed after 16 m");
  close(paperSeconds(flat, 1600), 1600 / paperSpeed(flat, 0), 1e-9, "seconds at a constant speed");
});

test("the elapsed time is the integral of the speed it reports", () => {
  const steps = 200_000;
  const span = 1700;
  const midpoints = Array.from({ length: steps }, (_, index) => ((index + 0.5) * span) / steps);
  const numeric = midpoints.reduce((total, cm) => total + span / steps / paperSpeed(WELTE_SPOOL, cm), 0);
  close(paperSeconds(WELTE_SPOOL, span), numeric, 1e-6, "closed form against the integral");
});

test("paper before the starting point takes negative time", () => {
  close(paperSeconds(WELTE_SPOOL, -12), -12 / paperSpeed(WELTE_SPOOL, -6), 1e-3, "the run-up to the first hole");
});

test("the paper wound after a time inverts the time a length of paper takes", () => {
  [0, 12, 145, 1700].forEach((cm) => {
    close(paperAt(WELTE_SPOOL, paperSeconds(WELTE_SPOOL, cm)), cm, 1e-9, `${cm} cm round trip`);
  });
  const flat: Spool = { ...WELTE_SPOOL, circumferenceEffect: 0 };
  close(paperAt(flat, 60), 60 * paperSpeed(flat, 0), 1e-9, "a minute at constant speed");
});

/**
 * The six tempo cross-lines of the Monteurscala `gq104tn4658`, in play-order
 * rows from the roll's start, against the first bass "A" at row 15612. Welte's
 * rule is half a minute from the "A" to the line bearing the dial's number
 * (Skala-Rolle 98 §1b), so each is an independent check on the green spool.
 */
const CROSS_LINES: readonly (readonly [number, number])[] = [
  [20, 19183.9],
  [40, 22787.2],
  [60, 26405.3],
  [80, 30014.5],
  [100, 33671.6],
  [120, 37351.2],
];

const FIRST_A_ROW = 15612;
const ROWS_PER_CM = (300.25 / 25.4) * 10;

test("the green spool takes half a minute to each of Welte's six cross-lines", () => {
  const start = FIRST_A_ROW / ROWS_PER_CM;

  CROSS_LINES.forEach(([tempo, row]) => {
    // Each setting has its own throttle screw, so the speed is scaled to the
    // dial rather than read off it: the lines are what define the settings.
    const geared: Spool = {
      ...WELTE_T98_SPOOL,
      revolutionSeconds: (WELTE_T98_SPOOL.revolutionSeconds * 70) / tempo,
    };
    const seconds = paperSeconds(geared, row / ROWS_PER_CM) - paperSeconds(geared, start);
    close(seconds, 30, 0.25, `Tempo ${tempo} reaches its line`);
  });

  // At paper zero, which is what the constant states. By the first "A" the
  // spool has already grown through 132 cm and the paper runs 2.4 % faster.
  close(paperSpeed(WELTE_T98_SPOOL, 0) * 10, 34.381, 0.01, "paper speed at Tempo 70, in mm/s");
  close(paperSpeed(WELTE_T98_SPOOL, start) * 10, 35.198, 0.01, "and by the first \"A\"");
});

test("green paper accelerates faster than red, as the thicker layer requires", () => {
  const overRoll = (spool: Spool): number =>
    paperSpeed(spool, 2986) / paperSpeed(spool, 139);

  assert.ok(
    overRoll(WELTE_T98_SPOOL) > overRoll(WELTE_SPOOL),
    "the green roll should speed up more across its length than the red",
  );
  close(WELTE_T98_SPOOL.layerCm / WELTE_SPOOL.layerCm, 1.91, 0.01, "green layer against red");
});
