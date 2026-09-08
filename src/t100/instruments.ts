/**
 * The instruments a playback can run on.
 *
 * Six rolls carry drawn expression lines, and each was drawn by an instrument as
 * it was set on that day. Fitted separately, the six settings do not transfer to
 * one another's lines, so a caller chooses rather than inherits: the consensus,
 * one instrument fitted to all six lines at once; a preset, the setting that drew
 * one particular roll, named by the roll's Welte number because nothing in the
 * six rolls lets a year or a performer predict the setting; or explicit
 * parameters, over either.
 *
 * Every set is in bellows travel, the rails at 0 and 1 and the terms that
 * describe the drawing apparatus switched off, so that the sets are comparable
 * and apply to any roll. `onPrintedScale` puts one onto a roll whose rails sit
 * elsewhere. The provenance beside each set says what it was fitted to and how
 * well, and the caveats a roll's trace carries.
 *
 * None of these is a regulated instrument as Welte would have delivered it: the
 * drawing instruments were out of regulation, and the lines violate Welte's own
 * control 6c, the fall being four times the rise.
 */

import { CONSENSUS_DATA, PRESET_DATA } from "./instruments.data.ts";
import type { HalfProvenance } from "../core/provenance.ts";
import type { Half } from "../core/types.ts";
import type { Parameters } from "../core/types.ts";

export type { HalfProvenance };

export type Provenance = {
  readonly druid?: string;
  readonly performer?: string;
  readonly title?: string;
  /** Which tracing round the fit was made on. */
  readonly traces: string;
  readonly seeds: number;
  /** Summed held-out RMSE difference between the seed runs: the error bar on the search. */
  readonly seedSpread?: number;
  readonly bass: HalfProvenance;
  readonly treble: HalfProvenance;
  /** For the consensus: the presets it was fitted across, and its held-out score on each. */
  readonly pooled?: Readonly<Record<string, Record<Half, number>>>;
  readonly note?: string;
};

export type Instrument = {
  readonly name: string;
  readonly bass: Parameters;
  readonly treble: Parameters;
  readonly provenance: Provenance;
};

export type RollNumber = keyof typeof PRESET_DATA;

export const PRESETS: Readonly<Record<RollNumber, Instrument>> = PRESET_DATA;
export const CONSENSUS: Instrument = CONSENSUS_DATA;

export type InstrumentChoice =
  | "consensus"
  | { readonly preset: RollNumber }
  | { readonly parameters: Parameters; readonly over?: "consensus" | RollNumber };

export function instrumentOf(choice: "consensus" | RollNumber): Instrument {
  return choice === "consensus" ? CONSENSUS : PRESETS[choice];
}

/** The constants one keyboard half runs on, in bellows travel. */
export function instrumentParameters(half: Half, choice: InstrumentChoice = "consensus"): Parameters {
  if (choice === "consensus") return CONSENSUS[half];
  if ("preset" in choice) return PRESETS[choice.preset][half];
  return { ...instrumentOf(choice.over ?? "consensus")[half], ...choice.parameters };
}
