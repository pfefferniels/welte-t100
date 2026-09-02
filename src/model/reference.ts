/**
 * The floor any model has to clear: one number for the whole roll. Its fitted
 * error is the drawn line's own standard deviation, so a model scoring above it
 * has learned nothing from the punches.
 */

import type { Model, ModelInput, Parameters, ParameterSpec } from "./types.ts";

const SPEC: readonly ParameterSpec[] = [
  { name: "level", lower: -0.2, upper: 1.2, unit: "scale", note: "the one value predicted everywhere" },
];

const DEFAULTS: Parameters = { level: 0.5 };

export const constantModel: Model = {
  name: "constant",
  summary: "A single level, held for the length of the roll.",
  spec: SPEC,
  defaults: DEFAULTS,
  run: (input: ModelInput, params: Parameters) => new Float64Array(input.grid.length).fill(params.level ?? 0.5),
};
