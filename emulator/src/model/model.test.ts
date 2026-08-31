import { test } from "node:test";
import assert from "node:assert/strict";

import { Grid } from "../roll/grid.ts";
import { portKey, type PortKey } from "../roll/aperture.ts";
import { latched, momentary } from "./latch.ts";
import { limitAtStop, newStopState } from "./stop.ts";
import { pneumaticModel } from "./pneumatic.ts";
import { midi2expModel } from "./midi2exp.ts";
import { shiftedByRows, type ModelInput, type Parameters } from "./types.ts";
import { traversals } from "./timings.ts";

const LENGTH = 4000;
const ROWS_PER_SECOND = 600;

function input(ports: Partial<Record<string, [number, number][]>>): ModelInput {
  const grid = new Grid(0, Float64Array.from({ length: LENGTH }, (_, index) => index / ROWS_PER_SECOND));
  const map = new Map<PortKey, Float64Array>();
  Object.entries(ports).forEach(([key, spans]) => {
    const series = new Float64Array(LENGTH);
    (spans ?? []).forEach(([from, to]) => series.fill(1, from, to));
    map.set(key as PortKey, series);
  });
  const quiet = new Float64Array(LENGTH);
  return { grid, half: "bass", ports: map, noteDensity: quiet, totalNoteDensity: quiet };
}

test("a latch holds until it is cancelled", () => {
  const on = new Float64Array(10);
  const off = new Float64Array(10);
  on[2] = 1;
  off[6] = 1;
  assert.deepEqual([...latched(on, off)], [0, 0, 1, 1, 1, 1, 0, 0, 0, 0]);
});

test("a cancel beats a set arriving in the same row", () => {
  const both = Float64Array.from([0, 1, 0]);
  assert.deepEqual([...latched(both, both)], [0, 0, 0]);
});

test("a momentary port is on only while it is open", () => {
  assert.deepEqual([...momentary(Float64Array.from([0, 1, 1, 0]))], [0, 1, 1, 0]);
});

test("the Mezzoforte pin, one-sided, catches the line but cannot lift it", () => {
  const state = newStopState();
  assert.equal(limitAtStop(state, true, 0.3, 0.35, 0.5, false), 0.35, "below the stop, nothing happens");
  assert.equal(limitAtStop(state, true, 0.6, 0.45, 0.5, false), 0.5, "having reached it, it is caught");
  assert.equal(limitAtStop(state, true, 0.5, 0.9, 0.5, false), 0.9, "and is still free to close");
});

test("the Mezzoforte pin, two-sided, traps the line on the side it was on", () => {
  const below = newStopState();
  assert.equal(limitAtStop(below, true, 0.3, 0.7, 0.5, true), 0.5);
  const above = newStopState();
  assert.equal(limitAtStop(above, true, 0.7, 0.3, 0.5, true), 0.5);
});

test("releasing the hook frees the line again", () => {
  const state = newStopState();
  limitAtStop(state, true, 0.6, 0.5, 0.5, false);
  assert.equal(limitAtStop(state, false, 0.5, 0.2, 0.5, false), 0.2);
});

test("shifting by whole rows moves the series and holds the ends", () => {
  const series = Float64Array.from([0, 1, 2, 3, 4]);
  assert.deepEqual([...shiftedByRows(series, 0)], [0, 1, 2, 3, 4]);
  assert.deepEqual([...shiftedByRows(series, 2)], [0, 0, 0, 1, 2]);
  assert.deepEqual([...shiftedByRows(series, -2)], [2, 3, 4, 4, 4]);
});

test("a latched crescendo closes the bellows and a cancel reopens it", () => {
  const model = input({
    [portKey("bass", "crescendo", "on")]: [[100, 120]],
    [portKey("bass", "crescendo", "off")]: [[2000, 2020]],
  });
  const out = pneumaticModel.run(model, { ...pneumaticModel.defaults, leadRows: 0 });
  assert.ok(out[1900]! > out[200]!, "rises while the crescendo is set");
  assert.ok(out[3900]! < out[1900]!, "falls again once it is cancelled");
});

test("with nothing punched the bellows sits open", () => {
  const out = pneumaticModel.run(input({}), { ...pneumaticModel.defaults, leadRows: 0 });
  assert.ok(Math.max(...out) < 0.05);
});

test("a sforzando closes the bellows faster than a crescendo does", () => {
  const settings = { ...pneumaticModel.defaults, leadRows: 0, sforzandoLatches: 1 };
  const crescendo = pneumaticModel.run(input({ [portKey("bass", "crescendo", "on")]: [[10, 30]] }), settings);
  const sforzando = pneumaticModel.run(input({ [portKey("bass", "sforzando", "on")]: [[10, 30]] }), settings);
  assert.ok(sforzando[200]! > crescendo[200]!);
});

test("the Mezzoforte hook stops a rising line at its upper face", () => {
  const settings: Parameters = { ...pneumaticModel.defaults, leadRows: 0, mfTwoSided: 1, stopStiffness: 0 };
  const out = pneumaticModel.run(
    input({
      [portKey("bass", "mezzoforte", "on")]: [[10, 30]],
      [portKey("bass", "crescendo", "on")]: [[40, 60]],
    }),
    settings,
  );
  assert.ok(Math.max(...out) <= settings.mezzoforte! + settings.mfThickness! / 2 + 1e-9);
});

test("a compliant hook lets the line overshoot and spring back", () => {
  // The bellows is driven hard onto the stop from below, so it arrives with
  // momentum. A springy contact must let it past and then return it.
  const ports = {
    [portKey("bass", "mezzoforte", "on")]: [[10, 30]] as [number, number][],
    [portKey("bass", "sforzando", "on")]: [[40, 90]] as [number, number][],
  };
  const settings: Parameters = { ...pneumaticModel.defaults, leadRows: 0, mfTwoSided: 1, sforzandoLatches: 1 };
  const level = settings.mezzoforte! + settings.mfThickness! / 2;

  const rigid = pneumaticModel.run(input(ports), { ...settings, stopStiffness: 0 });
  const springy = pneumaticModel.run(input(ports), { ...settings, stopStiffness: 20000, stopDamping: 30 });

  assert.ok(Math.max(...rigid) <= level + 1e-9, "a wall holds it exactly");
  const overshoot = Math.max(...springy) - level;
  assert.ok(overshoot > 0.002, `a spring lets it past, overshoot ${overshoot.toFixed(4)}`);
  assert.ok(overshoot < 0.2, "but not without limit");
  assert.ok(Math.abs(springy.at(-1)! - level) < 0.05, "and it settles back at the stop");
});

test("a long cancel returns the bellows further than a short one", () => {
  // Welte's controls 4c and 4d: a long Sforzando-ab perforation brings the
  // bellows fully back to piano, a short one only part of the way. The relay
  // membrane has to charge for that to be possible at all — a valve that simply
  // follows its port cannot tell the two apart.
  const settings: Parameters = { ...pneumaticModel.defaults, leadRows: 0, leadDriftRows: 0, assistFillMs: 90 };
  const fall = (cancelRows: number): number => {
    const ports = {
      [portKey("bass", "crescendo", "on")]: [[10, 30]] as [number, number][],
      [portKey("bass", "sforzando", "on")]: [[40, 100]] as [number, number][],
      [portKey("bass", "sforzando", "off")]: [[1200, 1200 + cancelRows]] as [number, number][],
    };
    const out = pneumaticModel.run(input(ports), settings);
    const before = out[1190]!;
    let lowest = before;
    for (let i = 1200; i < Math.min(1200 + 900, out.length); i += 1) lowest = Math.min(lowest, out[i]!);
    return before - lowest;
  };

  const short = fall(25);
  const long = fall(220);
  assert.ok(long > short + 0.02, `long cancel ${long.toFixed(3)} should exceed short ${short.toFixed(3)}`);
  assert.ok(short > 0.005, "a short cancel still does something");
});

test("midi2exp reduces to its published constants", () => {
  const out = midi2expModel.run(input({ [portKey("bass", "crescendo", "on")]: [[0, 20]] }), midi2expModel.defaults);
  const rate = (out[600]! - out[0]!) / 1;
  const expected = (midi2expModel.defaults.mezzoforte! - midi2expModel.defaults.piano!) / 2.38;
  assert.ok(Math.abs(rate - expected) < 0.01, `${rate} against ${expected}`);
});

test("travel times invert the flow law", () => {
  const times = traversals({
    ...pneumaticModel.defaults,
    alpha: 1,
    piano: 0,
    forte: 1,
    mezzoforte: 0.5,
    crescendoRate: 1,
    crescendoTarget: 1,
  });
  // exponential approach: t = tau ln((T - a) / (T - b)) = 1 * ln(1 / 0.5)
  const expected = Math.log(2) * 1000;
  assert.ok(Math.abs(times["slow crescendo, P to M.F."]!.milliseconds - expected) < 5);
});

test("the terms added for the transits are inert at their defaults", () => {
  // Each nests the model that was there before it: a lift band covering the whole
  // charge above the threshold, and no load, drag or grip. The comparisons that
  // price them are only meaningful while this holds, so it is pinned here rather
  // than left to be noticed.
  const ports = {
    [portKey("bass", "crescendo", "on")]: [[10, 40]] as [number, number][],
    // cancelled again before the sforzando, so the through-flow gate opens: it
    // acts only while conduit 39 stands open to atmosphere and the valve draws
    [portKey("bass", "crescendo", "off")]: [[50, 70]] as [number, number][],
    [portKey("bass", "sforzando", "on")]: [[80, 110]] as [number, number][],
    [portKey("bass", "sforzando", "off")]: [[140, 170]] as [number, number][],
    [portKey("bass", "mezzoforte", "on")]: [[190, 220]] as [number, number][],
  };
  const neutral: Parameters = {
    ...pneumaticModel.defaults,
    leadRows: 0,
    valveBand: 1,
    assistBand: 1,
    throughFlowLoad: 0,
    dragThreshold: 0,
    railGrip: 0,
  };
  const asDefaulted = pneumaticModel.run(input(ports), { ...pneumaticModel.defaults, leadRows: 0 });
  const asNeutral = pneumaticModel.run(input(ports), neutral);

  assert.equal(asDefaulted.length, asNeutral.length);
  asDefaulted.forEach((value, index) => {
    assert.ok(
      Math.abs(value - asNeutral[index]!) < 1e-12,
      `row ${index} differs: ${value} against ${asNeutral[index]}`,
    );
  });

  // and each of them does something once it is off its neutral value
  for (const [name, value] of [["valveBand", 0.2], ["throughFlowLoad", 0.5], ["dragThreshold", 0.4]] as const) {
    const moved = pneumaticModel.run(input(ports), { ...neutral, [name]: value });
    const changed = moved.some((v, i) => Math.abs(v - asNeutral[i]!) > 1e-9);
    assert.ok(changed, `${name} did nothing when moved to ${value}`);
  }
});
