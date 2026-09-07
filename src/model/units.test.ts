import { test } from "node:test";
import assert from "node:assert/strict";

import { Grid } from "../roll/grid.ts";
import { portKey, type PortKey } from "../roll/aperture.ts";
import { pneumaticModel } from "./pneumatic.ts";
import { inTravelUnits, onPrintedScale } from "./units.ts";
import type { ModelInput, Parameters } from "./types.ts";

const travelBetweenRails = (output: Float64Array, params: Parameters): Float64Array =>
  Float64Array.from(output, (value) => (value - params.piano!) / (params.forte! - params.piano!));

const LENGTH = 3000;

function input(ports: Partial<Record<string, [number, number][]>>): ModelInput {
  const grid = new Grid(0, Float64Array.from({ length: LENGTH }, (_, index) => index / 600));
  const map = new Map<PortKey, Float64Array>();
  Object.entries(ports).forEach(([key, spans]) => {
    const series = new Float64Array(LENGTH);
    (spans ?? []).forEach(([from, to]) => series.fill(1, from, to));
    map.set(key as PortKey, series);
  });
  const quiet = new Float64Array(LENGTH);
  return { grid, half: "bass", ports: map, noteDensity: quiet, totalNoteDensity: quiet };
}

const ON_A_ROLL: Parameters = {
  ...pneumaticModel.defaults,
  alpha: 1.3,
  piano: 0.03,
  forte: 0.91,
  mezzoforte: 0.69,
  crescendoRate: 1.4,
  crescendoTarget: 0.81,
  releaseRate: 0.76,
  releaseTarget: -0.38,
  sforzandoRate: 1.3,
  sforzandoTarget: 2.7,
  throughFlowLoad: 0.12,
  leadRows: 0,
};

test("travel units put the rails at 0 and 1 and come back exactly", () => {
  const travel = inTravelUnits(ON_A_ROLL);
  assert.equal(travel.piano, 0);
  assert.equal(travel.forte, 1);
  assert.ok(Math.abs(travel.mezzoforte! - (0.69 - 0.03) / 0.88) < 1e-12);
  const back = onPrintedScale(travel, 0.03, 0.91);
  Object.keys(ON_A_ROLL).forEach((name) => {
    assert.ok(Math.abs(back[name]! - ON_A_ROLL[name]!) < 1e-12, `${name}: ${back[name]} against ${ON_A_ROLL[name]}`);
  });
});

test("the instrument in travel units moves the way the fit moves on its roll", () => {
  // Free travel only: the pin's thickness and the rebound floor are the two
  // constants that do not rescale, so the hook is left out of this roll.
  const ports = {
    [portKey("bass", "crescendo", "on")]: [[10, 20]] as [number, number][],
    [portKey("bass", "sforzando", "on")]: [[600, 700]] as [number, number][],
    [portKey("bass", "crescendo", "off")]: [[1500, 1520]] as [number, number][],
    [portKey("bass", "sforzando", "off")]: [[1900, 1950]] as [number, number][],
  };
  const onRoll = pneumaticModel.run(input(ports), ON_A_ROLL);
  const asTravel = pneumaticModel.run(input(ports), inTravelUnits(ON_A_ROLL));
  const expected = travelBetweenRails(onRoll, ON_A_ROLL);
  let worst = 0;
  expected.forEach((value, index) => {
    worst = Math.max(worst, Math.abs(value - asTravel[index]!));
  });
  assert.ok(worst < 1e-9, `largest difference ${worst}`);
});
