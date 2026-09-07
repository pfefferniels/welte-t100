/**
 * The model's constants on two scales.
 *
 * A fit lives on its roll's printed scale, where the rails sit wherever the pen
 * rested on that sheet. An instrument lives in bellows travel, where the rails
 * are 0 and 1, so that one instrument can be compared with another and applied
 * to a roll whose rails sit elsewhere. The flow law converts exactly: with
 * x = piano + s·u and s the span between the rails,
 *
 *     dx/dt = g · |T − x|^α   becomes   du/dt = g · s^(α−1) · |T_u − u|^α
 *
 * so levels map linearly, a conductance picks up the factor s^(α−1) on the way
 * into travel units, and the through-flow load, which multiplies a conductance
 * times a gap, the factor s.
 * Times, thresholds, shares and the flow exponent are the same on both scales.
 * The offsets of the pen are in scan rows and the scale warp is already defined
 * on the travel between the rails, so both pass through unchanged.
 *
 * Two constants of the model stay in printed-scale units, the pin's thickness
 * and the floor below which an arrival does not rebound, so an instrument
 * applied to a roll sees them scaled by that roll's span, a few percent.
 */

import type { Parameters } from "./types.ts";

/**
 * The terms that describe the drawing apparatus rather than the mechanism: the
 * lead of the punches over the drawn line, its variation by code and along the
 * roll, and the bend of the printed scale (`empirics/docs/measurements.md` §5). A piano
 * reads the punches where they are, so an instrument carries them switched off.
 */
export const DRAWING_APPARATUS: Parameters = {
  leadRows: 0,
  leadSforzandoOnRows: 0,
  leadCrescendoRows: 0,
  leadDriftRows: 0,
  scaleWarp: 0,
};

const LEVELS = ["mezzoforte", "crescendoTarget", "releaseTarget", "sforzandoTarget"] as const;
const CONDUCTANCES = ["crescendoRate", "releaseRate", "sforzandoRate", "sforzandoAssistRate"] as const;

function rescaled(params: Parameters, piano: number, forte: number, toTravel: boolean): Parameters {
  const span = forte - piano;
  const alpha = params.alpha ?? 1;
  const level = (value: number): number => (toTravel ? (value - piano) / span : piano + value * span);
  const conductance = (value: number): number => (toTravel ? value * span ** (alpha - 1) : value * span ** (1 - alpha));
  const load = (value: number): number => (toTravel ? value * span : value / span);
  const out: Record<string, number> = { ...params };
  LEVELS.forEach((name) => {
    if (name in out) out[name] = level(out[name]!);
  });
  CONDUCTANCES.forEach((name) => {
    if (name in out) out[name] = conductance(out[name]!);
  });
  if ("throughFlowLoad" in out) out.throughFlowLoad = load(out.throughFlowLoad!);
  out.piano = toTravel ? 0 : piano;
  out.forte = toTravel ? 1 : forte;
  return out;
}

/** A fit on its roll's printed scale, expressed in bellows travel with the rails at 0 and 1. */
export function inTravelUnits(params: Parameters): Parameters {
  return rescaled(params, params.piano ?? 0, params.forte ?? 1, true);
}

/** An instrument in bellows travel, put onto a roll whose rails sit at `piano` and `forte`. */
export function onPrintedScale(instrument: Parameters, piano: number, forte: number): Parameters {
  return rescaled(instrument, piano, forte, false);
}
