import { test } from "node:test";
import assert from "node:assert/strict";

import { parseSmf } from "../roll/smf.ts";
import { controlChange, noteOff, noteOn, setTempo, trackName, writeSmf } from "./write.ts";
import { controllerMessages, DAMPER_CC } from "./pedal.ts";

test("what the writer writes the reader reads back", () => {
  const file = writeSmf(570, [
    [trackName("tempo"), setTempo(0, 1_000_000), setTempo(300_000, 890_055)],
    [noteOn(10, 0, 60, 64), noteOff(4200, 0, 60), controlChange(4200, 0, DAMPER_CC, 127)],
  ]);

  const read = parseSmf(file);
  assert.equal(read.format, 1);
  assert.equal(read.division, 570);
  assert.equal(read.tracks.length, 2);

  const notes = read.tracks[1]!.filter((event) => event.kind !== "meta");
  assert.deepEqual(
    notes.map((event) => [event.kind, event.tick]),
    [
      ["note-on", 10],
      ["note-off", 4200],
    ],
  );
});

test("delta times survive a tick number wider than one var-int byte", () => {
  const ticks = [0, 127, 128, 16_383, 16_384, 2_097_151];
  const file = writeSmf(570, [ticks.map((tick) => noteOn(tick, 0, 60, 1))]);

  const read = parseSmf(file)
    .tracks[0]!.filter((event) => event.kind === "note-on")
    .map((event) => event.tick);
  assert.deepEqual(read, ticks);
});

test("a negative tick is refused rather than folded onto zero", () => {
  assert.throws(() => writeSmf(570, [[noteOn(-1, 0, 60, 64)]]), RangeError);
});

test("a controller stream is a run-length encoding of its travel", () => {
  const travel = Float64Array.from({ length: 200 }, (_, index) => index / 199);
  const messages = controllerMessages(travel, (index) => index, DAMPER_CC);
  const values = messages.map((message) => message.bytes[2]!);

  assert.equal(values[0], 0);
  assert.equal(values.at(-1), 127);
  assert.equal(new Set(values).size, values.length, "no value is sent twice in a row");
  assert.deepEqual(values, values.toSorted((a, b) => a - b), "and a monotone travel gives a monotone stream");
});

test("switch mode emits only the two values the prior art has", () => {
  const travel = Float64Array.from({ length: 200 }, (_, index) => index / 199);
  const messages = controllerMessages(travel, (index) => index, DAMPER_CC, { mode: "switch" });

  assert.deepEqual(
    messages.map((message) => message.bytes[2]),
    [0, 127],
  );
});
