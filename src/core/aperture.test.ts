import { test } from "node:test";
import assert from "node:assert/strict";

import { Grid } from "./grid.ts";
import { aperturePorts, geometryInMm, ROWS_PER_MM, slots } from "./aperture.ts";
import type { PunchAt } from "./ports.ts";

const LENGTH = 1200;
const KEY = "held";

const grid = (): Grid => new Grid(0, Float64Array.from({ length: LENGTH }, (_, index) => index / 600));

const punch = (rowOn: number, rowOff: number): PunchAt => ({ key: KEY, rowOn, rowOff });

test("two punches under the bore at once open it over the union of their lenses", () => {
  // The greater of the two would see one sliver where the paper offers two, and
  // at a chain pitch the union is very nearly the sum.
  const gap = 8;
  const pair = aperturePorts(grid(), [punch(400, 420), punch(420 + gap, 440 + gap)]).get(KEY)!;
  const alone = [
    aperturePorts(grid(), [punch(400, 420)]).get(KEY)!,
    aperturePorts(grid(), [punch(420 + gap, 440 + gap)]).get(KEY)!,
  ];
  const trough = 420 + gap / 2;
  assert.ok(pair[trough]! > alone[0]![trough]! + alone[1]![trough]! - 1e-12, "at least the sum, before the cap");
  assert.ok(pair[trough]! > 2 * Math.max(alone[0]![trough]!, alone[1]![trough]!) - 1e-12, "twice what the max sees");
  assert.ok(Math.max(...pair) <= 1, "and never more than a fully open port");
});

test("the union moves towards the merged reading and never past it", () => {
  // This is what makes the union a correction rather than an arbitrary move, and
  // it is worth pinning because the T-100's published fits ran on perforations a
  // detector had split: on roll 3309 alone, 232 of the bass's 1180 pieces lie
  // closer than a bore to their neighbour. Where two pieces are really one slot,
  // the truth is the merged reading, and both the max and the union understate
  // it — but the union understates it by less, at every gap and every row.
  const merged = (gap: number): Float64Array => aperturePorts(grid(), [punch(400, 520 + gap)]).get(KEY)!;
  const union = (gap: number): Float64Array =>
    aperturePorts(grid(), [punch(400, 460), punch(460 + gap, 520 + gap)]).get(KEY)!;
  const greaterOfTheTwo = (gap: number): Float64Array => {
    const first = aperturePorts(grid(), [punch(400, 460)]).get(KEY)!;
    const second = aperturePorts(grid(), [punch(460 + gap, 520 + gap)]).get(KEY)!;
    return first.map((value, index) => Math.max(value, second[index]!));
  };

  [1, 2, 4, 8, 12, 16, 20].forEach((gap) => {
    const both = union(gap);
    const whole = merged(gap);
    const max = greaterOfTheTwo(gap);
    both.forEach((value, index) => {
      assert.ok(value >= max[index]! - 1e-12, `gap ${gap}, row ${index}: below the greater of the two`);
      assert.ok(value <= whole[index]! + 1e-12, `gap ${gap}, row ${index}: past the merged reading`);
    });
  });
});

test("punches further apart than the bore are untouched by the union", () => {
  const far = aperturePorts(grid(), [punch(400, 420), punch(500, 520)]).get(KEY)!;
  const first = aperturePorts(grid(), [punch(400, 420)]).get(KEY)!;
  Array.from({ length: 60 }, (_, offset) => 380 + offset).forEach((row) => {
    assert.equal(far[row], first[row], `row ${row}`);
  });
});

test("a chain of punches within the gap is one slot", () => {
  // A held T-98 command is a chain of 1.594 mm holes at 2.62 mm centres, so the
  // paper bridges are about a millimetre and one tracker bore joins them.
  const inRows = (mm: number): number => mm * ROWS_PER_MM;
  const geometry = geometryInMm(1.594, 1.413);
  const gap = inRows(1.8);
  const chain = Array.from({ length: 5 }, (_, index) => {
    const start = 400 + index * inRows(2.62);
    return punch(start, start + inRows(1.594));
  });

  assert.equal(slots(chain, 0).length, 5, "left alone they are five holes");
  assert.equal(slots(chain, gap).length, 1, "merged at one bore and a margin they are one hold");

  const merged = aperturePorts(grid(), chain, geometry, gap).get(KEY)!;
  const across = [...merged].slice(410, 500);
  assert.ok(Math.min(...across) === 1, "and the port stands fully open across the whole hold");
});
