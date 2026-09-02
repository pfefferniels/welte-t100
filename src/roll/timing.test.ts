import { test } from "node:test";
import assert from "node:assert/strict";

import { spoolAxis } from "./timing.ts";
import { paperSeconds, WELTE_SPOOL } from "./spool.ts";

/** Roll 3309: 300.25 px per inch of paper, 196624 rows of music. */
const PPI = 300.25;
const LENGTH = 196624;

test("the axis starts at the first hole and runs on the spool law", () => {
  const axis = spoolAxis(WELTE_SPOOL, PPI, LENGTH);
  assert.equal(axis.secondsAtTick(0), 0);
  assert.equal(axis.secondsAtTick(LENGTH), paperSeconds(WELTE_SPOOL, (LENGTH / PPI) * 2.54));
});

test("the exported segments meet the axis at their own boundaries", () => {
  const axis = spoolAxis(WELTE_SPOOL, PPI, LENGTH);
  const drift = axis.segments.map((segment) => Math.abs(segment.seconds - axis.secondsAtTick(segment.tick)));
  assert.ok(Math.max(...drift) < 1e-12, "segment boundaries carry the axis' own seconds");

  const withinSegment = axis.segments.map((segment) => {
    const half = segment.tick + 1800;
    return Math.abs(segment.seconds + 1800 / segment.ticksPerSecond - axis.secondsAtTick(half));
  });
  // A tempo map holds one speed per segment where the paper keeps accelerating,
  // so mid-segment it lags the axis by rather more than the 1.7 ms a row lasts.
  // That is why the model reads the closed form and not the map it exports.
  assert.ok(Math.max(...withinSegment) < 0.003, "a foot of staircase stays under 3 ms");
  assert.ok(Math.max(...withinSegment) > 0.002, "and is worth more than a row, so it is not used");
});
