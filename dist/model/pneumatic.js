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
import { latched, momentary, shiftedPortOf, windResistanceOf } from "./latch.js";
import { limitAtStop, newStopState, penetration } from "./stop.js";
import { clamp, shiftedByLevel, simulate, } from "./types.js";
/**
 * Bounds are set a few times wider than what `docs/empirics.md` measures off
 * this roll, not as wide as the arithmetic allows. Wider than that only enlarges
 * the space the search has to cross without adding any candidate the mechanism
 * could produce, and a fitted value sitting on a bound is reported rather than
 * hidden, so a bound that turns out to be wrong will show.
 */
/** How near the closed rail the grip acts, in scale units. */
const RAIL_BAND = 0.05;
/** Below this the contact is a rest rather than an impact, and nothing rebounds. */
const REBOUND_FLOOR = 0.5;
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
    { name: "assistYields", lower: 0, upper: 1, unit: "1", note: "how far a fresh sforzando-on shuts the reopening assist down; helps the bass a little, hurts the treble, so left at zero for the fit to price" },
    { name: "tripThreshold", lower: 0, upper: 0.6, unit: "1", note: "port opening a relay membrane needs before it fires; bore 20 sets it" },
    { name: "membraneFillMs", lower: 0, upper: 200, unit: "ms", note: "how fast the sforzando-on membrane chamber charges; bore 20 sets it" },
    { name: "assistFillMs", lower: 0, upper: 400, unit: "ms", note: "the same for the cancelling valve, which Welte adjusts separately at bore 29" },
    { name: "valveTailMs", lower: 1, upper: 300, unit: "ms", note: "how fast it bleeds away again; bore 29 sets it" },
    { name: "inertiaMs", lower: 0, upper: 200, unit: "ms", note: "mass of bellows, chain and cone valve" },
    { name: "leadRows", lower: -200, upper: 100, unit: "scan rows", note: "how far the sforzando-off code sits behind the drawn line" },
    { name: "leadSforzandoOnRows", lower: -60, upper: 60, unit: "scan rows", note: "the sforzando-on code, relative to that" },
    { name: "leadCrescendoRows", lower: -80, upper: 80, unit: "scan rows", note: "the two crescendo codes, relative to that" },
    { name: "leadMezzoforteRows", lower: -80, upper: 80, unit: "scan rows", note: "the two mezzoforte codes, relative to that" },
    { name: "leadPerLevelRows", lower: -60, upper: 60, unit: "scan rows", note: "how much the offset moves between the two rails, as the pen swings" },
    { name: "leadDriftRows", lower: -60, upper: 60, unit: "scan rows", note: "change in that shift from the start of the roll to the end" },
    { name: "valveBand", lower: 0.01, upper: 1, unit: "1", note: "share of the charge above the trip threshold over which the sforzando valve lifts; 1 is the whole of it" },
    { name: "assistBand", lower: 0.05, upper: 1, unit: "1", note: "the same for the cancelling valve, which Welte adjusts at its own bore 29" },
    { name: "throughFlowLoad", lower: 0, upper: 2, unit: "s", note: "how far the supply sags under the air that runs straight through the bellows while conduit 39 stands open to atmosphere and the sforzando valve draws" },
    { name: "dragThreshold", lower: 0, upper: 3, unit: "scale/s", note: "net drive the board needs anywhere before it moves at all; static friction in the chain and the cone-valve linkage" },
    { name: "railGrip", lower: 0, upper: 1.0, unit: "scale/s", note: "net drive needed to pull the bellows off its closed rail" },
    { name: "scaleWarp", lower: -2.5, upper: 2.5, unit: "1", note: "curvature of bellows travel against the printed scale; 0 is linear" },
    { name: "regulatorGain", lower: -0.01, upper: 0.01, unit: "scale·s/note", note: "note density added to the trace, the wrong shape for a supply effect but kept to compare" },
    { name: "supplyDroop", lower: 0, upper: 0.06, unit: "s/note", note: "how far the blower sags per note per second sounding, over both halves" },
    { name: "windRateGain", lower: 0.3, upper: 3, unit: "1", note: "closing rates while the Widerstand is set" },
    { name: "windTargetShift", lower: -0.4, upper: 0.4, unit: "scale", note: "shift of the closing targets with it" },
    { name: "mfBarrier", lower: 0, upper: 1, unit: "flag", note: "1 = the Mezzoforte pin is in the path at all" },
    { name: "mfTwoSided", lower: 0, upper: 1, unit: "flag", note: "1 = the pin blocks both ways; 0 = a floor only" },
    { name: "mfThickness", lower: 0, upper: 0.3, unit: "scale", note: "extent of the pin; the band it makes unreachable" },
    { name: "stopRestitution", lower: 0, upper: 0.9, unit: "1", note: "how much of its speed the bellows keeps when it rebounds off the rigid hook; 0 uses the compliant contact instead" },
    { name: "stopStiffness", lower: 0, upper: 90000, unit: "1/s²", note: "springiness of the contact at the hook; the measured 32 ms period implies about 38 500" },
    { name: "stopDamping", lower: 0, upper: 400, unit: "1/s", note: "how fast the rebound at the hook dies away" },
    { name: "sforzandoLatches", lower: 0, upper: 1, unit: "flag", note: "1 = sforzando holds until cancelled" },
    { name: "assistLatches", lower: 0, upper: 1, unit: "flag", note: "1 = the cancel holds until a sforzando countermands it, rather than acting for its punch" },
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
    assistYields: 0,
    tripThreshold: 0.25,
    membraneFillMs: 30,
    assistFillMs: 30,
    valveTailMs: 40,
    inertiaMs: 30,
    leadRows: -59,
    leadSforzandoOnRows: -4,
    leadCrescendoRows: 0,
    leadMezzoforteRows: 0,
    leadPerLevelRows: 0,
    leadDriftRows: 0,
    valveBand: 1,
    assistBand: 1,
    throughFlowLoad: 0,
    dragThreshold: 0,
    railGrip: 0,
    scaleWarp: 0,
    regulatorGain: 0,
    supplyDroop: 0,
    windRateGain: 1,
    windTargetShift: 0,
    mfBarrier: 1,
    mfTwoSided: 1,
    mfThickness: 0.1,
    stopRestitution: 0.2,
    stopStiffness: 0,
    stopDamping: 0,
    sforzandoLatches: 0,
    assistLatches: 0,
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
    const railGrip = p.railGrip;
    const dragThreshold = p.dragThreshold;
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
    const assistYields = p.assistYields;
    const inertiaMs = p.inertiaMs;
    const windRateGain = p.windRateGain;
    const windTargetShift = p.windTargetShift;
    const supplyDroop = p.supplyDroop;
    const throughFlowLoad = p.throughFlowLoad;
    const trip = p.tripThreshold;
    const membraneFillMs = p.membraneFillMs;
    const assistFillMs = p.assistFillMs;
    const valveTailMs = p.valveTailMs;
    // How far past the trip threshold the membrane chamber must charge before the
    // valve is fully lifted, as a share of the range that remains. The present
    // model lifts it over the whole of that range, which is 1 here, so the
    // parameter nests it and the search can walk down from it continuously.
    //
    // The band belongs to the valve, not to the pair. Welte adjusts the two at
    // separate bores, 20 and 29, and the model already gives them separate fill
    // constants. Sharing one band costs far more than the term gains, all of it on
    // the cancel: it makes a subito piano reach full conductance almost at once,
    // which is what controls 4c and 4d forbid.
    const lift = (share) => {
        const band = (1 - trip) * share;
        return (open) => (open <= trip ? 0 : Math.min((open - trip) / band, 1));
    };
    const graded = lift(p.valveBand);
    const gradedAssist = lift(p.assistBand);
    const twoSided = p.mfTwoSided >= 0.5;
    const stopStiffness = p.stopStiffness;
    const stopDamping = p.stopDamping;
    const mfThickness = p.mfThickness;
    const mfActive = p.mfBarrier >= 0.5;
    const couples = p.sforzandoSetsCrescendo >= 0.5;
    // Each code is slid along the paper by its own measured offset before anything
    // else happens, so the mechanism sees the roll as it was laid out.
    const lead = p.leadRows;
    const drift = p.leadDriftRows;
    const at = (control, action, extra) => shiftedPortOf(input, control, action, lead + extra, drift);
    const mfShift = p.leadMezzoforteRows;
    const crescendoShift = p.leadCrescendoRows;
    const isMf = latched(at("mezzoforte", "on", mfShift), at("mezzoforte", "off", mfShift));
    const sforzandoOnPort = at("sforzando", "on", p.leadSforzandoOnRows);
    const sforzandoOffPort = at("sforzando", "off", 0);
    const holdsSforzando = p.sforzandoLatches >= 0.5;
    const isSforzando = holdsSforzando ? latched(sforzandoOnPort, sforzandoOffPort) : momentary(sforzandoOnPort);
    const crescendoRelay = latched(at("crescendo", "on", crescendoShift), at("crescendo", "off", crescendoShift));
    // Welte's controls 4c and 4d have the cancel act for the length of its
    // perforation, so a short one returns the bellows only part of the way. Those
    // regulate a playback instrument; this line was drawn by a machine nobody has
    // described. If instead the cancel held until a sforzando countermanded it, the
    // depth of a subito piano would be set by what came next rather than by the
    // punch — which is what the roll's non-monotonic fall against punch length
    // hints at. Kept as an option so the two readings can be compared.
    const heldCancel = p.assistLatches >= 0.5 ? latched(sforzandoOffPort, sforzandoOnPort) : undefined;
    const wind = windResistanceOf(input, lead, drift);
    const steps = input.grid.dt;
    const load = input.totalNoteDensity;
    const advance = (state, index) => {
        const dt = steps[index];
        const sforzando = isSforzando[index];
        const crescendo = crescendoRelay[index] || (couples && sforzando === 1);
        // The relay valve does not follow its port. Air enters the membrane chamber
        // through the port and leaves through a bleed, and the valve lifts only once
        // the chamber has charged past the membrane's threshold. That is why Welte's
        // control 4b can ask for six short perforations to give six steps while six
        // shorter ones give none: a punch too brief to charge the chamber does
        // nothing at all. The same bleed is what keeps the valve open a little after
        // the punch has gone, rounding every trailing edge. Both time constants are
        // adjusted on the instrument, at bores 20 and 29.
        const charge = (held, port, fill) => {
            const tau = port > held ? fill : valveTailMs;
            return tau <= 0 ? port : port + (held - port) * Math.exp((-dt * 1000) / tau);
        };
        state.sforzandoCharge = charge(state.sforzandoCharge, sforzandoOnPort[index], membraneFillMs);
        // The cancelling valve charges more slowly, which is what makes a short
        // cancel return the bellows only part of the way, as Welte's control 4d
        // requires and as the drawn line does: without it the model collapses to the
        // floor at cancels the line barely registers.
        state.assistCharge = charge(state.assistCharge, sforzandoOffPort[index], assistFillMs);
        const opening = holdsSforzando ? sforzando : graded(state.sforzandoCharge);
        // The blower feeds the relay's vacuum chamber as well as the note pneumatics,
        // so anything that loads it changes how hard the bellows is pulled closed:
        // the Widerstand by design, and the notes sounding by sagging the supply.
        // Less vacuum both slows the closing and lowers the level it can reach, so
        // one factor scales the conductance and pulls the target back towards the
        // open end. Reopening runs off atmosphere and the bellows spring, and is
        // left alone by both.
        //
        // The nuancing system loads that supply itself. With the crescendo relay off,
        // conduit 39 stands open to atmosphere while the sforzando valve draws on
        // wind chamber 15, so air runs straight through the bellows and out through
        // 23 without moving it, and the draw grows with how far the bellows sits from
        // its open rest. That is the shape §4 wants: additive conductance accounts
        // for only about two thirds of the gap between a sforzando with the crescendo
        // set and one without, and the observed gap widens with position faster than
        // the prediction, +0.79 to +1.41 units/s where the prediction moves +0.70 to
        // +0.82. Section 4's comparison rests on 9 and 15 episodes, so it motivates
        // the term rather than settling it.
        const throughFlow = !crescendo && opening > 0 ? opening * releaseRate * Math.abs(drive(releaseTarget, state.x, alpha)) : 0;
        const supply = 1 / (1 + supplyDroop * load[index] + throughFlowLoad * throughFlow);
        const boosted = wind[index] === 1;
        const boost = (boosted ? windRateGain : 1) * supply;
        const shift = boosted ? windTargetShift : 0;
        const sag = (target) => releaseTarget + (target + shift - releaseTarget) * supply;
        const conduit39 = crescendo
            ? boost * crescendoRate * drive(sag(crescendoTarget), state.x, alpha)
            : releaseRate * drive(releaseTarget, state.x, alpha);
        const conduit23 = opening > 0 ? boost * sforzandoRate * opening * drive(sag(sforzandoTarget), state.x, alpha) : 0;
        // A sforzando-on arriving while the reopening assist is still acting lifts
        // valve 22 and reconnects the bellows to the vacuum through conduit 23, which
        // is the wider of the two. The subito piano is countermanded rather than
        // fought: without this the model collapses to the floor at a cancel that the
        // drawn line barely registers, and those few rows carry a quarter of the
        // bass error and two fifths of the treble's.
        const cancelling = heldCancel
            ? heldCancel[index]
            : gradedAssist(state.assistCharge) * (1 - assistYields * Math.min(opening, 1));
        const assist = cancelling > 0 ? assistRate * cancelling * drive(releaseTarget, state.x, alpha) : 0;
        let target = conduit39 + conduit23 + assist;
        // Held against its closed rail, the bellows takes a threshold of net drive to
        // pull away again: leather on a seat does not release at the first breath.
        // The band is deliberately narrow, so this is inert everywhere the bellows is
        // travelling and acts only where the line rests at the fortissimo stop. Above
        // about 1.2 the restoring drive near the rail can never win and the bellows
        // is trapped there for the rest of the roll, which the roll excludes, so the
        // range stops short of it.
        if (railGrip > 0 && target < 0 && -target < railGrip && state.x > forte - RAIL_BAND)
            target = 0;
        // Dry friction in the chain band, the roller and the cone-valve stem: the net
        // drive has to exceed a breakaway before anything moves, and once moving the
        // same constant is still being spent. Symmetric, and on the summed drive
        // rather than on any one path, because one linkage carries all of them.
        if (dragThreshold > 0) {
            const beyond = Math.abs(target) - dragThreshold;
            target = beyond > 0 ? Math.sign(target) * beyond : 0;
        }
        const smoothing = inertiaMs > 0 ? Math.exp((-dt * 1000) / inertiaMs) : 0;
        state.velocity = target + (state.velocity - target) * smoothing;
        const moved = state.x + state.velocity * dt;
        const engaged = mfActive && isMf[index] === 1;
        const held = limitAtStop(state.stop, engaged, state.x, moved, mezzoforte, twoSided, mfThickness);
        // The hook is a spring, not a wall: a bellows leaf and a thin rod arriving
        // with momentum. Pressed into it the contact pushes back in proportion to how
        // far and takes energy out of the rebound, so the line overshoots the level it
        // settles at and springs back — which is what the drawn line does, by 0.024
        // (bass) and 0.012 (treble) at 14 to 20 ms, one cycle of a heavily damped
        // bounce with the same 32 ms period in both halves, and the same under a trace
        // at a fiftieth of the step penalty. The overshoot grows with arrival speed,
        // which is what a compliant contact must do.
        //
        // The two rails are not treated this way. They show no rebound — but they are
        // also never approached at more than 10 units/s, against 20 and more at the
        // hook, because the fast crescendo rolls off over the last sixth of its travel
        // and the line decelerates into them. So the roll cannot say whether they are
        // compliant, and a hook-calibrated spring extrapolated down to rail speeds
        // would overshoot by 0.001, half a traced pixel. Sharing the constants would be
        // assuming what the data cannot show, for no gain.
        // The hook does not move. The bellows is stopped dead at its face and what is
        // left of the momentum sends it back the way it came, the drives then carrying
        // it down onto the hook again. `held` is already the arrested position, so the
        // board never passes the face, which is the difference from a spring it
        // presses into: the line rebounds *upward* off the stop rather than sinking
        // past it. Over fifteen clean arrivals in the Bass the drawn line rises 0.021
        // above the level it settles at and falls 0.011 below; a spring gives 0.009 and
        // 0.032, the wrong way round, and this gives 0.025 and 0.000. The Discant does
        // not rebound at all, so its coefficient should fit near zero.
        const restitution = p.stopRestitution;
        if (restitution > 0 && held !== moved) {
            const bounced = clamp(held, piano, forte);
            state.velocity = Math.abs(state.velocity) > REBOUND_FLOOR ? -restitution * state.velocity : 0;
            state.x = bounced;
            return bounced;
        }
        const atHook = stopStiffness > 0 && restitution === 0
            ? penetration(state.stop, engaged, moved, mezzoforte, twoSided, mfThickness)
            : 0;
        if (atHook > 0) {
            state.velocity += ((held > moved ? 1 : -1) * stopStiffness * atHook - stopDamping * state.velocity) * dt;
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
    // The map anchors on the two rails, so `piano` does two jobs: the clamp at the
    // open end, and the origin the bend is measured from. That is why the fit puts
    // it above the level the line rests at — 0.027 and 0.024 across eight seeds
    // against the 0.022 and 0.017 of `cli/settings.ts`, which is 2.5 and 2.3 seed
    // deviations. Profiled, held-out error falls monotonically past both the fitted
    // value and the measurement, and it is not the runaway episodes doing it: over
    // the ordinary stretches alone the preference barely moves.
    //
    // Giving the bend its own origin removes the conflict and does not pay for
    // itself. The profile then goes flat rather than settling on the measurement,
    // within 0.00004 over the whole range against a between-seed spread of 0.00099,
    // because the new origin absorbs whatever the rail is set to; the two come out
    // 91% degenerate and `piano` ends up 2.4x less determined than before. The
    // origin lands 0.008 to 0.014 above the rail, is not the P.P. gridline, and
    // slides as the rail is walked, so it names no landmark on the paper. The
    // ambiguity would be renamed rather than removed, so the rails stay tied.
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
    return shiftedByLevel(travel, p.leadPerLevelRows, (piano + forte) / 2);
}
export const pneumaticModel = {
    name: "pneumatic",
    summary: "Bellows filling through conduits, with a fitted flow law and a hard Mezzoforte barrier.",
    spec: SPEC,
    defaults: DEFAULTS,
    run,
};
