/**
 * What the headline fit pins, kept apart from the command that runs it.
 *
 * `src/cli/fit.ts` starts a fit as soon as it is loaded, so anything that needs
 * these has to import them from somewhere with no side effects. Taking them from
 * there once had a machine quietly refitting the whole roll instead of polishing
 * an existing fit.
 */

import type { Parameters } from "../model/types.ts";
import type { Half } from "../roll/expression.ts";

/**
 * What `docs/empirics.md` measures directly, per half: the two rails from where
 * the line comes to rest, the level the Mezzoforte finger arrests it at, and the
 * offset from the punches. `mezzoforte` here is the pin's centre, so the measured
 * arrest face is `mezzoforte + mfThickness / 2`.
 */
/**
 * Parameters the ablation has already shown to do nothing, pinned so the search
 * does not spend its effort on them. Each is still in the model's spec, so
 * `src/cli/experiments.ts` can still price it by letting it free; what is claimed
 * here is only that the headline fit gains nothing by carrying them.
 *
 * The three flags are settled rather than null: the sforzando acts per pulse, the
 * roll does not couple it to the crescendo, and the Mezzoforte pin is in the path.
 * `mfTwoSided` is left free because the roll cannot decide it either way.
 */
export const SETTLED: Parameters = {
  regulatorGain: 0,
  supplyDroop: 0,
  windRateGain: 1,
  windTargetShift: 0,
  assistYields: 0,
  sforzandoLatches: 0,
  sforzandoSetsCrescendo: 0,
  mfBarrier: 1,
  railGrip: 0,
};

export const MEASURED: Record<Half, Parameters> = {
  // The measured level is where the line comes to rest having fallen, which is
  // the lower of the pin's two faces, and the two faces lie 0.06 apart.
  bass: { piano: 0.017, forte: 0.912, mezzoforte: 0.5752 + 0.03, mfThickness: 0.06, leadRows: -65 },
  treble: { piano: 0.022, forte: 0.952, mezzoforte: 0.6169 + 0.03, mfThickness: 0.06, leadRows: -46 },
};
