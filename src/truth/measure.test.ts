import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { loadRoll } from "../roll/load.ts";
import { HALVES } from "../roll/expression.ts";
import { HEADLINE_DRUID, MEASURED_3309 } from "../cli/settings.ts";
import { MF_THICKNESS } from "../model/stop.ts";
import { measureRoll, parametersOf, withheldFrom, type RollMeasurement } from "./measure.ts";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * The traced line and the SUPRA scan live in `roll-nuance-tracer`, one level
 * above this repository, and are not published with it. Without them there is
 * nothing to measure, so the test says so rather than failing.
 */
const MATERIAL = [
  join(REPO, "out", HEADLINE_DRUID, "curves.csv"),
  join(REPO, "cache", HEADLINE_DRUID, `${HEADLINE_DRUID}_raw.mid`),
];
const skip = MATERIAL.every(existsSync)
  ? undefined
  : `roll ${HEADLINE_DRUID} is not traced beside this repository`;

/** Reading and measuring the roll takes half a second; both tests want the same one. */
let held: RollMeasurement | undefined;
const measured = (): RollMeasurement => (held ??= measureRoll(loadRoll(HEADLINE_DRUID)));

/**
 * What the measurement has to reproduce, and by how much. The rails are read off
 * a histogram of 0.005, so half a bin is the floor on their agreement; the hook
 * face carries the scatter between visits; and the lead is a median over a few
 * hundred collapses, quoted in whole scan rows.
 */
const TOLERANCE: Readonly<Record<string, number>> = {
  piano: 0.01,
  forte: 0.01,
  mezzoforte: 0.02,
  leadRows: 10,
};

test("the measurement reproduces what docs/measurements.md read off roll 3309", { skip }, () => {
  const roll = measured();
  HALVES.forEach((half) => {
    const found = parametersOf(roll[half], MF_THICKNESS);
    Object.entries(TOLERANCE).forEach(([name, tolerance]) => {
      const published = MEASURED_3309[half][name]!;
      assert.ok(
        Math.abs(found[name]! - published) <= tolerance,
        `${half} ${name}: measured ${found[name]}, published ${published}, tolerance ${tolerance}`,
      );
    });
  });
});

test("the hook face rests between the rails and on enough arrivals to mean it", { skip }, () => {
  const roll = measured();
  HALVES.forEach((half) => {
    const { rails, hook, lead } = roll[half];
    assert.ok(rails.piano < hook.level && hook.level < rails.forte, `${half}: hook outside the rails`);
    assert.ok(hook.arrivals > 50, `${half}: only ${hook.arrivals} arrivals from above`);
    assert.ok(lead.falls > 100, `${half}: only ${lead.falls} collapses to place the lead by`);
  });
});

test("roll 3309 shows all four constants, so the fit pins all four", { skip }, () => {
  const roll = measured();
  HALVES.forEach((half) => {
    const pinned = parametersOf(roll[half], MF_THICKNESS);
    assert.deepEqual(Object.keys(pinned).sort(), Object.keys(TOLERANCE).sort(), `${half}`);
    assert.deepEqual(withheldFrom(roll[half]), [], `${half} withholds something`);
  });
});
