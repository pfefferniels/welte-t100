import { test } from "node:test";
import assert from "node:assert/strict";

import { Grid } from "../roll/grid.ts";
import { portKey, type PortKey } from "../roll/aperture.ts";
import { halfPedalling, pedalDefaults, pedalSpans, runPedals, tiedToRise } from "./pedal.ts";
import type { PedalInput } from "./pedal.ts";

const ROWS_PER_SECOND = 600;
const LENGTH = 6000;

const rowsFor = (ms: number): number => Math.round((ms / 1000) * ROWS_PER_SECOND);

/** A grid of ten seconds at the roll's own resolution, with the named ports punched. */
function input(punches: Partial<Record<PortKey, [number, number][]>>): PedalInput {
  const grid = new Grid(0, Float64Array.from({ length: LENGTH }, (_, index) => index / ROWS_PER_SECOND));
  const ports = new Map<PortKey, Float64Array>();
  Object.entries(punches).forEach(([key, spans]) => {
    const series = new Float64Array(LENGTH);
    (spans ?? []).forEach(([from, to]) => series.fill(1, from, to));
    ports.set(key as PortKey, series);
  });
  return { grid, ports };
}

const DAMPER_ON = portKey("treble", "sustainPedal", "on");
const DAMPER_OFF = portKey("treble", "sustainPedal", "off");
const RAIL_ON = portKey("bass", "hammerRail", "on");
const RAIL_OFF = portKey("bass", "hammerRail", "off");

/** Rows from `from` until the travel first crosses `level`. */
function rowsUntil(travel: Float64Array, from: number, level: number): number {
  const at = travel.slice(from).findIndex((value) => value >= level);
  return at < 0 ? Number.POSITIVE_INFINITY : at;
}

test("a momentary punch on line 93 holds the dampers up until line 94 is read", () => {
  const punch = rowsFor(100);
  const { damper } = runPedals(
    input({ [DAMPER_ON]: [[600, 600 + punch]], [DAMPER_OFF]: [[3000, 3000 + punch]] }),
  );

  assert.ok(damper[2000]! > 0.99, "still up long after the setting punch has passed");
  assert.ok(damper[LENGTH - 1]! < 0.01, "and down again after the cancelling punch");
});

test("the relay delays both edges by about relayLagMs", () => {
  const punch = rowsFor(100);
  const lagMs = 60;
  const { damper } = runPedals(
    input({ [DAMPER_ON]: [[600, 600 + punch]], [DAMPER_OFF]: [[3000, 3000 + punch]] }),
    { ...pedalDefaults, relayLagMs: lagMs, liftMs: 1, fallMs: 1 },
  );

  // With the bellows made almost instant, what is left of each edge is the relay.
  const rise = rowsUntil(damper, 600, 0.5);
  const fall = rowsUntil(Float64Array.from(damper, (value) => 1 - value), 3000, 0.5);
  assert.ok(Math.abs(rise - rowsFor(lagMs)) <= 2, `rise delayed ${rise} rows, expected ${rowsFor(lagMs)}`);
  assert.ok(Math.abs(fall - rowsFor(lagMs)) <= 2, `fall delayed ${fall} rows, expected ${rowsFor(lagMs)}`);
});

test("the travel times are the ones the parameters name", () => {
  const punch = rowsFor(100);
  const { damper } = runPedals(
    input({ [DAMPER_ON]: [[600, 600 + punch]], [DAMPER_OFF]: [[3000, 3000 + punch]] }),
    { ...pedalDefaults, relayLagMs: 0, liftMs: 150, fallMs: 400 },
  );

  const rise = rowsUntil(damper, 600, 0.95);
  const fall = rowsUntil(Float64Array.from(damper, (value) => 1 - value), 3000, 0.95);
  assert.ok(Math.abs(rise - rowsFor(150)) <= 3, `rise took ${rise} rows, expected ${rowsFor(150)}`);
  assert.ok(Math.abs(fall - rowsFor(400)) <= 3, `fall took ${fall} rows, expected ${rowsFor(400)}`);
});

test("a press shorter than the travel leaves the dampers part way up", () => {
  const punch = rowsFor(100);
  const held = rowsFor(90);
  const ports = input({
    [DAMPER_ON]: [[600, 600 + punch]],
    [DAMPER_OFF]: [[600 + held, 600 + held + punch]],
  });
  const { damper } = runPedals(ports, { ...pedalDefaults, relayLagMs: 20, liftMs: 300, fallMs: 300 });

  const peak = damper.reduce((most, value) => Math.max(most, value), 0);
  assert.ok(peak > 0.05 && peak < 0.6, `dampers reached ${peak.toFixed(3)}, wanted a partial lift`);
});

test("tying the fall to the rise makes throttle 17 match throttle 11 and 16", () => {
  const punch = rowsFor(100);
  const ports = input({ [DAMPER_ON]: [[600, 600 + punch]], [DAMPER_OFF]: [[3000, 3000 + punch]] });
  const { damper } = runPedals(ports, tiedToRise({ ...pedalDefaults, relayLagMs: 0, liftMs: 200, fallMs: 900 }));

  const rise = rowsUntil(damper, 600, 0.95);
  const fall = rowsUntil(Float64Array.from(damper, (value) => 1 - value), 3000, 0.95);
  assert.equal(rise, fall, "the fall should have been overridden to the rise's 200 ms");
  assert.ok(Math.abs(rise - rowsFor(200)) <= 3);
});

test("the hammer rail moves at one speed in both directions", () => {
  const punch = rowsFor(100);
  const { hammerRail } = runPedals(
    input({ [RAIL_ON]: [[600, 600 + punch]], [RAIL_OFF]: [[3000, 3000 + punch]] }),
    { ...pedalDefaults, shiftMs: 250 },
  );

  const out = rowsUntil(hammerRail, 600, 0.95);
  const back = rowsUntil(Float64Array.from(hammerRail, (value) => 1 - value), 3000, 0.95);
  assert.ok(Math.abs(out - back) <= 1, `${out} rows out against ${back} back`);
  assert.ok(Math.abs(out - rowsFor(250)) <= 3);
});

test("a press cut short is counted as one the mechanism could not finish", () => {
  const punch = rowsFor(100);
  const held = rowsFor(90);
  const travel = runPedals(
    input({
      [DAMPER_ON]: [[600, 600 + punch]],
      [DAMPER_OFF]: [[600 + held, 600 + held + punch]],
    }),
    { ...pedalDefaults, relayLagMs: 20, liftMs: 300, fallMs: 300 },
  );
  const grid = new Grid(0, Float64Array.from({ length: LENGTH }, (_, index) => index / ROWS_PER_SECOND));
  const summary = halfPedalling(pedalSpans(travel, grid));

  assert.equal(summary.presses, 1);
  assert.equal(summary.unfinishedPresses, 1);
});
