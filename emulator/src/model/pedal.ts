/**
 * The two pedals of a red Welte (T-100), after Hagmann's Anhang 16 (p. 189) and
 * the account on pp. 106–107.
 *
 * Both pedals are worked by a bellows, and a bellows takes time to fill. So the
 * state here is travel in [0, 1] and not a switch: 0 is the pedal up, 1 is the
 * pedal fully down. Hagmann is explicit that there is no nuancing device in the
 * path — "die Dämpfer werden stets in derselben Geschwindigkeit und immer
 * vollständig von den Saiten abgehoben" (p. 112) — so the travel always runs at
 * the one regulated speed towards one of the two ends. What it does not do is
 * arrive instantly, and the intermediate positions are therefore real whenever
 * the roll asks for a change faster than the mechanism can finish one. Hagmann
 * guesses as much in the next sentence, that half-pedal effects might be had
 * "durch Ueberlagerung der verschiedenen vom Notenband ausgehenden Befehle".
 *
 * ## Fortepedal (dampers) — treble lines 93 "Pedal an" and 94 "Pedal ab"
 *
 * The Vorpneumatik is the same latching relay as Mezzoforte and Crescendo, so a
 * momentary punch on 93 sets it and it holds until 94 is read. Its output,
 * conduit 10, then feeds a second relay of its own, which is what distinguishes
 * this pedal from the nuancing functions:
 *
 *   conduit 10 → throttle 11 → membrane chamber 12 → membrane 13 →
 *   double valve 14, which seals atmospheric bore 15 and opens conduit 16 →
 *   blower vacuum from conduit 7 → bellows 18 closes → the dampers rise.
 *
 * Chamber 12 fills through a throttle, so valve 14 does not follow the latch at
 * once; it flips when the chamber has crossed the pressure that lifts membrane
 * 13. That is a delay on both edges, and the same throttle sets both, which is
 * why the two are one parameter here. Welte's own regulation instructions place
 * the two adjusters exactly where this reading puts them: control 9c, if the
 * dampers rise too slowly, has the technician adjust **11**, and control 9b, if
 * they fall too slowly onto the strings, adjust **17** (Anhang 12, p. 185). No
 * adjuster sits on conduit 16, so the rise is the relay's delay plus a fast,
 * unthrottled fill, while the fall is that same delay plus a slow bleed through
 * bore 15 and throttle 17.
 *
 * Hagmann adds (p. 107) that 17 is set so that the opening of bellows 18 "in
 * derselben zeitlichen Ausdehnung abspielt wie seine Schliessung" — the two
 * directions are regulated to take the same time, with note 50 sending the
 * reader to control 9 for the check. `tiedToRise` imposes that; the parameters
 * keep the two apart so the tie can be tested rather than assumed.
 *
 * ## Pianopedal (hammer rail) — bass lines 8 "Hammerleiste an" and 7 "ab"
 *
 * "Auffallend einfach gebaut": bellows 19 hangs directly on conduit 9 from the
 * latch, with the single throttle 20 regulating air and suction alike (p. 106).
 * One conductance, both directions, no second relay. Control 8b adjusts 20.
 *
 * ## What is not modelled
 *
 * The moving mass of the damper rail. The nuancing model needs an `inertiaMs`
 * for the far lighter cone valve, so a damper action almost certainly has one
 * too, and it would round the corners of every traversal below. There is no
 * drawn line for the pedals and so nothing to fit it against, and a parameter
 * that can only be guessed is worse than an omission that is stated.
 *
 * The map from damper lift to how much a string is actually damped, which is a
 * property of the piano and not of the Welte. The output here is bellows travel.
 */

import { portKey, portSeries } from "../roll/aperture.ts";
import { latched } from "./latch.ts";
import { clamp, simulate, type ModelInput, type Parameters, type ParameterSpec } from "./types.ts";

/**
 * Fraction of its span chamber 12 has to cross before membrane 13 lifts valve
 * 14. At a half the delay is the same in both directions, which is what makes
 * `relayLagMs` a single number rather than two.
 */
const RELAY_TRIP = 0.5;

/** Fraction of the remaining span the travel times below are quoted to. */
const SETTLED = 0.95;

/**
 * The pedals leave no drawn line, so nothing here is fitted. Three arguments set
 * these numbers, and `docs/pedal.md` sets them out at length.
 *
 * `alpha` is carried over from the Nuancierbalg, whose fitted exponent is 1.02
 * in the bass and 0.77 in the treble: the same kind of bellows filling through
 * the same kind of conduit, so the same flow law, and its mean until something
 * better turns up.
 *
 * The travel times are bounded from the roll rather than from Hagmann, who
 * gives none. On roll 3309 the shortest release-and-retake of the damper pedal
 * is 212 ms from the "ab" punch to the next "an", and the fifth percentile of
 * the 267 lifts is 248 ms. An editor does not punch a lift the instrument
 * cannot make, so a full fall of appreciably more than 200 ms is hard to
 * defend. Welte's controls 9b and 9c bound it the same way from the other side,
 * requiring four notes of a moderate figure to be cleanly separated by the
 * pedal and four short ones to be joined by it, but they name no note values
 * for the scale roll's own figures and so give an order of magnitude, not a
 * number. Nothing here is fitted, because the pedals leave no drawn line.
 *
 * The split of that budget between the relay and the bellows follows the
 * adjusters: control 9c sends the technician to throttle 11 for a slow rise,
 * and on the rise the bellows fills through the unthrottled conduit 16, so the
 * relay is most of the rise. The fall carries the same relay delay and then the
 * throttled bleed through 17, and note 50 has 17 set to make the total match.
 */
const DEFAULTS: Parameters = {
  alpha: 0.9,
  relayLagMs: 60,
  liftMs: 120,
  fallMs: 120,
  shiftMs: 180,
};

const SPEC: readonly ParameterSpec[] = [
  { name: "alpha", lower: 0, upper: 2, unit: "1", note: "flow-law exponent, as in the Nuancierbalg" },
  { name: "relayLagMs", lower: 0, upper: 400, unit: "ms", note: "throttle 11 filling chamber 12 to the trip of valve 14; both edges" },
  { name: "liftMs", lower: 5, upper: 800, unit: "ms", note: "bellows 18 closing through conduit 16, dampers rising" },
  { name: "fallMs", lower: 5, upper: 800, unit: "ms", note: "bellows 18 opening through bore 15 and throttle 17, dampers falling" },
  { name: "shiftMs", lower: 5, upper: 800, unit: "ms", note: "bellows 19 through throttle 20, both directions" },
];

/** Signed driving term of one flow path, as in `pneumatic.ts`. */
function drive(target: number, x: number, alpha: number): number {
  const gap = target - x;
  return gap === 0 ? 0 : Math.sign(gap) * Math.abs(gap) ** alpha;
}

/**
 * Conductance of a path that carries its bellows or chamber across `fraction`
 * of the span in `ms`. Every constraint Welte states is a time, so the
 * parameters above are times and the flow law converts them here.
 */
function conductanceFor(fraction: number, ms: number, alpha: number): number {
  const left = 1 - fraction;
  const span = alpha === 1 ? -Math.log(left) : (1 - left ** (1 - alpha)) / (1 - alpha);
  return (span * 1000) / ms;
}

/** Only the parts of a model input the pedals can see: they belong to no half. */
export type PedalInput = Pick<ModelInput, "grid" | "ports">;

export type PedalTravel = {
  /** 0 with the dampers on the strings, 1 with them fully raised. */
  readonly damper: Float64Array;
  /** 0 with the hammer rail at rest, 1 fully shifted. */
  readonly hammerRail: Float64Array;
  /** 1 while the Vorpneumatik latch of the damper pedal is set. */
  readonly damperLatch: Uint8Array;
  /** 1 while the Vorpneumatik latch of the hammer rail is set. */
  readonly hammerRailLatch: Uint8Array;
};

/**
 * The latch of one pedal. Both sit on the Vorpneumatik and behave as the
 * nuancing relays do, so `latched` does the work; only the ports differ, and
 * they are named by the edge of the paper they are punched on rather than by a
 * keyboard half, since a pedal acts on the whole instrument.
 */
function latchOf(input: PedalInput, control: "sustainPedal" | "hammerRail"): Uint8Array {
  const half = control === "sustainPedal" ? "treble" : "bass";
  const at = (action: "on" | "off"): Float64Array =>
    portSeries(input.ports, portKey(half, control, action), input.grid.length);
  return latched(at("on"), at("off"));
}

/**
 * A bellows following a latch, with `rate` chosen per direction. The dampers
 * need two conductances because their two directions run through different
 * paths; the hammer rail is given the same one twice.
 */
function travelOf(
  input: PedalInput,
  set: Uint8Array,
  alpha: number,
  towards: number,
  away: number,
): Float64Array {
  const steps = input.grid.dt;
  return simulate(input.grid.length, { x: 0 }, (state, index) => {
    const open = set[index] === 1;
    const rate = open ? towards : away;
    state.x = clamp(state.x + rate * drive(open ? 1 : 0, state.x, alpha) * steps[index]!, 0, 1);
    return state.x;
  });
}

/**
 * The relay between the damper latch and bellows 18. Chamber 12 fills through
 * throttle 11 and valve 14 flips when it crosses `RELAY_TRIP`, so the bellows
 * sees a delayed copy of the latch rather than the latch itself.
 */
function relayOf(input: PedalInput, latch: Uint8Array, alpha: number, lagMs: number): Uint8Array {
  if (lagMs <= 0) return latch;
  const steps = input.grid.dt;
  const rate = conductanceFor(RELAY_TRIP, lagMs, alpha);
  const state = { chamber: 0 };
  return Uint8Array.from(latch, (set, index) => {
    state.chamber = clamp(state.chamber + rate * drive(set, state.chamber, alpha) * steps[index]!, 0, 1);
    return state.chamber >= RELAY_TRIP ? 1 : 0;
  });
}

export function runPedals(input: PedalInput, params: Parameters = DEFAULTS): PedalTravel {
  const p = { ...DEFAULTS, ...params } as Record<string, number>;
  const alpha = p.alpha!;
  const rate = (ms: number): number => conductanceFor(SETTLED, ms, alpha);

  const damperLatch = latchOf(input, "sustainPedal");
  const hammerRailLatch = latchOf(input, "hammerRail");
  const valve = relayOf(input, damperLatch, alpha, p.relayLagMs!);
  const shift = rate(p.shiftMs!);

  return {
    damper: travelOf(input, valve, alpha, rate(p.liftMs!), rate(p.fallMs!)),
    hammerRail: travelOf(input, hammerRailLatch, alpha, shift, shift),
    damperLatch,
    hammerRailLatch,
  };
}

/**
 * The regulation of throttle 17 that Hagmann reports on p. 107: it is set so
 * that bellows 18 opens in the same time as it closes. Kept as a transform over
 * the parameters rather than as a fitted tie, because the pedals leave no drawn
 * line and so nothing here is fitted at all.
 *
 * Deliberately not exposed as a `Model`. That interface is for things the
 * evaluator can score against the traced curves, and offering it here would
 * invite a fit that has no ground truth behind it.
 */
export function tiedToRise(params: Parameters): Parameters {
  return { ...params, fallMs: params.liftMs ?? DEFAULTS.liftMs! };
}

/** One stretch of the roll over which the damper latch asks for one thing. */
export type PedalSpan = {
  readonly index: number;
  readonly seconds: number;
  readonly milliseconds: number;
  /** Travel when the latch changed, and when it changed back. */
  readonly from: number;
  readonly to: number;
  /** True while the roll is asking for the dampers up. */
  readonly down: boolean;
};

/**
 * The roll's pedalling cut at the latch edges. A span that ends short of its
 * rail is one the mechanism could not finish: the dampers were still on their
 * way when the roll asked for the other direction, which is the only way a red
 * Welte reaches a position between its two ends.
 */
export function pedalSpans(travel: PedalTravel, grid: PedalInput["grid"]): PedalSpan[] {
  const latch = travel.damperLatch;
  const edges = [...latch].flatMap((state, index) => (index > 0 && state !== latch[index - 1] ? [index] : []));
  const bounds = [0, ...edges, latch.length - 1];

  return bounds.slice(0, -1).map((start, position) => {
    const end = bounds[position + 1]!;
    return {
      index: start,
      seconds: grid.seconds[start]!,
      milliseconds: (grid.seconds[end]! - grid.seconds[start]!) * 1000,
      from: travel.damper[start]!,
      to: travel.damper[end]!,
      down: latch[start] === 1,
    };
  });
}

export type HalfPedalling = {
  readonly lifts: number;
  readonly unfinishedLifts: number;
  readonly presses: number;
  readonly unfinishedPresses: number;
  /** Highest the dampers still stood when a lift was cut short. */
  readonly deepestUnfinishedLift: number;
};

/** How much of the roll's pedalling the mechanism cannot carry out in full. */
export function halfPedalling(spans: readonly PedalSpan[], margin = 0.02): HalfPedalling {
  const lifts = spans.filter((span) => !span.down);
  const presses = spans.filter((span) => span.down);
  const unfinished = lifts.filter((span) => span.to > margin);

  return {
    lifts: lifts.length,
    unfinishedLifts: unfinished.length,
    presses: presses.length,
    unfinishedPresses: presses.filter((span) => span.to < 1 - margin).length,
    deepestUnfinishedLift: unfinished.reduce((deepest, span) => Math.max(deepest, span.to), 0),
  };
}

export { DEFAULTS as pedalDefaults, SPEC as pedalSpec };
