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
import { runBellows } from "../core/nuancing.js";
import { t100Relay } from "./relay.js";
/**
 * Bounds are set a few times wider than what `empirics/docs/measurements.md` measures off
 * roll 3309, not as wide as the arithmetic allows. Wider than that only enlarges
 * the space the search has to cross without adding any candidate the mechanism
 * could produce, and a fitted value sitting on a bound is reported rather than
 * hidden, so a bound that turns out to be wrong will show. On the six lined
 * rolls a few values do sit there, which the empirics' `docs/rolls.md` records.
 */
const SPEC = [
    { name: "alpha", lower: 0, upper: 2, unit: "1", note: "flow-law exponent: 0 constant rate, ½ orifice, 1 laminar" },
    { name: "piano", lower: -0.1, upper: 0.15, unit: "scale", note: "fully open rail" },
    { name: "forte", lower: 0.8, upper: 1.05, unit: "scale", note: "fully closed rail" },
    { name: "mezzoforte", lower: 0.3, upper: 0.75, unit: "scale", note: "centre of the Mezzoforte pin, not the face a falling line rests on" },
    { name: "crescendoRate", lower: 0.05, upper: 5, unit: "1/s", note: "conductance of conduit 39 towards vacuum" },
    { name: "crescendoTarget", lower: 0.55, upper: 2, unit: "scale", note: "asymptote a slow crescendo alone reaches" },
    { name: "releaseRate", lower: 0.1, upper: 8, unit: "1/s", note: "conductance of conduit 39 with bore 100, refilling" },
    { name: "releaseTarget", lower: -0.5, upper: 0.15, unit: "scale", note: "asymptote of the open bellows" },
    { name: "sforzandoRate", lower: 0.5, upper: 40, unit: "1/s", note: "conductance of the wider conduit 23" },
    { name: "sforzandoTarget", lower: 0.5, upper: 3, unit: "scale", note: "asymptote a sforzando drives towards" },
    { name: "sforzandoAssistRate", lower: 0, upper: 80, unit: "1/s", note: "throttle 96, open only under the cancel punch" },
    { name: "tripThreshold", lower: 0, upper: 0.6, unit: "1", note: "port opening a relay membrane needs before it fires; bore 20 sets it" },
    { name: "membraneFillMs", lower: 0, upper: 200, unit: "ms", note: "how fast the sforzando-on membrane chamber charges; bore 20 sets it" },
    { name: "assistFillMs", lower: 0, upper: 400, unit: "ms", note: "the same for the cancelling valve, which Welte adjusts separately at bore 29" },
    { name: "valveTailMs", lower: 1, upper: 300, unit: "ms", note: "how fast it bleeds away again; bore 29 sets it" },
    { name: "inertiaMs", lower: 0, upper: 200, unit: "ms", note: "mass of bellows, chain and cone valve" },
    { name: "leadRows", lower: -200, upper: 100, unit: "scan rows", note: "how far the sforzando-off code sits behind the drawn line" },
    { name: "leadSforzandoOnRows", lower: -60, upper: 60, unit: "scan rows", note: "the sforzando-on code, relative to that" },
    { name: "leadCrescendoRows", lower: -80, upper: 80, unit: "scan rows", note: "the two crescendo codes, relative to that" },
    { name: "leadDriftRows", lower: -60, upper: 60, unit: "scan rows", note: "change in the offset from the start of the roll to the end" },
    { name: "valveBand", lower: 0.01, upper: 1, unit: "1", note: "share of the charge above the trip threshold over which the sforzando valve lifts; 1 is the whole of it" },
    { name: "throughFlowLoad", lower: 0, upper: 2, unit: "s", note: "how far the supply sags under the air that runs straight through the bellows while conduit 39 stands open to atmosphere and the sforzando valve draws" },
    { name: "scaleWarp", lower: -2.5, upper: 2.5, unit: "1", note: "curvature of bellows travel against the printed scale; 0 is linear" },
    { name: "stopRestitution", lower: 0, upper: 0.9, unit: "1", note: "how much of its speed the bellows keeps when it rebounds off the rigid hook" },
];
/**
 * Where every fit starts, read off roll 3309 directly rather than guessed: the rails and the hook's
 * arrest face from where the line comes to rest, the two slow conductances and
 * the crescendo's asymptote from the exponential fitted to rate against position,
 * the two fast conductances from the plateau rate of the fast episodes, and the
 * shift from the collapse of the line before its cancelling punch. `mezzoforte`
 * is the pin's centre, half a thickness below the measured face.
 *
 * The crescendo's asymptote sits short of the closed rail, which is both what the
 * roll measures and what the Leseregeln of Pfeffer's dissertation states: a
 * crescendo alone reaches a forte "bei dem sich der Balg zwischen mittlerer und
 * vollständig geschlossener Stellung befindet", and only a sforzando governs the
 * range above it. `empirics/docs/measurements.md` has the measurements; the
 * figures are the average of the two halves, since one set of defaults has to
 * serve both. Fitting moves them, but not far, and this is what the model
 * predicts before any fitting at all. A playback runs on the presets and the
 * consensus in `instruments.ts`, fitted to each of the six lined rolls and
 * pooled over them. These defaults are only where each fit starts.
 */
const DEFAULTS = {
    alpha: 1,
    piano: 0.02,
    forte: 0.93,
    mezzoforte: 0.55,
    crescendoRate: 0.8,
    crescendoTarget: 0.82,
    releaseRate: 1.6,
    releaseTarget: 0.038,
    sforzandoRate: 3.6,
    sforzandoTarget: 1.8,
    sforzandoAssistRate: 21,
    tripThreshold: 0.25,
    membraneFillMs: 30,
    assistFillMs: 30,
    valveTailMs: 40,
    inertiaMs: 30,
    leadRows: -59,
    leadSforzandoOnRows: -4,
    leadCrescendoRows: 0,
    leadDriftRows: 0,
    valveBand: 1,
    throughFlowLoad: 0,
    scaleWarp: 0,
    stopRestitution: 0.2,
};
/** Which of the T-100's constants carry the span between the rails. */
export const T100_SCALING = {
    levels: ["mezzoforte", "crescendoTarget", "releaseTarget", "sforzandoTarget"],
    conductances: ["crescendoRate", "releaseRate", "sforzandoRate", "sforzandoAssistRate"],
    loads: ["throughFlowLoad"],
};
function run(input, params) {
    const relay = t100Relay(input, params);
    return runBellows(input.grid, params, relay.drive, relay.engaged);
}
export const pneumaticModel = {
    name: "pneumatic",
    summary: "Bellows filling through conduits, with a fitted flow law and a rigid Mezzoforte pin.",
    spec: SPEC,
    defaults: DEFAULTS,
    scaling: T100_SCALING,
    run,
};
