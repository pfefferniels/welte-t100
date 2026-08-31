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
import { latched, momentary, portOf } from "./latch.js";
import { limitAtStop, newStopState, penetration } from "./stop.js";
import { clamp, shiftedByDriftingRows, simulate, } from "./types.js";
/**
 * Bounds are set a few times wider than what `docs/empirics.md` measures off
 * this roll, not as wide as the arithmetic allows. Wider than that only enlarges
 * the space the search has to cross without adding any candidate the mechanism
 * could produce, and a fitted value sitting on a bound is reported rather than
 * hidden, so a bound that turns out to be wrong will show.
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
    { name: "membraneFillMs", lower: 0, upper: 200, unit: "ms", note: "how fast the relay membrane chamber charges through an open port" },
    { name: "valveTailMs", lower: 1, upper: 300, unit: "ms", note: "how fast it bleeds away again; bore 29 sets it" },
    { name: "inertiaMs", lower: 0, upper: 200, unit: "ms", note: "mass of bellows, chain and cone valve" },
    { name: "leadRows", lower: -200, upper: 100, unit: "scan rows", note: "shift of the model along the paper" },
    { name: "leadDriftRows", lower: -60, upper: 60, unit: "scan rows", note: "change in that shift from the start of the roll to the end" },
    { name: "scaleWarp", lower: -2.5, upper: 2.5, unit: "1", note: "curvature of bellows travel against the printed scale; 0 is linear" },
    { name: "regulatorGain", lower: -0.01, upper: 0.01, unit: "scale·s/note", note: "note density added to the trace, the wrong shape for a supply effect but kept to compare" },
    { name: "supplyDroop", lower: 0, upper: 0.06, unit: "s/note", note: "how far the blower sags per note per second sounding, over both halves" },
    { name: "windRateGain", lower: 0.3, upper: 3, unit: "1", note: "closing rates while the Widerstand is set" },
    { name: "windTargetShift", lower: -0.4, upper: 0.4, unit: "scale", note: "shift of the closing targets with it" },
    { name: "mfBarrier", lower: 0, upper: 1, unit: "flag", note: "1 = the Mezzoforte pin is in the path at all" },
    { name: "mfTwoSided", lower: 0, upper: 1, unit: "flag", note: "1 = the pin blocks both ways; 0 = a floor only" },
    { name: "mfThickness", lower: 0, upper: 0.3, unit: "scale", note: "extent of the pin; the band it makes unreachable" },
    { name: "stopStiffness", lower: 0, upper: 60000, unit: "1/s²", note: "springiness of the contact at the hook; 0 is a rigid wall" },
    { name: "stopDamping", lower: 0, upper: 400, unit: "1/s", note: "how fast the rebound at the hook dies away" },
    { name: "sforzandoLatches", lower: 0, upper: 1, unit: "flag", note: "1 = sforzando holds until cancelled" },
    { name: "sforzandoSetsCrescendo", lower: 0, upper: 1, unit: "flag", note: "1 = a sforzando also sets the crescendo relay" },
];
/**
 * Read off roll 3309 directly rather than guessed: the rails and the hook's
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
 * range above it. `docs/empirics.md` has the measurements; the
 * figures are the average of the two halves, since one set of defaults has to
 * serve both. Fitting moves them, but not far, and this is what the model
 * predicts before any fitting at all.
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
    valveTailMs: 40,
    inertiaMs: 30,
    leadRows: -55,
    leadDriftRows: 0,
    scaleWarp: 0,
    regulatorGain: 0,
    supplyDroop: 0,
    windRateGain: 1,
    windTargetShift: 0,
    mfBarrier: 1,
    mfTwoSided: 1,
    mfThickness: 0.1,
    stopStiffness: 12000,
    stopDamping: 40,
    sforzandoLatches: 0,
    sforzandoSetsCrescendo: 0,
};
/** Signed driving term of one flow path. */
function drive(target, x, alpha) {
    const gap = target - x;
    return gap === 0 ? 0 : Math.sign(gap) * Math.abs(gap) ** alpha;
}
/**
 * How far past a rail the bellows may be carried before the model simply stops
 * it. The drawn line does leave the printed span a little at both ends — a
 * minimum of −0.033 and a maximum of 1.031 across the two halves — so a hard
 * clamp at the rails is not quite what the paper shows either.
 */
const OVERRUN = 0.06;
function run(input, params) {
    const p = params;
    // Every parameter is read once here: the step below runs a couple of hundred
    // thousand times per evaluation and a property lookup per read is not free.
    const alpha = p.alpha;
    const piano = p.piano;
    const forte = p.forte;
    const mezzoforte = p.mezzoforte;
    const crescendoRate = p.crescendoRate;
    const crescendoTarget = p.crescendoTarget;
    const releaseRate = p.releaseRate;
    const releaseTarget = p.releaseTarget;
    const sforzandoRate = p.sforzandoRate;
    const sforzandoTarget = p.sforzandoTarget;
    const assistRate = p.sforzandoAssistRate;
    const inertiaMs = p.inertiaMs;
    const windRateGain = p.windRateGain;
    const windTargetShift = p.windTargetShift;
    const supplyDroop = p.supplyDroop;
    const trip = p.tripThreshold;
    const membraneFillMs = p.membraneFillMs;
    const valveTailMs = p.valveTailMs;
    const graded = (open) => (open <= trip ? 0 : (open - trip) / (1 - trip));
    const twoSided = p.mfTwoSided >= 0.5;
    const stopStiffness = p.stopStiffness;
    const stopDamping = p.stopDamping;
    const mfThickness = p.mfThickness;
    const mfActive = p.mfBarrier >= 0.5;
    const couples = p.sforzandoSetsCrescendo >= 0.5;
    const isMf = latched(portOf(input, "mezzoforte", "on"), portOf(input, "mezzoforte", "off"));
    const sforzandoOnPort = portOf(input, "sforzando", "on");
    const sforzandoOffPort = portOf(input, "sforzando", "off");
    const holdsSforzando = p.sforzandoLatches >= 0.5;
    const isSforzando = holdsSforzando ? latched(sforzandoOnPort, sforzandoOffPort) : momentary(sforzandoOnPort);
    const crescendoRelay = latched(portOf(input, "crescendo", "on"), portOf(input, "crescendo", "off"));
    const wind = latched(portOf(input, "windResistance", "on"), portOf(input, "windResistance", "off"));
    const steps = input.grid.dt;
    const load = input.totalNoteDensity;
    const advance = (state, index) => {
        const dt = steps[index];
        const sforzando = isSforzando[index];
        const crescendo = crescendoRelay[index] || (couples && sforzando === 1);
        // The blower feeds the relay's vacuum chamber as well as the note pneumatics,
        // so anything that loads it changes how hard the bellows is pulled closed:
        // the Widerstand by design, and the notes sounding by sagging the supply.
        // Less vacuum both slows the closing and lowers the level it can reach, so
        // one factor scales the conductance and pulls the target back towards the
        // open end. Reopening runs off atmosphere and the bellows spring, and is
        // left alone by both.
        const supply = 1 / (1 + supplyDroop * load[index]);
        const boosted = wind[index] === 1;
        const boost = (boosted ? windRateGain : 1) * supply;
        const shift = boosted ? windTargetShift : 0;
        const sag = (target) => releaseTarget + (target + shift - releaseTarget) * supply;
        const conduit39 = crescendo
            ? boost * crescendoRate * drive(sag(crescendoTarget), state.x, alpha)
            : releaseRate * drive(releaseTarget, state.x, alpha);
        // The relay valve does not follow its port. Air enters the membrane chamber
        // through the port and leaves through a bleed, and the valve lifts only once
        // the chamber has charged past the membrane's threshold. That is why Welte's
        // control 4b can ask for six short perforations to give six steps while six
        // shorter ones give none: a punch too brief to charge the chamber does
        // nothing at all. The same bleed is what keeps the valve open a little after
        // the punch has gone, rounding every trailing edge. Both time constants are
        // adjusted on the instrument, at bores 20 and 29.
        const charge = (held, port) => {
            const tau = port > held ? membraneFillMs : valveTailMs;
            return tau <= 0 ? port : port + (held - port) * Math.exp((-dt * 1000) / tau);
        };
        state.sforzandoCharge = charge(state.sforzandoCharge, sforzandoOnPort[index]);
        state.assistCharge = charge(state.assistCharge, sforzandoOffPort[index]);
        const opening = holdsSforzando ? sforzando : graded(state.sforzandoCharge);
        const conduit23 = opening > 0 ? boost * sforzandoRate * opening * drive(sag(sforzandoTarget), state.x, alpha) : 0;
        const cancelling = graded(state.assistCharge);
        const assist = cancelling > 0 ? assistRate * cancelling * drive(releaseTarget, state.x, alpha) : 0;
        const target = conduit39 + conduit23 + assist;
        const smoothing = inertiaMs > 0 ? Math.exp((-dt * 1000) / inertiaMs) : 0;
        state.velocity = target + (state.velocity - target) * smoothing;
        const moved = state.x + state.velocity * dt;
        const engaged = mfActive && isMf[index] === 1;
        const held = limitAtStop(state.stop, engaged, state.x, moved, mezzoforte, twoSided, mfThickness);
        // Every stop in this mechanism is a spring, not a wall: a bellows leaf and a
        // thin rod, arriving with momentum. While the bellows is pressed into one the
        // contact pushes back in proportion to how far, and takes energy out of the
        // rebound, so the line overshoots the level it settles at and springs back —
        // which is what the drawn line visibly does at the hook after a fast
        // collapse. The two rails are the same linkage and share the constants. At
        // zero stiffness this reduces to the clamp it replaces.
        const atHook = stopStiffness > 0 ? penetration(state.stop, engaged, moved, mezzoforte, twoSided, mfThickness) : 0;
        const into = atHook > 0 ? atHook : Math.max(moved - forte, piano - moved, 0);
        if (stopStiffness > 0 && into > 0) {
            const towards = atHook > 0 ? (held > moved ? 1 : -1) : moved > forte ? -1 : 1;
            state.velocity += (towards * stopStiffness * into - stopDamping * state.velocity) * dt;
            state.x = clamp(moved, piano - OVERRUN, forte + OVERRUN);
            return state.x;
        }
        const next = clamp(held, piano, forte);
        if (next !== moved)
            state.velocity = 0;
        state.x = next;
        return next;
    };
    // The line was drawn by a pen carried on a swinging board, so the printed scale
    // need not be linear in the bellows' own travel: a lever on an arc compresses
    // one end against the other. The rails map to themselves, so this bends the
    // interior only, and at zero it is the identity and nothing is claimed.
    const warp = p.scaleWarp;
    const toScale = (x) => {
        if (warp === 0 || forte === piano)
            return x;
        const u = (x - piano) / (forte - piano);
        return piano + (forte - piano) * ((Math.exp(warp * u) - 1) / (Math.exp(warp) - 1));
    };
    const travel = simulate(input.grid.length, { x: piano, velocity: 0, stop: newStopState(), sforzandoCharge: 0, assistCharge: 0 }, advance);
    const gain = p.regulatorGain;
    if (gain !== 0) {
        const density = input.noteDensity;
        travel.forEach((value, index) => {
            travel[index] = value + gain * density[index];
        });
    }
    if (warp !== 0) {
        travel.forEach((value, index) => {
            travel[index] = toScale(value);
        });
    }
    return shiftedByDriftingRows(travel, p.leadRows, p.leadDriftRows);
}
export const pneumaticModel = {
    name: "pneumatic",
    summary: "Bellows filling through conduits, with a fitted flow law and a hard Mezzoforte barrier.",
    spec: SPEC,
    defaults: DEFAULTS,
    run,
};
