import { test } from "node:test";
import assert from "node:assert/strict";

import { Grid } from "../roll/grid.ts";
import { portKey, type PortKey } from "../roll/aperture.ts";
import { latched, momentary } from "./latch.ts";
import { limitAtStop, MF_THICKNESS, newStopState } from "./stop.ts";
import { pneumaticModel } from "./pneumatic.ts";
import { shiftedByRows, type ModelInput, type Parameters } from "./types.ts";

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
  return { grid, half: "bass", ports: map };
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

test("the Mezzoforte pin traps the line on the side it was on", () => {
  const below = newStopState();
  assert.equal(limitAtStop(below, true, 0.3, 0.7, 0.5, 0), 0.5);
  const above = newStopState();
  assert.equal(limitAtStop(above, true, 0.7, 0.3, 0.5, 0), 0.5);
});

test("the pin yields in the direction it is pushed, by half its thickness", () => {
  const above = newStopState();
  assert.equal(limitAtStop(above, true, 0.7, 0.3, 0.5, 0.06), 0.47, "driven down, it rests below the centre");
  const below = newStopState();
  assert.equal(limitAtStop(below, true, 0.3, 0.7, 0.5, 0.06), 0.53, "driven up, above it");
});

test("releasing the hook frees the line again", () => {
  const state = newStopState();
  limitAtStop(state, true, 0.6, 0.5, 0.5, 0);
  assert.equal(limitAtStop(state, false, 0.5, 0.2, 0.5, 0), 0.2);
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
  const settings = { ...pneumaticModel.defaults, leadRows: 0 };
  const crescendo = pneumaticModel.run(input({ [portKey("bass", "crescendo", "on")]: [[10, 30]] }), settings);
  const sforzando = pneumaticModel.run(input({ [portKey("bass", "sforzando", "on")]: [[10, 200]] }), settings);
  assert.ok(sforzando[200]! > crescendo[200]!);
});

test("the Mezzoforte hook stops a rising line at its upper rest", () => {
  const settings: Parameters = { ...pneumaticModel.defaults, leadRows: 0 };
  const out = pneumaticModel.run(
    input({
      [portKey("bass", "mezzoforte", "on")]: [[10, 30]],
      [portKey("bass", "crescendo", "on")]: [[40, 60]],
    }),
    settings,
  );
  assert.ok(Math.max(...out) <= settings.mezzoforte! + MF_THICKNESS / 2 + 1e-9);
});

test("the bellows rebounds off the hook and does not pass it", () => {
  // Driven hard onto the stop from below, the board arrives with momentum. The
  // hook does not move: the board is stopped at its face and what is left of the
  // momentum sends it back the way it came. So it overshoots *away* from the
  // stop, never through it, which is the opposite of a spring it presses into.
  const ports = {
    [portKey("bass", "mezzoforte", "on")]: [[10, 30]] as [number, number][],
    [portKey("bass", "sforzando", "on")]: [[40, LENGTH]] as [number, number][],
  };
  const settings: Parameters = { ...pneumaticModel.defaults, leadRows: 0 };
  const face = settings.mezzoforte! + MF_THICKNESS / 2;

  const rigid = pneumaticModel.run(input(ports), { ...settings, stopRestitution: 0.5 });
  const dead = pneumaticModel.run(input(ports), { ...settings, stopRestitution: 0 });

  assert.ok(Math.max(...rigid) <= face + 1e-9, "it never passes the face");
  const settled = rigid.at(-1)!;
  const back = settled - Math.min(...rigid.slice(60));
  assert.ok(back > 0, `and having reached the face it comes back off it, by ${back.toFixed(4)}`);
  assert.ok(Math.min(...rigid.slice(60)) >= Math.min(...dead.slice(60)) - 1e-9, "a rebound does not drive it lower");
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

test("the terms added for the transits are inert at their defaults", () => {
  // Each nests the model that was there before it: a lift band covering the whole
  // charge above the threshold, and no load. The comparisons that price them are
  // only meaningful while this holds, so it is pinned here rather than left to be
  // noticed.
  const ports = {
    [portKey("bass", "crescendo", "on")]: [[10, 40]] as [number, number][],
    // cancelled again before the sforzando, so the through-flow gate opens: it
    // acts only while conduit 39 stands open to atmosphere and the valve draws
    [portKey("bass", "crescendo", "off")]: [[50, 70]] as [number, number][],
    [portKey("bass", "sforzando", "on")]: [[80, 110]] as [number, number][],
    [portKey("bass", "sforzando", "off")]: [[140, 170]] as [number, number][],
    [portKey("bass", "mezzoforte", "on")]: [[190, 220]] as [number, number][],
  };
  const neutral: Parameters = { ...pneumaticModel.defaults, leadRows: 0, valveBand: 1, throughFlowLoad: 0 };
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
  for (const [name, value] of [["valveBand", 0.2], ["throughFlowLoad", 0.5]] as const) {
    const moved = pneumaticModel.run(input(ports), { ...neutral, [name]: value });
    const changed = moved.some((v, i) => Math.abs(v - asNeutral[i]!) > 1e-9);
    assert.ok(changed, `${name} did nothing when moved to ${value}`);
  }
});
