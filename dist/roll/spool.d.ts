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
export declare const WELTE_SPOOL: Spool;
/** The take-up circumference in cm after `paperCm` of paper has wound on. */
export declare function circumferenceAt(spool: Spool, paperCm: number): number;
/** Paper speed there, in cm/s. */
export declare function paperSpeed(spool: Spool, paperCm: number): number;
/**
 * Seconds taken by `paperCm` of paper, negative before the starting point.
 *
 * The same closed form as p. 136, rearranged so that the two square roots are
 * added rather than subtracted. That keeps it exact for a short run of paper and
 * lets a circumference effect of 0 fall out as a constant speed.
 */
export declare function paperSeconds(spool: Spool, paperCm: number): number;
/**
 * The inverse: centimetres of paper wound after `seconds`. Solving p. 136 for
 * `x` gives a quadratic in the paper a constant speed would have run, and the
 * quadratic term vanishes with the circumference effect.
 */
export declare function paperAt(spool: Spool, seconds: number): number;
