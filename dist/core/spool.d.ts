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
/**
 * A red Welte playback roll, after Gottschewski pp. 135, 137 and rule 2 on
 * p. 139. The initial paper speed is 287.7 cm/min, against the Deutsches
 * Museum's 290 for the type.
 *
 * **The tempo is Tempo 70**, which Gottschewski does not say but Welte does.
 * Hagmann quotes the red scale roll's booklet (Welte 17) on its first control:
 * „Skala ₁C–g⁴ = 80 Töne im p, Kontrolltöne c³ bei ₁C und e³ bei c¹ ergibt Tempo
 * 70" (p. 180 f., n. 53). Both scale rolls are therefore calibrated at the same
 * setting, so comparing this with `WELTE_T98_SPOOL` compares like with like —
 * which until that quotation was found was an assumption doing silent work.
 *
 * The interval it names has been measured on a surviving red technician's roll
 * (Condon 1367), whose two ruled lines fall on the sweep's ₁C and on c¹ with e³
 * struck beside it, as the booklet describes. They are 1462.9 mm apart, and this
 * constant carries the paper between them in **30.24 s** against the nominal 30.
 * That is the first check of these constants against something other than
 * Gottschewski's own derivation.
 *
 * A second thing worth knowing before this constant is trusted over a whole
 * roll: it models the speed rising 23.6 % from 139 to 2986 cm of paper, where
 * Stahnke's own red tempo map gives 33.4 %. Gottschewski's check, 30 s over the
 * first 1.45 m, is reproduced here to 30.03 s — but it constrains the start and
 * not the acceleration, so the shape of this axis has never been tested.
 */
export declare const WELTE_SPOOL: Spool;
/**
 * A green Welte playback roll, **fitted to Welte's own scale roll**.
 *
 * Both constants come from the six tempo cross-lines on the Monteurscala
 * `gq104tn4658`. Welte's rule is that the roll runs from the first bass "A" of
 * the chromatic scale to the cross-line bearing the dial's number in half a
 * minute (Skala-Rolle 98 §1b), and the six lines are the round twenties, so
 * they give six equations for `v(T) = kT` in two unknowns. Least squares over
 * them lands on a doubling length of 2748 cm and 34.381 mm/s at Tempo 70, with
 * an rms residual of 0.65 mm over spans of 302 to 1839 mm, and residuals
 * mixed in sign. Two independent solves agree to four figures.
 *
 * That the lines can be fitted at all rests on `v(T) = kT`, which the booklet
 * does not guarantee, each tempo having its own throttle screw. It holds
 * because the screws are set until the roll reaches the numbered line in half
 * a minute: the lines are the calibration target, so a correctly regulated
 * instrument reproduces them by construction. The circularity is in Welte's
 * reasoning, not in the measurement.
 *
 * The two constants are not equally secure. **`revolutionSeconds` is robust** —
 * across doubling lengths from 2500 to 5253 cm the fitted speed moves only 2 %,
 * so the 6 % correction to the museum's 220 cm/min stands almost independently
 * of the acceleration. **`layerCm` is the weaker of the two**: it is fitted over
 * 1.8 m of paper and then used over 28, where it predicts the speed rising 41 %
 * across a roll. Nothing green confirms that yet — the +33 % in the parser's
 * axis is Stahnke's red 0.22/foot map carried over, not a green measurement,
 * though green paper being thicker (Phillips p. 202) does put green above red
 * as the fit has it. The drawn nuance lines are the evidence with the leverage
 * to settle it, since a shape error in the axis shows up as agreement decaying
 * along the roll.
 *
 * `layerCm` is an effective layer, absorbing winding tension and the air
 * between turns, so 1.91 times the red figure is not a claim about caliper.
 *
 * Both constants are derived through `ROWS_PER_INCH`, since the cross-lines are
 * measured in scan rows: the mission reads 300.25 throughout, where Stanford's
 * own header says 300. That is 0.08 % on the speed, well below the correction
 * but not below the level at which two numbers should silently be on different
 * grids.
 */
export declare const WELTE_T98_SPOOL: Spool;
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
