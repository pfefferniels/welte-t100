/**
 * The Stanford model (Shi and Sapp, `midi2exp`), as a baseline.
 *
 * A first-order integrator with constant rates: a slow decrescendo runs
 * whenever nothing else is set, Crescendo and Sforzando add their own constant
 * rates on top, and the Mezzoforte hook clamps the value to whichever side of
 * the M.F. level it was already on. midi2exp works in MIDI velocity, with
 * welte_p 35, welte_mf 60, welte_f 90 and welte_loud 75; since every rule in it
 * is affine, running it in scale units with `mf` at 0.4545 reproduces it
 * exactly. That number is the point: the roll's own printed M.F. gridline sits
 * at 0.5, so the default parameters here already disagree with the paper about
 * where mezzoforte is.
 *
 * Sforzando is read as momentary — active only while the perforation is under
 * the tracker bar — which is midi2exp's reading and, on Hagmann's account of the
 * relay, probably wrong. `sforzandoLatches` switches to the other reading.
 */
import { latched, momentary, portOf } from "./latch.js";
import { clamp, simulate } from "./types.js";
const SPEC = [
    { name: "piano", lower: -0.2, upper: 0.3, unit: "scale", note: "lower rail, P.P. end of the travel" },
    { name: "mezzoforte", lower: 0.3, upper: 0.7, unit: "scale", note: "level the M.F. hook holds to" },
    { name: "forte", lower: 0.7, upper: 1.2, unit: "scale", note: "upper rail, F.F. end of the travel" },
    { name: "loud", lower: 0.5, upper: 1.2, unit: "scale", note: "ceiling a slow crescendo alone can reach" },
    { name: "slowMs", lower: 300, upper: 8000, unit: "ms", note: "time for the slow rate to cross P to M.F." },
    { name: "fastCrescendoMs", lower: 30, upper: 1500, unit: "ms", note: "time for Sforzando on to cross P to M.F." },
    { name: "fastDecrescendoMs", lower: 30, upper: 1500, unit: "ms", note: "time for Sforzando off to cross F to P" },
    { name: "sforzandoLatches", lower: 0, upper: 1, unit: "flag", note: "1 = Sforzando holds until cancelled" },
];
const DEFAULTS = {
    piano: 0,
    mezzoforte: (60 - 35) / (90 - 35),
    forte: 1,
    loud: (75 - 35) / (90 - 35),
    slowMs: 2380,
    fastCrescendoMs: 300,
    fastDecrescendoMs: 400,
    sforzandoLatches: 0,
};
function run(input, params) {
    const { piano, mezzoforte, forte, loud, slowMs, fastCrescendoMs, fastDecrescendoMs } = params;
    const slowStep = (mezzoforte - piano) / slowMs;
    const fastCrescendoStep = (mezzoforte - piano) / fastCrescendoMs;
    const fastDecrescendoStep = -(forte - piano) / fastDecrescendoMs;
    const epsilon = 1e-4;
    const isMf = latched(portOf(input, "mezzoforte", "on"), portOf(input, "mezzoforte", "off"));
    const isSlowCrescendo = latched(portOf(input, "crescendo", "on"), portOf(input, "crescendo", "off"));
    const holdsSforzando = params.sforzandoLatches >= 0.5;
    const sforzandoOn = portOf(input, "sforzando", "on");
    const sforzandoOff = portOf(input, "sforzando", "off");
    const isFastCrescendo = holdsSforzando
        ? latched(sforzandoOn, sforzandoOff)
        : momentary(sforzandoOn);
    const isFastDecrescendo = holdsSforzando
        ? new Uint8Array(input.grid.length)
        : momentary(sforzandoOff);
    const advance = (state, index) => {
        const milliseconds = input.grid.dt[index] * 1000;
        const quiescent = !isSlowCrescendo[index] && !isFastCrescendo[index] && !isFastDecrescendo[index];
        const rate = quiescent
            ? -slowStep
            : isSlowCrescendo[index] * slowStep +
                isFastCrescendo[index] * fastCrescendoStep +
                isFastDecrescendo[index] * fastDecrescendoStep;
        const previous = state.value;
        let next = previous + rate * milliseconds;
        if (isMf[index]) {
            if (previous > mezzoforte) {
                next = rate < 0 ? Math.max(mezzoforte + epsilon, next) : Math.min(forte, next);
            }
            else if (previous < mezzoforte) {
                next = rate > 0 ? Math.min(mezzoforte - epsilon, next) : Math.max(piano, next);
            }
        }
        else if (isSlowCrescendo[index] && !isFastCrescendo[index] && previous < loud) {
            next = Math.min(next, loud - epsilon);
        }
        state.value = clamp(next, piano, forte);
        return state.value;
    };
    return simulate(input.grid.length, { value: piano }, advance);
}
export const midi2expModel = {
    name: "midi2exp",
    summary: "Stanford's constant-rate integrator, in scale units. Baseline only.",
    spec: SPEC,
    defaults: DEFAULTS,
    run,
};
