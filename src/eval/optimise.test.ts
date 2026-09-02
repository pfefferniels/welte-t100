import assert from "node:assert/strict";
import { test } from "node:test";

import { coordinateDescent, nelderMead } from "./optimise.ts";
import { maskedRmse, maskedRobust } from "./metrics.ts";

test("coordinate descent improves where a converged simplex has stopped", () => {
  // Axis-aligned and badly scaled, which is the case the sweep is there for: the
  // simplex shrinks to nothing along the cheap axes and stops moving on the dear
  // ones. It is not a claim about ridges, where a simplex does better.
  const objective = (v: readonly number[]): number =>
    (v[0]! - 0.3) ** 2 + 1e-4 * (v[1]! - 0.7) ** 2 + 25 * (v[2]! + 0.4) ** 2;
  const bounds = { lower: [-1, -1, -1], upper: [1, 1, 1] };
  const start = [0.9, -0.9, 0.9];

  const simplex = nelderMead(objective, start, bounds, { iterations: 40 });
  const swept = coordinateDescent(objective, simplex.vector, bounds);

  assert.ok(swept.value <= simplex.value, "it never returns worse than it was given");
  assert.ok(swept.value < simplex.value, `and here it improves, ${simplex.value.toFixed(4)} to ${swept.value.toFixed(4)}`);
});

test("coordinate descent respects the bounds it is given", () => {
  const objective = (v: readonly number[]): number => -(v[0]! + v[1]!);
  const bounds = { lower: [0, 0], upper: [1, 1] };
  const { vector } = coordinateDescent(objective, [0.5, 0.5], bounds);
  vector.forEach((value, axis) => {
    assert.ok(value >= bounds.lower[axis]! && value <= bounds.upper[axis]!, `axis ${axis} stayed in bounds`);
  });
});

test("the robust loss charges far residuals linearly and near ones squared", () => {
  const truth = Float64Array.from([0, 0, 0, 0]);
  const mask = Uint8Array.from([1, 1, 1, 1]);
  const near = Float64Array.from([0.1, 0.1, 0.1, 0.1]);
  const far = Float64Array.from([0, 0, 0, 1]);

  // below delta it is exactly the squared loss
  assert.ok(
    Math.abs(maskedRobust(near, truth, mask, 0.5) - maskedRmse(near, truth, mask)) < 1e-12,
    "residuals inside delta are untouched",
  );
  // above it the outlier counts for less than squaring would charge
  assert.ok(maskedRobust(far, truth, mask, 0.2) < maskedRmse(far, truth, mask), "the outlier is discounted");
  // and delta zero restores the plain loss
  assert.equal(maskedRobust(far, truth, mask, 0), maskedRmse(far, truth, mask));
});
