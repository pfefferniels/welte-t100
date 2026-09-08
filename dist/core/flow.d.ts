/**
 * The flow law both scales fill their bellows through.
 *
 *     dx/dt = Σ  g_i · a_i · sign(T_i − x) · |T_i − x|^α
 *
 * with `g` a conductance in 1/s, `a` how far that path's valve stands open, `T`
 * the position that path pulls towards, and `α` the flow exponent: 1 for a
 * laminar throttle, giving exponential approach; ½ for an orifice, where flow
 * goes as the square root of the pressure difference and the target is reached
 * in finite time; 0 for a constant rate, which is what midi2exp, pianolatron and
 * PlaySK assume and which is included here only so the family contains them.
 *
 * Stahnke specifies the same family independently: a Welte expression pneumatic
 * wants "incremental numerical integration of first-order differential equations
 * … nonlinear because the pressure drop across a timing orifice is proportional
 * to the square of the flow rate" (Deutsches Museum Studies 17, 2026, p. 80),
 * which is α = ½. α is fitted rather than chosen, so the roll says which regime
 * it is in.
 */
/** Signed driving term of one flow path. */
export declare function drive(target: number, x: number, alpha: number): number;
/**
 * Conductance of a path that carries its bellows or chamber across `fraction`
 * of the span in `ms`. Every constraint Welte states is a time, so the
 * parameters that name a travel time are times and the flow law converts them
 * here.
 */
export declare function conductanceFor(fraction: number, ms: number, alpha: number): number;
