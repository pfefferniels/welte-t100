/**
 * Agreement between an emulated curve and the drawn one.
 *
 * Everything here is masked: rows the tracer could not witness carry no
 * evidence, so they neither reward nor punish a model. All errors are in units
 * of the roll's printed scale, where 1.0 is the whole P.P.–F.F. span.
 */
function forEachMasked(a, b, mask, visit) {
    let n = 0;
    for (let i = 0; i < mask.length; i += 1) {
        if (mask[i] === 0)
            continue;
        visit(a[i], b[i]);
        n += 1;
    }
    return n;
}
/** The fitter's inner loop, so written out rather than routed through a callback. */
export function maskedRmse(model, truth, mask) {
    let sum = 0;
    let n = 0;
    for (let index = 0; index < mask.length; index += 1) {
        if (mask[index] === 0)
            continue;
        const error = model[index] - truth[index];
        sum += error * error;
        n += 1;
    }
    return n === 0 ? Number.NaN : Math.sqrt(sum / n);
}
function quantile(sorted, q) {
    if (sorted.length === 0)
        return Number.NaN;
    const position = q * (sorted.length - 1);
    const lower = Math.floor(position);
    const upper = Math.min(lower + 1, sorted.length - 1);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}
export function agreement(model, truth, mask) {
    const errors = [];
    let sumSquare = 0;
    let sumSigned = 0;
    let sumModel = 0;
    let sumTruth = 0;
    let sumModelSq = 0;
    let sumTruthSq = 0;
    let sumProduct = 0;
    const n = forEachMasked(model, truth, mask, (x, y) => {
        const error = x - y;
        errors.push(Math.abs(error));
        sumSquare += error * error;
        sumSigned += error;
        sumModel += x;
        sumTruth += y;
        sumModelSq += x * x;
        sumTruthSq += y * y;
        sumProduct += x * y;
    });
    const sorted = Float64Array.from(errors).sort();
    const covariance = sumProduct / n - (sumModel / n) * (sumTruth / n);
    const spread = Math.sqrt(sumModelSq / n - (sumModel / n) ** 2) * Math.sqrt(sumTruthSq / n - (sumTruth / n) ** 2);
    return {
        n,
        rmse: Math.sqrt(sumSquare / n),
        mae: errors.reduce((total, value) => total + value, 0) / n,
        medianAbs: quantile(sorted, 0.5),
        p90Abs: quantile(sorted, 0.9),
        bias: sumSigned / n,
        correlation: spread === 0 ? Number.NaN : covariance / spread,
    };
}
/** The model shifted `rows` rows later, with the ends held. */
export function shifted(series, rows) {
    if (rows === 0)
        return series;
    return Float64Array.from(series, (_, index) => {
        const source = Math.min(Math.max(index - rows, 0), series.length - 1);
        return series[source];
    });
}
/**
 * The shift that best aligns the model with the drawn line. A negative result
 * means the model has to be moved earlier, i.e. the drawn line leads the punches.
 */
export function bestLag(model, truth, mask, range) {
    const scored = range.map((rows) => ({ rows, rmse: maskedRmse(shifted(model, rows), truth, mask) }));
    const best = scored.reduce((a, b) => (b.rmse < a.rmse ? b : a));
    return { ...best, agreement: agreement(shifted(model, best.rows), truth, mask) };
}
export function intersect(...masks) {
    const [first, ...rest] = masks;
    if (!first)
        throw new Error("intersect needs at least one mask");
    return Uint8Array.from(first, (value, index) => (rest.every((mask) => mask[index]) ? value : 0));
}
