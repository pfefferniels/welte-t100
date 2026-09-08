import { test } from "node:test";
import assert from "node:assert/strict";

import { circumferenceAt, paperAt, paperSeconds, paperSpeed, WELTE_SPOOL, type Spool } from "./spool.ts";

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
