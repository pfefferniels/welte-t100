/**
 * Set/cancel pairs, as the relay's memory valves behave.
 *
 * Crescendo and Mezzoforte are held by a double valve that stays where it was
 * put until the cancelling line is read; the perforation only has to be long
 * enough to trip it. So what matters is when the port first opens far enough,
 * not how long it stays open.
 */

import { portKey, portSeries, type PortKey } from "../roll/aperture.ts";
import type { Control, Half } from "../roll/expression.ts";
import { shiftedByDriftingRows, type ModelInput } from "./types.ts";

export const TRIP_THRESHOLD = 0.05;

export function portOf(input: ModelInput, control: Control, action: "on" | "off"): Float64Array {
  return portSeries(input.ports, portKey(input.half, control, action) as PortKey, input.grid.length);
}

/**
 * The port as the mechanism saw it, slid along the paper.
 *
 * The drawn line runs ahead of the punches, and by different amounts for
 * different codes: measured on roll 3309 the sforzando-on code sits 5.8 ms
 * (bass) and 10.7 ms (treble) later than the sforzando-off code, both sharp
 * enough to place, and the crescendo codes tens of milliseconds earlier again.
 * One offset for the whole half therefore mis-places most of the roll. Sliding
 * each port by its own amount is also the right place to do it: the offset
 * belongs to how the paper was laid out, which is an input to the mechanism, not
 * something the mechanism does.
 */
export function shiftedPortOf(
  input: ModelInput,
  control: Control,
  action: "on" | "off",
  rows: number,
  drift: number,
): Float64Array {
  return shiftedByDriftingRows(portOf(input, control, action), rows, drift);
}

/** 1 while the function is set, 0 while cancelled. Cancel wins a tie. */
export function latched(
  on: Float64Array,
  off: Float64Array,
  threshold = TRIP_THRESHOLD,
  initial = 0,
): Uint8Array {
  const state = new Uint8Array(on.length);
  let held = initial;
  for (let index = 0; index < on.length; index += 1) {
    if (off[index]! >= threshold) held = 0;
    else if (on[index]! >= threshold) held = 1;
    state[index] = held;
  }
  return state;
}

/** 1 only while the port itself is open, which is how midi2exp reads Sforzando. */
export function momentary(port: Float64Array, threshold = TRIP_THRESHOLD): Uint8Array {
  return Uint8Array.from(port, (value) => (value >= threshold ? 1 : 0));
}

export function latchedControl(input: ModelInput, control: Control, initial = 0): Uint8Array {
  return latched(portOf(input, control, "on"), portOf(input, control, "off"), TRIP_THRESHOLD, initial);
}

export function halfLabel(half: Half): string {
  return half === "bass" ? "Bass" : "Diskant";
}

/**
 * The Widerstand, which is punched in the Bass columns only.
 *
 * It is the blower's two-speed resistance, one thing serving the whole
 * instrument, so it acts on the Discant bellows as much as on the Bass even
 * though nothing is punched in the Discant columns to say so. Reading it from
 * the half in hand leaves the Discant with no wind state at all, which makes
 * both wind parameters unidentifiable there rather than merely unhelpful.
 */
export function windResistanceOf(input: ModelInput, rows: number, drift: number): Uint8Array {
  const series = (action: "on" | "off"): Float64Array =>
    shiftedByDriftingRows(
      portSeries(input.ports, portKey("bass", "windResistance", action) as PortKey, input.grid.length),
      rows,
      drift,
    );
  return latched(series("on"), series("off"));
}
