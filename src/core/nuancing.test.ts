import { test } from "node:test";
import assert from "node:assert/strict";

import { Grid } from "./grid.ts";
import { runBellows, type Drive } from "./nuancing.ts";
import type { Parameters } from "./types.ts";

const LENGTH = 6000;
const ROWS_PER_SECOND = 600;

const grid = (): Grid => new Grid(0, Float64Array.from({ length: LENGTH }, (_, index) => index / ROWS_PER_SECOND));

/** No pin, for the whole roll: these tests are about the rails. */
const free = (): Uint8Array => new Uint8Array(LENGTH);

/** Where the drive turns round, so that one run carries both directions. */
const TURN = Math.round(LENGTH / 2);

/**
 * One constant drive, up and then down, so that anything the travel does near a
 * rail is the compliance and not the flow law. A real drive grows with the
 * distance still to go, which is the point: it cannot slow an approach to a rail
 * at all. One run carries both directions for the same reason the measurement
 * wanted them within one half-roll: one bellows, one session, two directions.
 */
const steady = (rate: number): Drive => (_state, index) => (index < TURN ? rate : -rate);

const RAILED: Parameters = {
  piano: 0,
  forte: 1,
  mezzoforte: 0.5,
  inertiaMs: 0,
  stopRestitution: 0,
  scaleWarp: 0,
  railWidth: 0.2,
  railDrag: 0.6,
};

type Direction = "leaving" | "arriving";

/**
 * Mean speed over the rows where the travel lies inside a band, in units per
 * second, taken from the rising half of the run or the falling half.
 */
function speedWithin(travel: Float64Array, from: number, to: number, going: Direction = "leaving"): number {
  const [first, last] = going === "leaving" ? [1, TURN] : [TURN + 1, travel.length];
  const steps = Array.from({ length: last - first }, (_, offset) => first + offset)
    .filter((index) => travel[index]! >= from && travel[index]! <= to)
    .map((index) => Math.abs(travel[index]! - travel[index - 1]!));
  assert.ok(steps.length > 20, `only ${steps.length} rows inside [${from}, ${to}] while ${going}`);
  return (steps.reduce((total, step) => total + step, 0) / steps.length) * ROWS_PER_SECOND;
}

const bothWays = (params: Parameters): Float64Array => runBellows(grid(), params, steady(0.6), free());

test("the rail drag is the identity at its defaults", () => {
  const off: Parameters = { ...RAILED, railWidth: 0, railDrag: 0 };
  const width: Parameters = { ...RAILED, railDrag: 0 };
  const drag: Parameters = { ...RAILED, railWidth: 0 };
  const plain = [...bothWays(off)];
  assert.deepEqual([...bothWays(width)], plain, "a width with no strength does nothing");
  assert.deepEqual([...bothWays(drag)], plain, "a strength with no width does nothing");
});

test("the drag slows leaving a rail and approaching it by the same amount", () => {
  // This is the whole of the claim, and it is what was measured: on green paper
  // a fall approaching the open rail from above and a crescendo leaving it from
  // below are both slow there, the lowest bin sitting above the trend in every
  // series and in both directions. The term is symmetric by construction, so a
  // rise and a fall of equal drive must cross the same band at the same speed.
  const travel = bothWays(RAILED);

  const bands: [number, number][] = [
    [0.02, 0.06],
    [0.08, 0.12],
    [0.14, 0.18],
    [0.30, 0.40],
  ];
  bands.forEach(([from, to]) => {
    const away = speedWithin(travel, from, to, "leaving");
    const towards = speedWithin(travel, from, to, "arriving");
    assert.ok(
      Math.abs(away - towards) / away < 0.02,
      `band [${from}, ${to}]: leaving at ${away.toFixed(4)}, arriving at ${towards.toFixed(4)}`,
    );
  });
});

test("the drag reaches only as far as its width, and deepens towards the rail", () => {
  const travel = bothWays(RAILED);
  const near = speedWithin(travel, 0.02, 0.06);
  const mid = speedWithin(travel, 0.12, 0.16);
  const clear = speedWithin(travel, 0.30, 0.40);

  assert.ok(near < mid && mid < clear, `deepens towards the rail: ${near.toFixed(3)} < ${mid.toFixed(3)} < ${clear.toFixed(3)}`);
  assert.ok(Math.abs(clear - 0.6) / 0.6 < 0.01, "and is gone a width away, where the drive is untouched");
  assert.ok(Math.abs(near / clear - (1 - 0.6 * (1 - 0.04 / 0.2))) < 0.02, "by the share the strength names");
});

test("both rails drag, not only the open one", () => {
  const travel = bothWays(RAILED);
  const belowTheClosedRail = speedWithin(travel, 0.94, 0.98);
  const clear = speedWithin(travel, 0.30, 0.40);
  assert.ok(belowTheClosedRail < clear * 0.8, `${belowTheClosedRail.toFixed(3)} against ${clear.toFixed(3)}`);
  assert.ok(
    Math.abs(belowTheClosedRail - speedWithin(travel, 0.02, 0.06)) / belowTheClosedRail < 0.02,
    "and by the same amount at the same distance, the two rails being one term",
  );
});

test("a drag short of total still reaches the rail", () => {
  // It is a drag and not a barrier: the bellows arrives, later.
  const strong = bothWays({ ...RAILED, railDrag: 0.95 });
  assert.ok(Math.max(...strong) > 0.999, "the closed rail is still reached");
  const off = bothWays({ ...RAILED, railDrag: 0 });
  assert.ok(
    strong.findIndex((value) => value >= 0.99) > off.findIndex((value) => value >= 0.99),
    "and it takes longer to get there",
  );
});

test("no flow law can do this, which is why the term is needed", () => {
  // The measurement compares each direction against its own trend across the
  // band, and found the lowest bin above the trend in both. A gap-dependent
  // drive cannot give that: its targets sit outside the rails, so near the open
  // rail the rise has its widest gap and the fall its narrowest, and one is
  // quickening exactly where the other slows. Whichever way round the targets
  // sit, the two ratios land on opposite sides of one.
  const gapDriven: Drive = (state, index) =>
    index < TURN ? 0.5 * (1.8 - state.x) : 2 * (-0.2 - state.x);
  const ratios = (params: Parameters): { rise: number; fall: number } => {
    const travel = runBellows(grid(), params, gapDriven, free());
    return {
      rise: speedWithin(travel, 0.02, 0.06, "leaving") / speedWithin(travel, 0.3, 0.4, "leaving"),
      fall: speedWithin(travel, 0.02, 0.06, "arriving") / speedWithin(travel, 0.3, 0.4, "arriving"),
    };
  };

  const bare = ratios({ ...RAILED, railWidth: 0, railDrag: 0 });
  assert.ok(bare.rise > 1.05, `the rise is faster low in the band: ${bare.rise.toFixed(3)}`);
  assert.ok(bare.fall < 0.95, `and the fall is slower there: ${bare.fall.toFixed(3)}`);

  // The rail pushes both the same way, which is the only shape that matches.
  const railed = ratios(RAILED);
  assert.ok(railed.rise < bare.rise, `the rail slows the rise low in the band: ${railed.rise.toFixed(3)}`);
  assert.ok(railed.fall < bare.fall, `and the fall too: ${railed.fall.toFixed(3)}`);
  assert.ok(railed.rise < 1, "far enough to put the rise on the same side of one as the fall");
});
