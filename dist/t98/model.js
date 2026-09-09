/**
 * The Nuancierbalg of a green Welte: the duration-coded relay of `relay.ts` in
 * front of the shared nuancing block of `core/nuancing.ts`.
 *
 * The state `x` is the closure of the Nuancierbalg 90, Welte's letter N, and
 * everything after the summed drive is the T-100's, on Hagmann's authority that
 * the nuancing unit is built the same for both scales (p. 96). What differs is
 * the relay in front of it and one bore: the permanent bleed 100, which Welte
 * added because the crescendo's own throttle cannot readmit air fast enough
 * (Betriebsanleitung p. 13).
 *
 * **Nothing here is fitted.** The defaults are the starting values of the model
 * specification §6.1, built from Welte's own regulation controls, Schmitz's green
 * hole lengths, Hall's green paper speed and the T-100 consensus, and they are
 * where a fit starts rather than what a fit found. `instruments.ts` says which
 * sets exist and what each rests on.
 */
import { RAIL_COMPLIANCE, RAIL_SCALING, runBellows } from "../core/nuancing.js";
import { simulate } from "../core/types.js";
import { t98Relay } from "./relay.js";
/**
 * Bounds follow the T-100's practice: a few times wider than the starting values
 * warrant, and a fitted value sitting on a bound is reported rather than hidden.
 * The `note` on each says which part of Hagmann's Anhang 14 it is, and which of
 * Welte's screws adjusts it where a screw exists.
 */
const SPEC = [
    { name: "alpha", lower: 0, upper: 2, unit: "1", note: "flow-law exponent, one for all four paths: 0 constant rate, ½ orifice, 1 laminar" },
    { name: "piano", lower: -0.1, upper: 0.15, unit: "scale", note: "the P.P. gridline as ruled on that sheet" },
    { name: "forte", lower: 0.8, upper: 1.05, unit: "scale", note: "the F.F. gridline" },
    { name: "mezzoforte", lower: 0.2, upper: 0.9, unit: "scale", note: "centre of the pin on bellows 93; regulated per instrument and per half (control 2c), and no measurement of it exists on either scale" },
    { name: "crescendoRate", lower: 0.02, upper: 8, unit: "1/s", note: "conduit 39 through throttle 98, Welte's Crescendo-F; the same restriction serves both directions" },
    { name: "crescendoTarget", lower: 0.8, upper: 2, unit: "scale", note: "asymptote of conduit 39 on chamber 68; held at the closed rail by default, the ceiling coming from bore 100 instead" },
    { name: "bleedRate", lower: 0, upper: 1, unit: "1/s", note: "bore 100, Welte's Crescendo-P, permanently open to atmosphere in both directions" },
    { name: "releaseTarget", lower: -0.5, upper: 0.15, unit: "scale", note: "asymptote of the open bellows" },
    { name: "sforzandoForteRate", lower: 0.2, upper: 40, unit: "1/s", note: "conduit 23 through throttle 99, Welte's Forzando-F" },
    { name: "sforzandoTarget", lower: 0.8, upper: 3, unit: "scale", note: "asymptote of conduit 23; not the hook, which Welte's tests calibrate a rate against" },
    { name: "sforzandoPianoRate", lower: 0, upper: 80, unit: "1/s", note: "throttle 96 through auxiliary bellows 94, Welte's Forzando-P" },
    { name: "tripThreshold", lower: 0, upper: 0.7, unit: "1", note: "port opening a relay membrane needs before it fires; one membrane design, bounded above by one 2.66 mm punch" },
    { name: "forteFillMs", lower: 0, upper: 200, unit: "ms", note: "charge of the sforzando-forte chamber; bore 82, which Welte's §6 norms by counting six steps" },
    { name: "forteTailMs", lower: 1, upper: 300, unit: "ms", note: "its decay; the same bore 82" },
    { name: "pianoFillMs", lower: 0, upper: 400, unit: "ms", note: "charge of the sforzando-piano chamber; bore 70, which Welte's §4 norms by counting three" },
    { name: "pianoTailMs", lower: 1, upper: 300, unit: "ms", note: "its decay; the same bore 70, adjustable separately from 82, where the T-100 shares one tail" },
    { name: "crescendoFillMs", lower: 0, upper: 400, unit: "ms", note: "bore 78; nothing norms it, so it starts tied to the mean of 70 and 82" },
    { name: "crescendoTailMs", lower: 1, upper: 300, unit: "ms", note: "bore 78; long enough to carry the charge across a chain's paper bridges" },
    { name: "mezzoforteFillMs", lower: 0, upper: 400, unit: "ms", note: "bore 74; nothing norms it" },
    { name: "mezzoforteTailMs", lower: 1, upper: 300, unit: "ms", note: "bore 74; nothing norms it" },
    { name: "forteBand", lower: 0.01, upper: 1, unit: "1", note: "share of the charge above the trip over which valve 84 lifts" },
    { name: "pianoBand", lower: 0.01, upper: 1, unit: "1", note: "the same for double valve 72, which a short cancel must be able to lift only part way" },
    { name: "inertiaMs", lower: 0, upper: 200, unit: "ms", note: "mass of bellows, chain and cone valve" },
    { name: "throughFlowLoad", lower: 0, upper: 2, unit: "s", note: "how far the supply sags under air admitted while vacuum is drawn; 0 leaves the term out" },
    { name: "stopRestitution", lower: 0, upper: 0.9, unit: "1", note: "how much of its speed the bellows keeps when it rebounds off the rigid hook; carried over from red rolls, nothing on a T-98 measures it" },
    { name: "leadRows", lower: -200, upper: 100, unit: "scan rows", note: "how far the sforzando-piano code sits behind the drawn line; Welte's own notation intends zero" },
    { name: "leadSforzandoOnRows", lower: -60, upper: 60, unit: "scan rows", note: "the sforzando-forte code, relative to that" },
    { name: "leadCrescendoRows", lower: -80, upper: 80, unit: "scan rows", note: "the crescendo code, relative to that" },
    { name: "leadMezzoforteRows", lower: -80, upper: 80, unit: "scan rows", note: "the mezzoforte code, relative to that; the T-98 has one edge where the T-100 had two" },
    { name: "leadDriftRows", lower: -60, upper: 60, unit: "scan rows", note: "change in the offset from the start of the roll to the end" },
    { name: "scaleWarp", lower: -2.5, upper: 2.5, unit: "1", note: "curvature of bellows travel against the printed scale; 0 is linear" },
    { name: "blowerThreshold", lower: 0, upper: 1, unit: "scale", note: "where the mercury contact of Skala-Rolle §12 switches the motor resistance out" },
    { name: "blowerStep", lower: 0, upper: 1, unit: "1", note: "how much the supply rises when it does; 0 is the identity and the default" },
    { name: "blowerHysteresis", lower: 0, upper: 0.3, unit: "scale", note: "half the width of the band the contact does not chatter in" },
    { name: "dumpDepth", lower: 0, upper: 1, unit: "1", note: "how far throttle 97 collapses the delivered vacuum on a sforzando-piano, downstream of the cone valve; 0 is the default and it must be 0 whenever a drawn line is being fitted" },
    { name: "dumpRiseMs", lower: 1, upper: 500, unit: "ms", note: "how fast it opens" },
    { name: "dumpFallMs", lower: 1, upper: 500, unit: "ms", note: "how fast the wind chamber recovers" },
    // A property of the bellows rather than of the pen, so it is fitted per
    // instrument and not per roll. `core/nuancing.ts` says what measures it.
    ...RAIL_COMPLIANCE,
];
/**
 * Where a fit starts. **Not fitted values**, and none of them measures a green
 * instrument: they are §6.1 of the model specification, built at α = 1 and a hook
 * of 0.5, and every level moves with the hook the fit finds.
 *
 * The sforzando pair comes from Welte's own two step-count controls and no
 * program's constant: six short forzando-forte holes present 274 ms of open port
 * and must carry the bellows from rest to the hook (Skala-Rolle §6), three short
 * forzando-piano holes present 120 ms and must carry it from the closed rail to
 * the open one (§4, third movement). The crescendo pair comes from Phillips's
 * slow times, 2.49 s and 2.43 s from rest to hook, split between the two bores by
 * the ceiling: with A the asymptote, k = crescendoRate + bleedRate = −ln(1 − h/A)/t,
 * crescendoRate = A·k and bleedRate = (1 − A)·k. The valve timings, the exponent,
 * the inertia and the rebound are the T-100 consensus averaged over its two
 * halves, since one set of defaults has to serve both here as there.
 *
 * `mezzoforte` is a weak prior at 0.45 with a wide box, not a value. Six figures
 * for the hook are in circulation spanning a factor of nearly three, and they
 * disagree mainly because they are fractions of different quantities — of MIDI
 * velocity, of stack pressure, of an internal state, of travel, of a drawn span.
 * No measurement of a T-98 hook exists. A fit against a drawn line will measure
 * it as a fraction of the printed P.P.–F.F. span, which is what the T-100's 0.77
 * also is and what nothing else in the literature is.
 */
const DEFAULTS = {
    alpha: 1.15,
    piano: 0,
    forte: 1,
    mezzoforte: 0.45,
    crescendoRate: 0.29,
    crescendoTarget: 1,
    bleedRate: 0.022,
    releaseTarget: -0.2,
    sforzandoForteRate: 1.19,
    sforzandoTarget: 1.8,
    sforzandoPianoRate: 14.9,
    tripThreshold: 0.25,
    forteFillMs: 1.7,
    forteTailMs: 52,
    pianoFillMs: 21.6,
    pianoTailMs: 52,
    crescendoFillMs: 11.7,
    crescendoTailMs: 52,
    mezzoforteFillMs: 11.7,
    mezzoforteTailMs: 52,
    forteBand: 0.011,
    pianoBand: 1,
    inertiaMs: 18.7,
    throughFlowLoad: 0,
    stopRestitution: 0.57,
    leadRows: 0,
    leadSforzandoOnRows: 0,
    leadCrescendoRows: 0,
    leadMezzoforteRows: 0,
    leadDriftRows: 0,
    scaleWarp: 0,
    blowerThreshold: 0.6,
    blowerStep: 0,
    blowerHysteresis: 0.05,
    dumpDepth: 0,
    dumpRiseMs: 40,
    dumpFallMs: 120,
    // Measured on the green lines but not yet fitted, so it ships as the identity.
    railWidth: 0,
    railDrag: 0,
};
/** Which of the T-98's constants carry the span between the rails. */
export const T98_SCALING = {
    levels: ["mezzoforte", "crescendoTarget", "releaseTarget", "sforzandoTarget", "blowerThreshold", "blowerHysteresis"],
    conductances: ["crescendoRate", "bleedRate", "sforzandoForteRate", "sforzandoPianoRate"],
    loads: ["throughFlowLoad"],
    ...RAIL_SCALING,
};
/**
 * How far throttle 97 has collapsed the delivered vacuum, row by row.
 *
 * Bellows 95 opens 97 on the same command that opens 96, and 97 dumps atmosphere
 * into wind chamber 86 and conduit 88, downstream of the cone valve. It moves no
 * bellows, so it belongs on the velocity map and not on the travel, and it must
 * be off whenever the model is fitted against a drawn line, because a pen on the
 * Nuancierbalg cannot see it. No source gives its size.
 *
 * It is also the likeliest explanation of Phillips's 4.6 : 1 asymmetry between
 * the green fast crescendo and the fast decrescendo, which his own model reports
 * as a suction level and not as a position: a measurement of suction sees the
 * dump, and a measurement of position does not. A traced green line would decide
 * it — a fall near the rise means the asymmetry belongs to throttle 97.
 */
function deliveryDump(lift, dt, riseMs, fallMs) {
    return simulate(lift.length, { open: 0 }, (state, index) => {
        const towards = lift[index] > 0 ? 1 : 0;
        const tau = towards === 1 ? riseMs : fallMs;
        state.open = towards + (state.open - towards) * Math.exp((-dt[index] * 1000) / tau);
        return state.open;
    });
}
export function runNuancing(input, params) {
    const p = { ...DEFAULTS, ...params };
    const relay = t98Relay(input, p);
    return {
        travel: runBellows(input.grid, p, relay.drive, relay.engaged),
        dump: deliveryDump(relay.sforzandoPiano, input.grid.dt, p.dumpRiseMs, p.dumpFallMs),
    };
}
/** How far throttle 96 stands open, which the rewind of `rewind.ts` reads on the bass side. */
export function sforzandoPianoLift(input, params) {
    return t98Relay(input, { ...DEFAULTS, ...params }).sforzandoPiano;
}
export const pneumaticT98Model = {
    name: "pneumatic-t98",
    summary: "Four conduits on one bellows, three of them duration-coded and one a permanent bleed.",
    spec: SPEC,
    defaults: DEFAULTS,
    scaling: T98_SCALING,
    run: (input, params) => runNuancing(input, params).travel,
};
