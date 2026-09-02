"""Does the crescendo relay explain why a sforzando is faster when it is set?

Conduit 39 is joined to the bellows permanently and the crescendo relay only
switches its far end between blower vacuum and atmosphere. So with the sforzando
set and the crescendo cancelled, 39 is admitting air and working against the
sforzando; with the crescendo set, both conduits pull the same way. If the two
paths simply add, the gap between the two cases should be the slow crescendo rate
plus the slow decrescendo rate at the same position, both already measured.

The two groups of episodes do not cover the same positions, so the observed gap is
also taken over a band of positions both groups reach.
"""

from __future__ import annotations

import numpy as np

import episodes


def _samples(curve, events, half, rails, mf_level, lead_ms, require):
    found = episodes.extract(
        curve, events, half, "sforz_on", +1, rails, mf_level, lead_ms, require=require, onset_rate=0.6
    )
    levels, rates = [], []
    for episode in found:
        if episode.v.size < 12:
            continue
        step = 3
        rate = (episode.v[2 * step :] - episode.v[: -2 * step]) / (episode.t[2 * step :] - episode.t[: -2 * step])
        # The middle half of the excursion, matching the plateau estimate.
        low, high = rate.size // 4, max(rate.size // 4 + 1, 3 * rate.size // 4)
        levels.append(episode.v[step:-step][low:high])
        rates.append(rate[low:high])
    if not levels:
        return np.empty(0), np.empty(0), 0
    return np.concatenate(levels), np.concatenate(rates), len(found)


def test(curve, events, half, rails, mf_level, lead_ms, crescendo_fit, decrescendo_fit, band_width=0.05) -> dict:
    on_level, on_rate, on_n = _samples(
        curve, events, half, rails, mf_level, lead_ms,
        lambda cresc, sforz, mf: (not sforz) and (not mf) and cresc,
    )
    off_level, off_rate, off_n = _samples(
        curve, events, half, rails, mf_level, lead_ms,
        lambda cresc, sforz, mf: (not sforz) and (not mf) and (not cresc),
    )
    if on_level.size == 0 or off_level.size == 0:
        return {"note": "no episodes in one of the two groups"}

    crescendo = lambda v: (crescendo_fit["v_inf"] - v) / (crescendo_fit["tau_ms"] / 1000.0)
    decrescendo = lambda v: (decrescendo_fit["v_inf"] - v) / (decrescendo_fit["tau_ms"] / 1000.0)
    predicted = lambda v: crescendo(v) - decrescendo(v)

    # Level-matched: only the bands both groups actually reach.
    edges = np.arange(0.0, 1.0001, band_width)
    matched_gap, matched_pred, weights, bands = [], [], [], []
    for low, high in zip(edges[:-1], edges[1:]):
        here_on = (on_level >= low) & (on_level < high)
        here_off = (off_level >= low) & (off_level < high)
        if here_on.sum() < 40 or here_off.sum() < 40:
            continue
        matched_gap.append(float(np.median(on_rate[here_on]) - np.median(off_rate[here_off])))
        matched_pred.append(float(np.median(predicted(np.concatenate([on_level[here_on], off_level[here_off]])))))
        weights.append(int(min(here_on.sum(), here_off.sum())))
        bands.append(float(0.5 * (low + high)))

    weight = np.array(weights, dtype=float)
    gap = np.array(matched_gap)
    prediction = np.array(matched_pred)
    pooled_gap = float(np.median(on_rate) - np.median(off_rate))
    pooled_pred = float(np.median(predicted(np.concatenate([on_level, off_level]))))
    return {
        "episodes": {"crescendo_on": on_n, "crescendo_off": off_n},
        "samples": {"crescendo_on": int(on_level.size), "crescendo_off": int(off_level.size)},
        "pooled": {"observed_gap": pooled_gap, "predicted_gap": pooled_pred, "explained": pooled_pred / pooled_gap if pooled_gap else np.nan},
        "level_matched": {
            "bands": bands,
            "observed_gap": gap.tolist(),
            "predicted_gap": prediction.tolist(),
            "weight": weights,
            "observed_mean": float(np.average(gap, weights=weight)) if weight.size else np.nan,
            "predicted_mean": float(np.average(prediction, weights=weight)) if weight.size else np.nan,
            "explained": float(np.average(prediction, weights=weight) / np.average(gap, weights=weight)) if weight.size else np.nan,
        },
    }
