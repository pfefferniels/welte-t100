/**
 * The Nuancierbalg as a pneumatic bellows rather than a ramp generator.
 *
 * The state `x` is the closure of the nuance bellows: 0 fully open, which sets
 * the cone valve for the least vacuum and so the softest attack, 1 fully closed
 * and loudest. On Hagmann's account the Mezzoforte bellows' pin stops it halfway,
 * so `x` is also, up to the two rails, the roll's printed scale.
 *
 * The bellows fills and empties through conduits, so its speed depends on how
 * far it still has to go. Which law that follows depends on the flow regime:
 *
 *     dx/dt = Σ  g_i · a_i · sign(T_i − x) · |T_i − x|^α
 *
 * with α = 1 for a laminar throttle, giving exponential approach; α = ½ for an
 * orifice, where flow goes as the square root of the pressure difference and the
 * target is reached in finite time; α = 0 for a constant rate, which is what
 * midi2exp assumes and is included here only so the family contains it. α is
 * fitted rather than chosen.
 *
 * Each valve contributes one term:
 *
 *   - conduit 39 is always joined to the bellows and its far end is switched by
 *     the crescendo relay between blower vacuum and atmosphere, so it is one path
 *     with two targets. When crescendo is cancelled the refill runs through 39
 *     together with the throttled bore 100, which is why its conductance is
 *     fitted separately even though Hagmann says the two directions are regulated
 *     to take the same time.
 *   - conduit 23 is wider and opens only while the sforzando valve is set.
 *   - throttle 96 opens only while the cancelling perforation is present, and
 *     assists the reopening after a sforzando.
 *
 * The crescendo target sits short of full closure: a slow crescendo alone cannot
 * pull the bellows against the spring all the way to fortissimo, which is what
 * midi2exp expresses as its `welte_loud` ceiling and what appears here as an
 * asymptote instead of a cap.
 *
 * `inertiaMs` gives the bellows, chain and cone valve a little mass: the velocity
 * relaxes towards the flow-driven velocity instead of taking it at once. At zero
 * the model is first order.
 *
 * Not modelled: throttle 97, which on a sforzando release dumps air straight into
 * the wind chamber and collapses the output pressure without moving the bellows,
 * and the regulator bellows 91, which acts on the cone valve and not on the
 * bellows either. Neither should appear in a line that records bellows travel.
 * `regulatorGain` exists to test that claim, and is zero by default.
 */
import { type Model } from "./types.ts";
export declare const pneumaticModel: Model;
