import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { CONSENSUS, PRESETS, instrumentParameters, type RollNumber } from "./instruments.ts";
import { DRAWING_APPARATUS, mezzoforteTravel, playbackParameters, travelBetweenRails } from "./playback.ts";
import { pneumaticModel } from "./pneumatic.ts";
import { inTravelUnits } from "./units.ts";
import type { Half } from "../roll/expression.ts";
import type { Parameters } from "./types.ts";

const DOCS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs");
const NAMES = pneumaticModel.spec.map((entry) => entry.name).sort();
const HALVES: readonly Half[] = ["bass", "treble"];

test("every instrument carries exactly the model's parameters, in travel units, drawing apparatus off", () => {
  [CONSENSUS, ...Object.values(PRESETS)].forEach((instrument) => {
    HALVES.forEach((half) => {
      const params = instrument[half];
      assert.deepEqual(Object.keys(params).sort(), NAMES, `${instrument.name} ${half}`);
      assert.equal(params.piano, 0);
      assert.equal(params.forte, 1);
      Object.keys(DRAWING_APPARATUS).forEach((name) => assert.equal(params[name], 0, `${instrument.name} ${half} ${name}`));
      assert.ok(mezzoforteTravel(params) > 0 && mezzoforteTravel(params) < 1, `${instrument.name} ${half} hook`);
    });
  });
});

test("the presets are the rolls' own fits, verbatim, in travel units", () => {
  (Object.keys(PRESETS) as RollNumber[]).forEach((welte) => {
    const preset = PRESETS[welte];
    const fit = JSON.parse(readFileSync(join(DOCS, "fits-lean", `${preset.provenance.druid}.json`), "utf8")) as {
      results: { half: Half; params: Parameters; test: { rmse: number } }[];
    };
    fit.results.forEach(({ half, params, test: held }) => {
      const expected = { ...pneumaticModel.defaults, ...inTravelUnits(params), ...DRAWING_APPARATUS };
      NAMES.forEach((name) => assert.equal(preset[half][name], expected[name], `${welte} ${half} ${name} has drifted`));
      assert.equal(preset.provenance[half].heldOutRmse, held.rmse);
    });
  });
});

test("the caller chooses the consensus, a preset, or their own parameters over either", () => {
  assert.deepEqual(instrumentParameters("bass"), CONSENSUS.bass);
  assert.deepEqual(playbackParameters("treble"), CONSENSUS.treble);
  assert.deepEqual(instrumentParameters("bass", { preset: "3309" }), PRESETS["3309"].bass);
  const manual = instrumentParameters("bass", { parameters: { alpha: 1, inertiaMs: 0 } });
  assert.equal(manual.alpha, 1);
  assert.equal(manual.inertiaMs, 0);
  assert.equal(manual.crescendoRate, CONSENSUS.bass.crescendoRate);
  const overPreset = instrumentParameters("treble", { parameters: { alpha: 1 }, over: "1474" });
  assert.equal(overPreset.crescendoRate, PRESETS["1474"].treble.crescendoRate);
});

test("the consensus is scored on every preset's roll and is none of them", () => {
  const pooled = CONSENSUS.provenance.pooled ?? {};
  assert.deepEqual(Object.keys(pooled).sort(), Object.keys(PRESETS).sort());
  Object.values(pooled).forEach((score) => HALVES.forEach((half) => assert.ok(score[half] > 0 && score[half] < 0.2)));
  Object.values(PRESETS).forEach((preset) => {
    assert.notDeepEqual(preset.bass, CONSENSUS.bass);
  });
});

test("the fraction of travel is the identity on an instrument", () => {
  const params = playbackParameters("bass");
  const travel = travelBetweenRails(Float64Array.from([0, 1, params.mezzoforte!]), params);
  assert.deepEqual([...travel], [0, 1, params.mezzoforte]);
});
