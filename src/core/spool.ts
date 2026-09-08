/**
 * The take-up spool, and the paper speed it sets.
 *
 * A Welte holds the take-up spool at a constant rate of revolution, so the paper
 * runs faster as the spool fills. Gottschewski derives the law from the roll's
 * own geometry (*Die Interpretation als Kunstwerk*, pp. 135–137): one centimetre
 * of paper of layer thickness `layerCm` adds `layerCm · 1 cm²` to the spool's
 * cross-section Q, and with Q = U²/4π the circumference, and with it the speed,
 * goes as the square root of the paper run:
 *
 *     U(x) = U₀ · √(1 + a·d·x / Q₀)        Q₀ = U₀² / 4π
 *     v(x) = U(x) / revolutionSeconds
 *     t(x) = 2·√(Q₀/ad) · (√(Q₀/ad + x) − √(Q₀/ad)) / v₀
 *
 * for `x` centimetres of paper past the point where the circumference is U₀, with
 * `d` the layer thickness and `a` how much of the circumference growth is allowed
 * to reach the paper.
 *
 * His own check on the constants, p. 137: a spool of 22.25 cm grows to 22.55 cm
 * over the first 1.45 m of paper, a mean of 22.4 cm, and at 4.64 s per revolution
 * that stretch takes 30 s, which is the speed Welte marks on the Skalarolle.
 *
 * This is the acceleration the emulator runs on. It differs from the one in the
 * SUPRA tempo maps, which compound the speed by a constant 0.22 % per foot; see
 * `docs/sources.md` §1.
 */

export type Spool = {
  /** U₀ in cm: the take-up circumference where the paper measurement starts. */
  readonly circumferenceCm: number;
  /** One wound layer of paper, in cm. */
  readonly layerCm: number;
  /** Seconds per take-up revolution, which is what the machine holds constant. */
  readonly revolutionSeconds: number;
  /**
   * How much of the circumference growth reaches the paper speed. 1 is the
   * constant spool speed Gottschewski assumes throughout the book, 0.8 the value
   * his comparison of expositions with reprises prefers, 0 a constant paper
   * speed. He varies it by falsifying the layer thickness, so `a·d` is the only
   * place it enters (pp. 134, 137).
   */
  readonly circumferenceEffect: number;
};

/** A red Welte playback roll, after Gottschewski pp. 135, 137 and rule 2 on p. 139. */
export const WELTE_SPOOL: Spool = {
  circumferenceCm: 22.25,
  layerCm: 0.0075,
  revolutionSeconds: 4.64,
  circumferenceEffect: 1,
};

/**
 * A green Welte playback roll. **A proposal, not a measurement.** No source
 * states a T-98 spool geometry. What is known is that the T-98 has a tempo dial
 * with six settings, each with its own throttle screw, and a wind-motor regulator
 * built to hold the tempo constant under forte (Welte, Betriebsanleitung p. 20),
 * so a wind motor turning at a regulated rate drives the take-up at a regulated
 * rate and Gottschewski's law applies with different constants.
 *
 * The red circumference and layer thickness are kept and `revolutionSeconds` is
 * set to make the initial paper speed 220 cm/min, the Deutsches Museum's figure
 * for *Welte grün / T 98*: 22.25 cm ÷ (220/60 cm/s) = 6.068 s. The same
 * construction reproduces the museum's red figure, 22.25 / 4.64 = 287.7 cm/min
 * against its 290, which checks the convention rather than the T-98.
 *
 * Two things are certainly wrong with it. Green paper is "not as pliable or as
 * thin as that used for Mignon rolls" (Phillips p. 202), so `layerCm` is probably
 * larger, which would strengthen the acceleration; and the T-98 roll is 42 mm
 * narrower, so the flange spacing and possibly the core differ. Welte's own scale
 * roll would settle it: the roll must run from the first "A" of the chromatic
 * scale to the cross-line bearing the dial's number in half a minute
 * (Skala-Rolle 98 §1b), which one scan turns into `paperSeconds(spool, x) = 30`.
 * Until then the green paper speed is better varied than trusted: it scales every
 * fitted conductance by k and every time constant by 1/k, and touches nothing
 * dimensionless.
 */
export const WELTE_T98_SPOOL: Spool = {
  circumferenceCm: 22.25,
  layerCm: 0.0075,
  revolutionSeconds: 6.068,
  circumferenceEffect: 1,
};

/**
 * Paper length that doubles the spool's cross-section, and so raises the speed by
 * √2. Infinite when the growth is given no effect, which leaves the formulas
 * below at a constant speed.
 */
function doublingCm(spool: Spool): number {
  return spool.circumferenceCm ** 2 / (4 * Math.PI * spool.layerCm * spool.circumferenceEffect);
}

/** The take-up circumference in cm after `paperCm` of paper has wound on. */
export function circumferenceAt(spool: Spool, paperCm: number): number {
  return spool.circumferenceCm * Math.sqrt(1 + paperCm / doublingCm(spool));
}

/** Paper speed there, in cm/s. */
export function paperSpeed(spool: Spool, paperCm: number): number {
  return circumferenceAt(spool, paperCm) / spool.revolutionSeconds;
}

/**
 * Seconds taken by `paperCm` of paper, negative before the starting point.
 *
 * The same closed form as p. 136, rearranged so that the two square roots are
 * added rather than subtracted. That keeps it exact for a short run of paper and
 * lets a circumference effect of 0 fall out as a constant speed.
 */
export function paperSeconds(spool: Spool, paperCm: number): number {
  const grown = Math.sqrt(1 + paperCm / doublingCm(spool));
  return (2 * paperCm) / (paperSpeed(spool, 0) * (grown + 1));
}

/**
 * The inverse: centimetres of paper wound after `seconds`. Solving p. 136 for
 * `x` gives a quadratic in the paper a constant speed would have run, and the
 * quadratic term vanishes with the circumference effect.
 */
export function paperAt(spool: Spool, seconds: number): number {
  const unaccelerated = paperSpeed(spool, 0) * seconds;
  return unaccelerated + unaccelerated ** 2 / (4 * doublingCm(spool));
}
