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
 * Several readings were carried as switches and priced by refitting without
 * them: a latching sforzando, a sforzando that sets the crescendo, a cancel that
 * holds until countermanded, note density loading the supply or added to the
 * trace, the Widerstand, dry friction, a grip at the closed rail, a lift band of
 * the cancelling valve's own, a hook that yields as a spring, a floor-only pin,
 * a pin of fitted thickness, and two further offsets of the pen. None earned its
 * place, on roll 3309 and then across six rolls, and they are gone from the code.
 * `docs/experiments.md` records what each cost, and the source that carried
 * them is at tag `full-model`.
 *
 * Not modelled: throttle 97, which on a sforzando release dumps air straight into
 * the wind chamber and collapses the output pressure without moving the bellows,
 * and the regulator bellows 91, which acts on the cone valve and not on the
 * bellows either. Neither should appear in a line that records bellows travel.
 */

import type { Control } from "../roll/expression.ts";
import { latched, shiftedPortOf } from "./latch.ts";
import { limitAtStop, MF_THICKNESS, newStopState, type StopState } from "./stop.ts";
import { clamp, simulate, type Model, type ModelInput, type Parameters, type ParameterSpec } from "./types.ts";

/**
 * Bounds are set a few times wider than what `docs/measurements.md` measures off
 * this roll, not as wide as the arithmetic allows. Wider than that only enlarges
 * the space the search has to cross without adding any candidate the mechanism
 * could produce, and a fitted value sitting on a bound is reported rather than
 * hidden, so a bound that turns out to be wrong will show.
 */
const SPEC: readonly ParameterSpec[] = [
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
 * range above it. `docs/measurements.md` has the measurements; the
 * figures are the average of the two halves, since one set of defaults has to
 * serve both. Fitting moves them, but not far, and this is what the model
 * predicts before any fitting at all.
 */
const DEFAULTS: Parameters = {
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

/** Below this the contact is a rest rather than an impact, and nothing rebounds. */
const REBOUND_FLOOR = 0.5;

/** Signed driving term of one flow path. */
function drive(target: number, x: number, alpha: number): number {
  const gap = target - x;
  return gap === 0 ? 0 : Math.sign(gap) * Math.abs(gap) ** alpha;
}

type State = {
  x: number;
  velocity: number;
  stop: StopState;
  /** Pressure in each momentary valve's membrane chamber, as a fraction of full. */
  sforzandoCharge: number;
  assistCharge: number;
};

function run(input: ModelInput, params: Parameters): Float64Array {
  const p = params as Record<string, number>;
  // Every parameter is read once here: the step below runs a couple of hundred
  // thousand times per evaluation and a property lookup per read is not free.
  const alpha = p.alpha!;
  const piano = p.piano!;
  const forte = p.forte!;
  const mezzoforte = p.mezzoforte!;
  const crescendoRate = p.crescendoRate!;
  const crescendoTarget = p.crescendoTarget!;
  const releaseRate = p.releaseRate!;
  const releaseTarget = p.releaseTarget!;
  const sforzandoRate = p.sforzandoRate!;
  const sforzandoTarget = p.sforzandoTarget!;
  const assistRate = p.sforzandoAssistRate!;
  const inertiaMs = p.inertiaMs!;
  const throughFlowLoad = p.throughFlowLoad!;
  const trip = p.tripThreshold!;
  const membraneFillMs = p.membraneFillMs!;
  const assistFillMs = p.assistFillMs!;
  const valveTailMs = p.valveTailMs!;
  const restitution = p.stopRestitution!;
  // How far past the trip threshold a membrane chamber must charge before its
  // valve is fully lifted, as a share of the range that remains. The sforzando
  // valve lifts over a fitted band, about a sixth of the charge on roll 3309; the
  // cancelling valve over the whole of it, which is what lets a short cancel
  // return the bellows only part of the way, as Welte's controls 4c and 4d
  // require. A band of the cancel's own was priced and rejected.
  const lift = (share: number) => {
    const band = (1 - trip) * share;
    return (open: number): number => (open <= trip ? 0 : Math.min((open - trip) / band, 1));
  };
  const graded = lift(p.valveBand!);
  const gradedAssist = lift(1);

  // Each code is slid along the paper by its own measured offset before anything
  // else happens, so the mechanism sees the roll as it was laid out.
  const lead = p.leadRows!;
  const drift = p.leadDriftRows!;
  const at = (control: Control, action: "on" | "off", extra: number): Float64Array =>
    shiftedPortOf(input, control, action, lead + extra, drift);

  const crescendoShift = p.leadCrescendoRows!;
  const isMf = latched(at("mezzoforte", "on", 0), at("mezzoforte", "off", 0));
  const sforzandoOnPort = at("sforzando", "on", p.leadSforzandoOnRows!);
  const sforzandoOffPort = at("sforzando", "off", 0);
  const crescendoRelay = latched(at("crescendo", "on", crescendoShift), at("crescendo", "off", crescendoShift));
  const steps = input.grid.dt;

  const advance = (state: State, index: number): number => {
    const dt = steps[index]!;
    const crescendo = crescendoRelay[index] === 1;

    // The relay valve does not follow its port. Air enters the membrane chamber
    // through the port and leaves through a bleed, and the valve lifts only once
    // the chamber has charged past the membrane's threshold. That is why Welte's
    // control 4b can ask for six short perforations to give six steps while six
    // shorter ones give none: a punch too brief to charge the chamber does
    // nothing at all. The same bleed is what keeps the valve open a little after
    // the punch has gone, rounding every trailing edge. Both time constants are
    // adjusted on the instrument, at bores 20 and 29.
    const charge = (held: number, port: number, fill: number): number => {
      const tau = port > held ? fill : valveTailMs;
      return tau <= 0 ? port : port + (held - port) * Math.exp((-dt * 1000) / tau);
    };
    state.sforzandoCharge = charge(state.sforzandoCharge, sforzandoOnPort[index]!, membraneFillMs);
    // The cancelling valve charges more slowly, which is what makes a short
    // cancel return the bellows only part of the way, as Welte's control 4d
    // requires and as the drawn line does: without it the model collapses to the
    // floor at cancels the line barely registers.
    state.assistCharge = charge(state.assistCharge, sforzandoOffPort[index]!, assistFillMs);

    const opening = graded(state.sforzandoCharge);

    // The blower feeds the relay's vacuum chamber as well as the note pneumatics,
    // and the nuancing system loads that supply itself. With the crescendo relay
    // off, conduit 39 stands open to atmosphere while the sforzando valve draws on
    // wind chamber 15, so air runs straight through the bellows and out through
    // 23 without moving it, and the draw grows with how far the bellows sits from
    // its open rest. Less vacuum both slows the closing and lowers the level it
    // can reach, so one factor scales the conductance and pulls the target back
    // towards the open end. Reopening runs off atmosphere and the bellows spring,
    // and is left alone. `docs/measurements.md` §4 motivates the term: additive
    // conductance accounts for only about two thirds of the gap between a
    // sforzando with the crescendo set and one without, and the observed gap
    // widens with position faster than the prediction.
    const throughFlow =
      !crescendo && opening > 0 ? opening * releaseRate * Math.abs(drive(releaseTarget, state.x, alpha)) : 0;
    const supply = 1 / (1 + throughFlowLoad * throughFlow);
    const sag = (target: number): number => releaseTarget + (target - releaseTarget) * supply;

    const conduit39 = crescendo
      ? supply * crescendoRate * drive(sag(crescendoTarget), state.x, alpha)
      : releaseRate * drive(releaseTarget, state.x, alpha);
    const conduit23 = opening > 0 ? supply * sforzandoRate * opening * drive(sag(sforzandoTarget), state.x, alpha) : 0;
    // A sforzando-on arriving while the reopening assist is still acting lifts
    // valve 22 and reconnects the bellows to the vacuum through conduit 23, which
    // is the wider of the two. The subito piano is countermanded rather than
    // fought: without this the model collapses to the floor at a cancel that the
    // drawn line barely registers, and those few rows carry a quarter of the
    // bass error and two fifths of the treble's.
    const cancelling = gradedAssist(state.assistCharge);
    const assist = cancelling > 0 ? assistRate * cancelling * drive(releaseTarget, state.x, alpha) : 0;

    const target = conduit39 + conduit23 + assist;
    const smoothing = inertiaMs > 0 ? Math.exp((-dt * 1000) / inertiaMs) : 0;
    state.velocity = target + (state.velocity - target) * smoothing;

    const moved = state.x + state.velocity * dt;
    const held = limitAtStop(state.stop, isMf[index] === 1, state.x, moved, mezzoforte, MF_THICKNESS);

    // The hook does not move. The bellows is stopped dead at its face and what is
    // left of the momentum sends it back the way it came, the drives then carrying
    // it down onto the hook again. `held` is already the arrested position, so the
    // board never passes the face: the line rebounds *upward* off the stop rather
    // than sinking past it. Over fifteen clean arrivals in the Bass of roll 3309
    // the drawn line rises 0.021 above the level it settles at and falls 0.011
    // below; a spring it presses into gives 0.009 and 0.032, the wrong way round,
    // and this gives 0.025 and 0.000. The two rails are not treated this way: they
    // show no rebound, but they are also never approached at more than 10 units/s
    // against 20 and more at the hook, so the roll cannot say whether they are
    // compliant.
    if (restitution > 0 && held !== moved) {
      const bounced = clamp(held, piano, forte);
      state.velocity = Math.abs(state.velocity) > REBOUND_FLOOR ? -restitution * state.velocity : 0;
      state.x = bounced;
      return bounced;
    }

    const next = clamp(held, piano, forte);
    if (next !== moved) state.velocity = 0;
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
  const warp = p.scaleWarp!;
  const toScale = (x: number): number => {
    if (warp === 0 || forte === piano) return x;
    const u = (x - piano) / (forte - piano);
    return piano + (forte - piano) * ((Math.exp(warp * u) - 1) / (Math.exp(warp) - 1));
  };

  const travel = simulate(
    input.grid.length,
    { x: piano, velocity: 0, stop: newStopState(), sforzandoCharge: 0, assistCharge: 0 },
    advance,
  );
  if (warp !== 0) {
    travel.forEach((value, index) => {
      travel[index] = toScale(value);
    });
  }
  return travel;
}

export const pneumaticModel: Model = {
  name: "pneumatic",
  summary: "Bellows filling through conduits, with a fitted flow law and a rigid Mezzoforte pin.",
  spec: SPEC,
  defaults: DEFAULTS,
  run,
};
