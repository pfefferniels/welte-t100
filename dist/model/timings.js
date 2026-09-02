/**
 * Fitted parameters translated into times a reader can check against the
 * instrument and against midi2exp's published constants.
 *
 * midi2exp states its rates as the time to cross a named span — piano to
 * mezzoforte for the two crescendos, forte to piano for the fast decrescendo.
 * The flow law here makes the rate depend on where the bellows is, so the same
 * quantity has to be integrated rather than divided out. Nothing is clamped and
 * the Mezzoforte pin is ignored, so these are the free travel times.
 */
const STEP_SECONDS = 1e-4;
const LIMIT_SECONDS = 30;
function travelTime(from, to, rate, target, alpha) {
    const direction = Math.sign(to - from);
    const speedAt = (x) => {
        const gap = target - x;
        return gap === 0 ? 0 : Math.sign(gap) * Math.abs(gap) ** alpha * rate;
    };
    let x = from;
    let elapsed = 0;
    while (elapsed < LIMIT_SECONDS && Math.sign(to - x) === direction) {
        const speed = speedAt(x);
        if (Math.sign(speed) !== direction || speed === 0)
            return Number.POSITIVE_INFINITY;
        x += speed * STEP_SECONDS;
        elapsed += STEP_SECONDS;
    }
    return elapsed * 1000;
}
/**
 * The four times, on the roll's printed scale. `mezzoforte` is the fitted stop,
 * not the printed gridline, so the spans are the ones the mechanism actually has.
 */
export function traversals(params) {
    const p = params;
    const piano = p.piano ?? 0;
    const forte = p.forte ?? 1;
    const mezzoforte = p.mezzoforte ?? 0.5;
    const alpha = p.alpha ?? 1;
    const at = (from, to, rate, target) => ({
        from,
        to,
        milliseconds: travelTime(from, to, rate, target, alpha),
    });
    return {
        "slow crescendo, P to M.F.": at(piano, mezzoforte, p.crescendoRate ?? 0, p.crescendoTarget ?? 1),
        "slow decrescendo, M.F. to P": at(mezzoforte, piano, p.releaseRate ?? 0, p.releaseTarget ?? 0),
        "sforzando, P to F": at(piano, forte, p.sforzandoRate ?? 0, p.sforzandoTarget ?? 1),
        "sforzando release, F to P": at(forte, piano, p.sforzandoAssistRate ?? 0, p.releaseTarget ?? 0),
        "slow crescendo, P to F": at(piano, forte, p.crescendoRate ?? 0, p.crescendoTarget ?? 1),
    };
}
export function describeTraversals(params) {
    return Object.entries(traversals(params)).map(([span, travel]) => ({
        span,
        from: travel.from.toFixed(3),
        to: travel.to.toFixed(3),
        ms: Number.isFinite(travel.milliseconds) ? travel.milliseconds.toFixed(0) : "never reached",
    }));
}
