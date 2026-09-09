import { test } from "node:test";
import assert from "node:assert/strict";

import { ROWS_PER_MM } from "../core/aperture.ts";
import type { Parameters } from "../core/types.ts";
import { runPedals as runT100Pedals } from "../t100/pedals.ts";
import { portKey, portOf, type Punch } from "./codes.ts";
import { DEFAULT_T98_GEOMETRY, PUNCH_T98_MM } from "./geometry.ts";
import { heldValve } from "../core/valve.ts";
import { STARTING_VALUES } from "./instruments.ts";
import { runNuancing } from "./model.ts";
import { t98Relay } from "./relay.ts";
import { runPedals } from "./pedals.ts";
import { chained, greenGrid, held, inputOver, levelAt, punch, steps, travelOf } from "./synthetic.ts";
import { inTravelUnits, onPrintedScale } from "./units.ts";

const BASS = STARTING_VALUES.bass;
const LENGTH = 900;

const travel = (punches: readonly Punch[], params: Parameters = BASS): Float64Array =>
  travelOf(LENGTH, punches, params);

test("with nothing punched the bellows rests at the open rail for the whole roll", () => {
  // Phillips, p. 211: "in the absence of other expression data, the pneumatic
  // will always open slowly until it reaches a stationary point, typically when
  // it is fully open."
  const out = travel([]);
  out.forEach((value, index) => assert.equal(value, 0, `row ${index}`));
});

test("a perforation of zero length does nothing", () => {
  const nothing = travel([]);
  const zero = travel([punch("crescendo", 100, 0)]);
  assert.equal(zero.length, nothing.length);
  zero.forEach((value, index) => assert.equal(value, nothing[index], `row ${index}`));
});

test("the same code at the same place gives the same travel", () => {
  const code = [punch("crescendo", 100, 60), punch("sforzandoForte", 300, PUNCH_T98_MM), punch("mezzoforte", 400, 40)];
  const first = travel(code);
  const again = travel(code);
  assert.deepEqual([...first], [...again]);
});

test("the travel stays within the rails at every row", () => {
  const out = travel([
    punch("crescendo", 50, 500),
    ...steps("sforzandoForte", 100, 12, { pitchMm: 8 }),
    ...steps("sforzandoPiano", 400, 6, { pitchMm: 8 }),
    punch("mezzoforte", 200, 300),
  ]);
  out.forEach((value, index) => {
    assert.ok(value >= BASS.piano! - 1e-12, `row ${index} below the open rail: ${value}`);
    assert.ok(value <= BASS.forte! + 1e-12, `row ${index} above the closed rail: ${value}`);
  });
});

test("a longer command moves the bellows further than a shorter one", () => {
  // Separately for each of the four functions, everything else held fixed.
  const shorter = travel([punch("crescendo", 100, 40)]);
  const longer = travel([punch("crescendo", 100, 120)]);
  assert.ok(levelAt(longer, 230) > levelAt(shorter, 230) + 0.05, "crescendo");

  const forte = (mm: number): number => levelAt(travel([punch("sforzandoForte", 100, mm)]), 100 + mm + 5);
  assert.ok(forte(12) > forte(4) + 0.05, "sforzando forte");

  // The sforzando-piano is compared over the two shortest commands the paper can
  // carry, because at the unfitted `sforzandoPianoRate` two punches already reach
  // the open rail and everything longer is clipped by it. That saturation is the
  // violation of Welte's three-step control which `controls.test.ts` records; the
  // invariant here belongs to the model and holds wherever the rail does not.
  const opened = (mm: number): number =>
    Math.min(...travel([punch("crescendo", 0, 300), punch("sforzandoPiano", 320, mm)]).slice(Math.round(320 * ROWS_PER_MM), Math.round(345 * ROWS_PER_MM)));
  assert.ok(opened(2 * PUNCH_T98_MM) < opened(PUNCH_T98_MM), "sforzando piano");

  const under = (mm: number): number =>
    Math.max(...travel([punch("mezzoforte", 100, mm), punch("crescendo", 110, 400)]).slice(Math.round(150 * ROWS_PER_MM)));
  assert.ok(under(300) < under(20) - 0.05, "mezzoforte holds the bellows down for as long as it runs");
});

test("the decrescendo is automatic: nothing has to switch it on", () => {
  // Hagmann, p. 102: "nach dem Verschwinden der Perforation über der Oeffnung 67
  // greift die Decrescendo-Wirkung von Oeffnung 66 Platz." Bore 100 and the
  // vented conduit 39 are never switched off, so the bellows opens again by
  // itself the moment the commanded path closes.
  const out = travel([punch("sforzandoForte", 100, 12)]);
  const from = Math.round(140 * ROWS_PER_MM);
  const to = out.length - 1;
  Array.from({ length: to - from }, (_, offset) => from + offset).forEach((row) => {
    assert.ok(out[row + 1]! <= out[row]! + 1e-12, `row ${row} rose again: ${out[row]} -> ${out[row + 1]}`);
  });
  assert.ok(out[to]! < 0.01, "and it reaches the open rail");
});

test("no valve outlasts its perforation by more than its own tail", () => {
  // The charge falls as exp(-t/tail) once the port has shut, so the valve drops
  // within tail * ln(1/trip) of the port closing, whatever the perforation was.
  const allowed = (BASS.forteTailMs! * Math.log(1 / BASS.tripThreshold!)) / 1000;
  const grid = greenGrid(LENGTH);
  const perforation = punch("sforzandoForte", 100, PUNCH_T98_MM);
  const { sforzandoPiano, drive } = t98Relay(inputOver(grid, [perforation]), BASS);
  assert.equal(Math.max(...sforzandoPiano), 0, "and a port nothing punched never opens at all");
  assert.ok(typeof drive === "function");

  const lift = heldValve(
    portOf(inputOver(grid, [perforation]), "sforzandoForte"),
    grid.dt,
    { fillMs: BASS.forteFillMs!, tailMs: BASS.forteTailMs!, tripThreshold: BASS.tripThreshold!, band: BASS.forteBand! },
  );
  const portShuts = grid.indexOfRow(perforation.rowOff + DEFAULT_T98_GEOMETRY.trackerDiameterPx / 2);
  const valveDrops = lift.findLastIndex((value) => value > 0);
  const overrun = grid.seconds[valveDrops]! - grid.seconds[portShuts]!;
  assert.ok(overrun > 0, "it does outlast its perforation, which is what the bleed bore is for");
  assert.ok(overrun <= allowed + 1e-9, `held ${overrun.toFixed(3)} s past the port, allowed ${allowed.toFixed(3)} s`);
});

test("the crescendo's ceiling is the balance of throttle 98 against bore 100", () => {
  // On the T-100 the ceiling is a fitted asymptote; here it is derived, which is
  // what Welte's permanent bleed buys. At alpha = 1 with the two targets on the
  // rails the balance is crescendoRate / (crescendoRate + bleedRate).
  const params: Parameters = { ...BASS, alpha: 1, crescendoTarget: 1, releaseTarget: 0 };
  const ceiling = params.crescendoRate! / (params.crescendoRate! + params.bleedRate!);
  const long = travelOf(6000, [punch("crescendo", 50, 5900)], params);
  assert.ok(Math.abs(Math.max(...long) - ceiling) < 0.01, `reached ${Math.max(...long).toFixed(4)}, balance ${ceiling.toFixed(4)}`);
});

test("the crescendo's rise and fall are mirror images, which is not imposed", () => {
  // Welte says the bellows reopens "im selben Zeitraum" and "von selbst in
  // derselben Geschwindigkeit" (Betriebsanleitung pp. 12 f.). With the bleed
  // always open and both targets on the rails, that falls out of the structure
  // at alpha = 1 rather than being tied, which is why a tie must not be imposed:
  // it would force alpha to 1 and releaseTarget to the rail through the back door.
  const params: Parameters = { ...BASS, alpha: 1, crescendoTarget: 1, releaseTarget: 0, inertiaMs: 0, stopRestitution: 0 };
  const out = travelOf(6000, [punch("crescendo", 50, 2000)], params);
  const peak = Math.max(...out);
  const risesTo = (share: number): number => out.findIndex((value) => value >= share * peak);
  const fallsTo = (share: number): number => out.findLastIndex((value) => value >= share * peak);
  const closes = out.findIndex((value, index) => index > 0 && value < out[index - 1]!);
  [0.3, 0.5, 0.8].forEach((share) => {
    const up = risesTo(share) - risesTo(0.0001);
    const down = fallsTo(1 - share) - closes;
    assert.ok(Math.abs(up - down) / up < 0.05, `at ${share}: rise ${up} rows against fall ${down}`);
  });
});

test("two opposed sforzandi balance at a position rather than cancelling", () => {
  // Four conduits stand on one bellows and nothing arbitrates between them, so
  // the drives add as flows. midi2exp adds constant velocity steps, which cancel
  // arithmetically wherever the bellows stands; PlaySK tests forte first and
  // reaches piano only in an elif, so a sforzando-piano does nothing at all while
  // a sforzando-forte is open. Here the balance solves
  //   sforzandoForteRate * |sforzandoTarget - x|^alpha
  //     = sforzandoPianoRate * |x - releaseTarget|^alpha
  const opposed = (pianoRate: number): number => {
    const params: Parameters = { ...BASS, sforzandoPianoRate: pianoRate };
    const both = travelOf(3000, [punch("sforzandoForte", 100, 2000), punch("sforzandoPiano", 100, 2000)], params);
    return levelAt(both, 1800);
  };
  const settled = opposed(BASS.sforzandoPianoRate!);
  assert.ok(settled > 1e-4 && settled < 0.999, `settled at ${settled.toFixed(5)}, which is neither rail`);
  assert.ok(opposed(BASS.sforzandoPianoRate! * 4) < settled, "and the balance moves when one conductance does");

  // PlaySK would let the forte win outright, so the bellows would climb towards
  // sforzandoTarget and reach the closed rail.
  const forteAlone = levelAt(travelOf(3000, [punch("sforzandoForte", 100, 2000)], BASS), 1800);
  assert.ok(settled < forteAlone - 0.5, "which is not what forte-wins would give");
});

test("the Mezzoforte hook holds the bellows at its face and releasing it lets go", () => {
  const out = travel([punch("mezzoforte", 100, 400), punch("crescendo", 110, 700)]);
  const held = levelAt(out, 400);
  assert.ok(Math.abs(held - BASS.mezzoforte!) < 0.05, `arrested at ${held.toFixed(3)}, hook at ${BASS.mezzoforte}`);
  assert.ok(levelAt(out, 700) > held + 0.1, "and once the perforation ends it runs on");
});

test("a chain of punches reads as the one hold an edition delivers", () => {
  // The decision of §2.4: chained punches whose gap is shorter than one bore and
  // a margin are joined before stamping, so a raw scan and an edition of the same
  // command see the same port.
  const slot = travel([held("crescendo", 100, 60)]);
  const chain = travel(chained("crescendo", 100, 60));
  const worst = slot.reduce((most, value, index) => Math.max(most, Math.abs(value - chain[index]!)), 0);
  assert.ok(worst < 0.02, `chain and slot differ by ${worst.toFixed(4)} of the scale`);
});

test("the two scales convert exactly and mean the same thing on both", () => {
  // railWidth is a distance along the scale and not a position, so it carries
  // the span without the offset; railDrag is a share and carries neither.
  const onRoll: Parameters = {
    ...BASS, piano: 0.03, forte: 0.91, mezzoforte: 0.62, alpha: 1.3, throughFlowLoad: 0.12,
    railWidth: 0.08, railDrag: 0.4,
  };
  const asTravel = inTravelUnits(onRoll);
  assert.equal(asTravel.piano, 0);
  assert.equal(asTravel.forte, 1);
  assert.ok(Math.abs(asTravel.railWidth! - 0.08 / 0.88) < 1e-12, "a width scales by the span alone");
  assert.equal(asTravel.railDrag, 0.4, "and a share not at all");
  const back = onPrintedScale(asTravel, 0.03, 0.91);
  Object.keys(onRoll).forEach((name) => {
    assert.ok(Math.abs(back[name]! - onRoll[name]!) < 1e-12, `${name}: ${back[name]} against ${onRoll[name]}`);
  });

  const code = [punch("crescendo", 50, 200), punch("sforzandoForte", 300, PUNCH_T98_MM), punch("sforzandoPiano", 400, 8)];
  const printed = travel(code, onRoll);
  const inTravel = travel(code, asTravel);
  const span = onRoll.forte! - onRoll.piano!;
  const worst = printed.reduce(
    (most, value, index) => Math.max(most, Math.abs((value - onRoll.piano!) / span - inTravel[index]!)),
    0,
  );
  assert.ok(worst < 1e-9, `largest difference ${worst}`);
});

test("the delivery dump is inert at its default and acts once it is not", () => {
  const code = [punch("crescendo", 0, 300), punch("sforzandoPiano", 320, 8)];
  const grid = greenGrid(LENGTH);
  const off = runNuancing(inputOver(grid, code), BASS);
  assert.ok(Math.max(...off.dump) > 0.5, "the dump state follows throttle 96 whether or not it is used");
  const withDepth = runNuancing(inputOver(grid, code), { ...BASS, dumpDepth: 0.4 });
  assert.deepEqual([...off.travel], [...withDepth.travel], "and it never moves the bellows, only the vacuum it delivers");
});

test("the pedals are on the edges the T-98 punches them on, which is the T-100 mirrored", () => {
  const grid = greenGrid(400);
  const ports = new Map([
    [portKey("bass", "sustainPedal"), Float64Array.from({ length: grid.length }, (_, row) => (row > 1000 && row < 3000 ? 1 : 0))],
    [portKey("treble", "hammerRail"), Float64Array.from({ length: grid.length }, (_, row) => (row > 1000 && row < 3000 ? 1 : 0))],
  ]);
  const green = runPedals({ grid, ports });
  assert.ok(Math.max(...green.damper) > 0.9, "a bass perforation raises the dampers");
  assert.ok(Math.max(...green.hammerRail) > 0.9, "a treble perforation shifts the hammer rail");

  // and the T-100's reading of the same paper finds neither, since it looks at
  // the other edge and for a set/cancel pair
  const red = runT100Pedals({ grid, ports });
  assert.equal(Math.max(...red.damper), 0);
  assert.equal(Math.max(...red.hammerRail), 0);
});

test("a held pedal perforation lasts as long as its own paper", () => {
  const grid = greenGrid(900);
  const ports = new Map([
    [portKey("bass", "sustainPedal"), Float64Array.from(
      { length: grid.length },
      (_, row) => (row > Math.round(100 * ROWS_PER_MM) && row < Math.round(400 * ROWS_PER_MM) ? 1 : 0),
    )],
  ]);
  const { damper } = runPedals({ grid, ports });
  assert.ok(damper[Math.round(300 * ROWS_PER_MM)]! > 0.99, "up in the middle of the perforation");
  assert.ok(damper[damper.length - 1]! < 0.01, "and down again once it has passed, with no cancel line to read");
});
