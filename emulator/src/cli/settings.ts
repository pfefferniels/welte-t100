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
 * The four flags are settled rather than null: the sforzando acts per pulse, the
 * roll does not couple it to the crescendo, and the Mezzoforte pin is in the path
 * and blocks both ways.
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
  // The two readings part company only where the hook engages with the line below
  // the pin and the line then rises into it; everywhere else `limitAtStop` returns
  // the same floor either way. On this roll that case never bites: over the whole
  // range of the flag the output does not move by one part in 1e15, so the fitted
  // value carried no information and the search was spending a dimension on it.
  // Welte settles it from outside, quoted in Hagemann's Einstellanleitung: the
  // Mezzofortebalg "versperrt dem Nuancierbalg den Weg, sodaß solange jener
  // zugesaugt ist, kein Ton stärker als Mezzoforte, oder schwächer als Mezzoforte
  // spielen kann". Stronger or weaker, so the pin blocks in both directions.
  // Reinhard Hagemann, "Einstellanleitung für Welte-Mignon", Das Mechanische
  // Musikinstrument 80 (2001), pp. 25-27, here p. 26.
  mfTwoSided: 1,
  railGrip: 0,
  // Both were tried against a control on the same budget, two seeds each, and
  // neither beat the pair that did earn its place in both halves. A band of its
  // own for the cancelling valve costs 0.0011 in the Bass and is undecided in
  // the Discant; dry friction costs 0.0013 in the Bass and gains 0.0006 in the
  // Discant, inside a spread of 0.0028. A narrow band on the cancelling valve
  // would in any case defeat controls 4c and 4d, which want a short cancel to
  // return the bellows only part of the way.
  assistBand: 1,
  dragThreshold: 0,
  // The hook does not move: the bellows rebounds off it rather than pressing
  // into it. Priced against the spring on the same budget, the two are level in
  // the bass, 0.0306 against 0.0310, and the rigid reading is much better in the
  // treble, 0.0408 against 0.0489, because a spring lets the model sink 0.025
  // below the level the line rests at where the line itself goes 0.017.
  stopStiffness: 0,
  stopDamping: 0,
  // Only the pin's lower face is observable here. A census of the drawn line
  // finds all 22 hook engagements entered from above, at the fortissimo rail, on
  // both halves across the whole roll; the fastest approach from below is
  // 3.8 units/s against 14 to 16 at a real arrest, so the "arrivals from below"
  // are pauses in a creep and never reach the upper face. Fitting the thickness
  // therefore moves a face nothing touches: the output is identical to the last
  // bit over the whole range 0 to 0.3, so the value below is not a measurement
  // and no value here would be. It keeps the 0.06 the earlier reading used, so
  // that `mezzoforte` still carries the one observable quantity as
  // `mezzoforte - mfThickness / 2`. The pin's real thickness wants an instrument.
  mfThickness: 0.06,
};

export const MEASURED: Record<Half, Parameters> = {
  // The measured level is where the line comes to rest having fallen, which is
  // the lower of the pin's two faces, and the two faces lie 0.06 apart, so half
  // of that is added here to give the centre that `mfThickness` is pinned around.
  bass: { piano: 0.017, forte: 0.912, mezzoforte: 0.5752 + 0.03, leadRows: -65 },
  treble: { piano: 0.022, forte: 0.952, mezzoforte: 0.6169 + 0.03, leadRows: -46 },
};
