import { test } from "node:test";
import assert from "node:assert/strict";

import { Grid } from "./grid.ts";
import { aperturePorts, binaryPorts, DEFAULT_GEOMETRY, portKey } from "./aperture.ts";
import type { Perforation } from "./expression.ts";

const START = 1000;
const LENGTH = 400;

function grid(): Grid {
  return new Grid(START, Float64Array.from({ length: LENGTH }, (_, index) => index / 600));
}

function punch(rowOn: number, rowOff: number): Perforation {
  return {
    half: "bass",
    control: "crescendo",
    action: "on",
    key: 17,
    tickOn: rowOn,
    tickOff: rowOff,
    rowOn,
    rowOff,
    secondsOn: 0,
    secondsOff: 0,
  };
}

const KEY = portKey("bass", "crescendo", "on");
const RADIUS = DEFAULT_GEOMETRY.trackerDiameterPx / 2;

test("the port is fully open over the flank of a long perforation", () => {
  const series = aperturePorts(grid(), [punch(1100, 1200)]).get(KEY)!;
  assert.equal(series[1150 - START], 1);
});

test("the port opens over the tracker bore, centred on the ink", () => {
  const series = aperturePorts(grid(), [punch(1100, 1200)]).get(KEY)!;
  const at = (row: number): number => series[row - START]!;

  assert.equal(at(1100 - Math.ceil(RADIUS) - 1), 0, "shut a bore's radius before the ink");
  assert.equal(at(1200 + Math.ceil(RADIUS) + 1), 0, "shut a bore's radius after it");
  assert.ok(at(1100) > 0.4 && at(1100) < 0.6, "half open at the leading edge of the ink");
  assert.ok(at(1200) > 0.4 && at(1200) < 0.6, "half open at the trailing edge");
});

test("the leading and trailing ramps are mirror images", () => {
  const series = aperturePorts(grid(), [punch(1100, 1200)]).get(KEY)!;
  Array.from({ length: 12 }, (_, offset) => offset - 6).forEach((offset) => {
    const leading = series[1100 + offset - START]!;
    const trailing = series[1200 - offset - START]!;
    assert.ok(Math.abs(leading - trailing) < 1e-9, `offset ${offset}: ${leading} vs ${trailing}`);
  });
});

test("a single punch still opens the port, but not for long", () => {
  const single = aperturePorts(grid(), [punch(1100, 1120)]).get(KEY)!;
  const open = single.reduce((total, value) => total + value, 0);
  assert.ok(open > 10 && open < 45, `open for ${open} row-equivalents`);
});

test("overlapping perforations are one slot in the paper", () => {
  const series = aperturePorts(grid(), [punch(1100, 1150), punch(1140, 1200)]).get(KEY)!;
  assert.ok(Math.max(...series) <= 1);
  assert.equal(series[1145 - START], 1);
});

test("the binary model is midi2exp's: open on the ink, extended at the tail only", () => {
  const series = binaryPorts(grid(), [punch(1100, 1200)]).get(KEY)!;
  const extension = Math.round(DEFAULT_GEOMETRY.trackerDiameterPx * 0.75);
  assert.equal(series[1099 - START], 0);
  assert.equal(series[1100 - START], 1);
  assert.equal(series[1200 + extension - START], 1);
  assert.equal(series[1200 + extension + 1 - START], 0);
});
