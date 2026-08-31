/**
 * Pedal travel as MIDI controller messages.
 *
 * The damper goes out on CC 64 and the hammer rail on CC 67, both as continuous
 * streams rather than the two values at 0 and 127 that midi2exp and pianolatron
 * emit. What that buys is the traversal: a red Welte's dampers take a
 * measurable time to leave the strings and to come back, so a release the roll
 * asks for and retakes before the bellows has finished is a half-pedal on the
 * instrument, and only a continuous controller can carry it.
 *
 * Whether a renderer hears the difference is its own business. CC 64 is defined
 * as a switch at 64 in General MIDI, and many samplers still read it that way;
 * those that model a real damper — Pianoteq, and the better sampled libraries —
 * read the whole range. `switch` mode below is for a renderer that cannot do
 * better. It sends only 0 and 127, but it thresholds the modelled travel rather
 * than the punch, so it still places each change where the dampers are halfway
 * and not where the hole is; that is one traversal's difference from the prior
 * art even in the degraded mode.
 *
 * The value is bellows travel, not damping. How far a damper has to lift before
 * a string starts to ring, and how much of the ring survives at half lift, is a
 * property of the piano and of the note, and nothing in the Welte determines it.
 */

import { clamp } from "../model/types.ts";
import { controlChange, type MidiMessage } from "./write.ts";
import type { PedalTravel } from "../model/pedal.ts";

export const DAMPER_CC = 64;
export const SOFT_CC = 67;

/** Half travel, where a switching renderer would change state anyway. */
const SWITCH_POINT = 0.5;

export type PedalMode = "continuous" | "switch";

export type ControllerOptions = {
  readonly channel?: number;
  readonly mode?: PedalMode;
  /**
   * Quantisation of the controller value. One is lossless — the stream is then
   * a run-length encoding of the travel at the controller's own resolution.
   * Coarser steps trade that for fewer messages.
   */
  readonly step?: number;
};

function level(travel: number, mode: PedalMode, step: number): number {
  if (mode === "switch") return travel >= SWITCH_POINT ? 127 : 0;
  const value = clamp(Math.round(travel * 127), 0, 127);
  return step <= 1 ? value : Math.min(127, Math.round(value / step) * step);
}

/**
 * One message per change of the quantised value. That is a run-length encoding
 * of the series, so it carries everything a controller of 128 steps can carry
 * and nothing is thinned away that a renderer could have used.
 */
export function controllerMessages(
  travel: Float64Array,
  tickAt: (index: number) => number,
  controller: number,
  options: ControllerOptions = {},
): MidiMessage[] {
  const { channel = 0, mode = "continuous", step = 1 } = options;
  const values = Uint8Array.from(travel, (value) => level(value, mode, step));

  return [...values].flatMap((value, index) =>
    index === 0 || value !== values[index - 1]
      ? [controlChange(tickAt(index), channel, controller, value)]
      : [],
  );
}

export function pedalMessages(
  travel: PedalTravel,
  tickAt: (index: number) => number,
  options: ControllerOptions = {},
): MidiMessage[] {
  return [
    ...controllerMessages(travel.damper, tickAt, DAMPER_CC, options),
    ...controllerMessages(travel.hammerRail, tickAt, SOFT_CC, options),
  ];
}
