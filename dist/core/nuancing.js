/**
 * The Nuancierbalg, and everything that happens after the drives are summed.
 *
 * Hagmann divides the Nuancierungseinrichtung in two (p. 96): the Relais, which
 * turns the weak impulses from paper and tracker bar into stronger movement
 * impulses, and the Nuancierung proper, which turns those into movements of
 * bellows and valves. Of the second he writes that it is "von geringfügigen
 * Unterschieden abgesehen, für beide Blockskalen gleich konstruiert". His Anhang
 * 13 (T-100) and Anhang 14 (T-98) carry the identical block with the identical
 * part numbers 85–101, both captioned "Nach Welte 2", a manual that covers the
 * T-98. So this file is written once and each scale's relay stands in front of it.
 *
 * The state `x` is the closure of the nuance bellows 90, Welte's letter N: 0
 * fully open, which sets the cone valve 87 for the least vacuum and so the
 * softest attack, 1 fully closed and loudest. What a relay supplies is the summed
 * dx/dt of its own conduits; what happens to it here is the same on both scales:
 *
 *   - `inertiaMs` gives the bellows, chain and cone valve a little mass, so the
 *     velocity relaxes towards the flow-driven velocity instead of taking it at
 *     once. At zero the model is first order.
 *   - the Mezzoforte pin arrests the board at whichever of its two faces the
 *     board arrived at, and `stopRestitution` sends what is left of the momentum
 *     back the way it came.
 *   - the two rails clamp the travel and stop the bellows dead on contact.
 *   - `scaleWarp`, last, bends the whole trace, which models the pen on a
 *     swinging board and not the bellows. At zero it is the identity.
 *
 * That the model may stop at the bellows — that the map from valve position to
 * striking vacuum is instantaneous — is Welte's own claim for the regulator of
 * DRP 354 925, "Spannungsregler für Musikwerke": it acts "mit augenblicklicher
 * Wirkung", and the small loss hole H is there so that the chamber takes its
 * pressure "ohne Verzögerung". Nothing connects that patent to a T-98 instrument
 * in particular; the date and the firm fit.
 */
import { limitAtStop, MF_THICKNESS, newStopState } from "./stop.js";
import { clamp, simulate } from "./types.js";
/** Below this the contact is a rest rather than an impact, and nothing rebounds. */
const REBOUND_FLOOR = 0.5;
/**
 * The line was drawn by a pen carried on a swinging board, so the printed scale
 * need not be linear in the bellows' own travel: a lever on an arc compresses
 * one end against the other. The rails map to themselves, so this bends the
 * interior only, and at zero it is the identity and nothing is claimed.
 * The map anchors on the two rails, so `piano` does two jobs: the clamp at the
 * open end, and the origin the bend is measured from. Giving the bend its own
 * origin was priced on roll 3309 and removed the conflict without paying for
 * itself: the two came out 91 % degenerate, the new origin named no landmark on
 * the paper, and the ambiguity would have been renamed rather than removed.
 */
function warped(travel, piano, forte, warp) {
    if (warp === 0 || forte === piano)
        return travel;
    const span = forte - piano;
    const scale = Math.exp(warp) - 1;
    return travel.map((value) => piano + span * ((Math.exp(warp * ((value - piano) / span)) - 1) / scale));
}
/**
 * The bellows, stepped once per grid row. `engaged` is the Mezzoforte pin, row
 * by row, which each scale derives from its own relay.
 */
export function runBellows(grid, params, drive, engaged) {
    const piano = params.piano ?? 0;
    const forte = params.forte ?? 1;
    const mezzoforte = params.mezzoforte ?? 0.5;
    const inertiaMs = params.inertiaMs ?? 0;
    const restitution = params.stopRestitution ?? 0;
    const steps = grid.dt;
    const advance = (state, index) => {
        const dt = steps[index];
        const target = drive(state, index, dt);
        const smoothing = inertiaMs > 0 ? Math.exp((-dt * 1000) / inertiaMs) : 0;
        state.velocity = target + (state.velocity - target) * smoothing;
        const moved = state.x + state.velocity * dt;
        const held = limitAtStop(state.stop, engaged[index] === 1, state.x, moved, mezzoforte, MF_THICKNESS);
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
        if (next !== moved)
            state.velocity = 0;
        state.x = next;
        return next;
    };
    const travel = simulate(grid.length, { x: piano, velocity: 0, stop: newStopState() }, advance);
    return warped(travel, piano, forte, params.scaleWarp ?? 0);
}
/**
 * The model's output as a fraction of the bellows' travel: 0 at the open rail,
 * 1 at the closed rail. An instrument in travel units already is that; a fit on
 * a roll's printed scale needs its own rails taken out first.
 */
export function travelBetweenRails(output, params) {
    const piano = params.piano ?? 0;
    const forte = params.forte ?? 1;
    return Float64Array.from(output, (value) => (value - piano) / (forte - piano));
}
/** Where the centre of the Mezzoforte pin sits on that fraction of the travel. */
export function mezzoforteTravel(params) {
    const piano = params.piano ?? 0;
    const forte = params.forte ?? 1;
    return ((params.mezzoforte ?? 0.5) - piano) / (forte - piano);
}
