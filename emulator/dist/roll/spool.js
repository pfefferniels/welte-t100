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
 * `docs/prior-art.md` §E.3 and `docs/gottschewski.md`.
 */
/** A red Welte playback roll, after Gottschewski pp. 135, 137 and rule 2 on p. 139. */
export const WELTE_SPOOL = {
    circumferenceCm: 22.25,
    layerCm: 0.0075,
    revolutionSeconds: 4.64,
    circumferenceEffect: 1,
};
/**
 * Paper length that doubles the spool's cross-section, and so raises the speed by
 * √2. Infinite when the growth is given no effect, which leaves the formulas
 * below at a constant speed.
 */
function doublingCm(spool) {
    return spool.circumferenceCm ** 2 / (4 * Math.PI * spool.layerCm * spool.circumferenceEffect);
}
/** The take-up circumference in cm after `paperCm` of paper has wound on. */
export function circumferenceAt(spool, paperCm) {
    return spool.circumferenceCm * Math.sqrt(1 + paperCm / doublingCm(spool));
}
/** Paper speed there, in cm/s. */
export function paperSpeed(spool, paperCm) {
    return circumferenceAt(spool, paperCm) / spool.revolutionSeconds;
}
/**
 * Seconds taken by `paperCm` of paper, negative before the starting point.
 *
 * The same closed form as p. 136, rearranged so that the two square roots are
 * added rather than subtracted. That keeps it exact for a short run of paper and
 * lets a circumference effect of 0 fall out as a constant speed.
 */
export function paperSeconds(spool, paperCm) {
    const grown = Math.sqrt(1 + paperCm / doublingCm(spool));
    return (2 * paperCm) / (paperSpeed(spool, 0) * (grown + 1));
}
/**
 * The inverse: centimetres of paper wound after `seconds`. Solving p. 136 for
 * `x` gives a quadratic in the paper a constant speed would have run, and the
 * quadratic term vanishes with the circumference effect.
 */
export function paperAt(spool, seconds) {
    const unaccelerated = paperSpeed(spool, 0) * seconds;
    return unaccelerated + unaccelerated ** 2 / (4 * doublingCm(spool));
}
