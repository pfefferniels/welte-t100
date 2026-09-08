/**
 * The Nuancierbalg of a red Welte as a pneumatic bellows rather than a ramp
 * generator: the latching relay of `relay.ts` in front of the shared nuancing
 * block of `core/nuancing.ts`.
 *
 * The state `x` is the closure of the nuance bellows: 0 fully open, which sets
 * the cone valve for the least vacuum and so the softest attack, 1 fully closed
 * and loudest. On Hagmann's account the Mezzoforte bellows' pin stops it halfway,
 * so `x` is also, up to the two rails, the roll's printed scale.
 *
 * The crescendo target sits short of full closure: a slow crescendo alone cannot
 * pull the bellows against the spring all the way to fortissimo, which is what
 * midi2exp expresses as its `welte_loud` ceiling and what appears here as an
 * asymptote instead of a cap. The T-98 derives that ceiling instead, from a
 * permanent bleed Welte names; the T-100 has no such bore and fits it.
 *
 * Several readings were carried as switches and priced by refitting without
 * them: a latching sforzando, a sforzando that sets the crescendo, a cancel that
 * holds until countermanded, note density loading the supply or added to the
 * trace, the Widerstand, dry friction, a grip at the closed rail, a lift band of
 * the cancelling valve's own, a hook that yields as a spring, a floor-only pin,
 * a pin of fitted thickness, and two further offsets of the pen. None earned its
 * place, on roll 3309 and then across six rolls, and they are gone from the code.
 * `empirics/docs/experiments.md` in roll-nuance-tracer records what each cost,
 * and the source that carried them is at tag `full-model`.
 */
import type { Model } from "../core/types.ts";
import type { Scaling } from "../core/units.ts";
/** Which of the T-100's constants carry the span between the rails. */
export declare const T100_SCALING: Scaling;
export declare const pneumaticModel: Model;
