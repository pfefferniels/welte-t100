import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { DRAWING_APPARATUS, FITTED, mezzoforteTravel, playbackParameters, travelBetweenRails } from "./playback.ts";
import { pneumaticModel } from "./pneumatic.ts";
import type { Half } from "../roll/expression.ts";
import type { Parameters } from "./types.ts";

const FIT_FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "fit-pneumatic.json");

test("the playback constants are the headline fit, verbatim", () => {
  const fit = JSON.parse(readFileSync(FIT_FILE, "utf8")) as {
    model: string;
    results: { half: Half; params: Parameters }[];
  };
  assert.equal(fit.model, pneumaticModel.name);
  fit.results.forEach(({ half, params }) => {
    assert.deepEqual(FITTED[half], params, `${half} has drifted from docs/fit-pneumatic.json`);
  });
});

test("playback switches the drawing apparatus off and keeps the mechanism", () => {
  (["bass", "treble"] as const).forEach((half) => {
    const params = playbackParameters(half);
    Object.keys(DRAWING_APPARATUS).forEach((name) => assert.equal(params[name], 0, `${half} ${name}`));
    assert.equal(params.crescendoRate, FITTED[half].crescendoRate);
    assert.equal(params.regulatorGain, pneumaticModel.defaults.regulatorGain);
  });
});

test("the fraction of travel puts the rails at 0 and 1 and the hook between them", () => {
  const params = playbackParameters("bass");
  const travel = travelBetweenRails(Float64Array.from([params.piano!, params.forte!, params.mezzoforte!]), params);
  assert.ok(Math.abs(travel[0]!) < 1e-12 && Math.abs(travel[1]! - 1) < 1e-12);
  assert.equal(travel[2], mezzoforteTravel(params));
  assert.ok(mezzoforteTravel(params) > 0 && mezzoforteTravel(params) < 1);
});
