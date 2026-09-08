/**
 * The model's constants on two scales.
 *
 * A fit lives on its roll's printed scale, where the rails sit wherever the pen
 * rested on that sheet. An instrument lives in bellows travel, where the rails
 * are 0 and 1, so that one instrument can be compared with another and applied
 * to a roll whose rails sit elsewhere. The flow law converts exactly: with
 * x = piano + s·u and s the span between the rails,
 *
 *     dx/dt = g · |T − x|^α   becomes   du/dt = g · s^(α−1) · |T_u − u|^α
 *
 * so levels map linearly, a conductance picks up the factor s^(α−1) on the way
 * into travel units, and the through-flow load, which multiplies a conductance
 * times a gap, the factor s.
 * Times, thresholds, shares and the flow exponent are the same on both scales.
 * The offsets of the pen are in scan rows and the scale warp is already defined
 * on the travel between the rails, so both pass through unchanged.
 *
 * Two constants of the model stay in printed-scale units, the pin's thickness
 * and the floor below which an arrival does not rebound, so an instrument
 * applied to a roll sees them scaled by that roll's span, a few percent.
 */
function rescaled(params, scaling, piano, forte, toTravel) {
    const span = forte - piano;
    const alpha = params.alpha ?? 1;
    const level = (value) => (toTravel ? (value - piano) / span : piano + value * span);
    const conductance = (value) => (toTravel ? value * span ** (alpha - 1) : value * span ** (1 - alpha));
    const load = (value) => (toTravel ? value * span : value / span);
    const out = { ...params };
    const apply = (names, convert) => {
        names.forEach((name) => {
            if (name in out)
                out[name] = convert(out[name]);
        });
    };
    apply(scaling.levels, level);
    apply(scaling.conductances, conductance);
    apply(scaling.loads, load);
    out.piano = toTravel ? 0 : piano;
    out.forte = toTravel ? 1 : forte;
    return out;
}
export function unitsOf(scaling) {
    return {
        inTravelUnits: (params) => rescaled(params, scaling, params.piano ?? 0, params.forte ?? 1, true),
        onPrintedScale: (instrument, piano, forte) => rescaled(instrument, scaling, piano, forte, false),
    };
}
