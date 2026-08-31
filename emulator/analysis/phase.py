"""Rate of travel as a function of position, per latched state.

The discriminating measurement for the shape question. A constant-rate model
predicts a flat slope-versus-level line; relaxation towards an asymptote with a
single time constant predicts a straight line falling through zero at the
asymptote, with gradient -1/tau; orifice flow, dv/dt proportional to the square
root of the pressure difference, predicts a concave curve instead.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

import timeline

STATES = {
    "sforz_on": lambda cresc, sforz: sforz,
    "cresc_on": lambda cresc, sforz: cresc & ~sforz,
    "idle": lambda cresc, sforz: ~cresc & ~sforz,
}


@dataclass(frozen=True)
class Samples:
    """Aligned level, slope and latch state, with unusable rows already dropped."""

    seconds: np.ndarray
    value: np.ndarray
    rate: np.ndarray
    cresc: np.ndarray
    sforz: np.ndarray
    mf: np.ndarray


def samples(curve, events, half: str, lead_ms: float, window: int = 6, settle_ms: float = 60.0) -> Samples:
    value, seconds = curve.masked(), curve.seconds
    rate = (value[window:] - value[:-window]) / (seconds[window:] - seconds[:-window])
    level = 0.5 * (value[window:] + value[:-window])
    times = 0.5 * (seconds[window:] + seconds[:-window])

    shifted = times + lead_ms / 1000.0
    cresc = timeline.latch_state(events, half, "cresc", shifted)
    sforz = timeline.latch_state(events, half, "sforz", shifted)
    mf = timeline.latch_state(events, half, "mf", shifted)

    switches = np.array([e.sec_on for e in timeline.bellows_events(events, half)])
    since = shifted - switches[np.clip(np.searchsorted(switches, shifted, side="right") - 1, 0, None)]
    settled = since * 1000.0 > settle_ms

    keep = np.isfinite(rate) & np.isfinite(level) & settled
    return Samples(times[keep], level[keep], rate[keep], cresc[keep], sforz[keep], mf[keep])


def phase_profile(level: np.ndarray, rate: np.ndarray, edges: np.ndarray, min_count: int = 40):
    """Median slope per level bin, with a bootstrap-free interquartile spread."""
    index = np.digitize(level, edges) - 1
    centres, medians, spread, counts = [], [], [], []
    for bin_index in range(edges.size - 1):
        take = index == bin_index
        if take.sum() < min_count:
            continue
        centres.append(0.5 * (edges[bin_index] + edges[bin_index + 1]))
        medians.append(float(np.median(rate[take])))
        q1, q3 = np.percentile(rate[take], [25, 75])
        spread.append(float(q3 - q1))
        counts.append(int(take.sum()))
    return (np.array(centres), np.array(medians), np.array(spread), np.array(counts))


def fit_linear_rate(centres: np.ndarray, medians: np.ndarray, counts: np.ndarray):
    """Least squares dv/dt = a + b*v, weighted by bin count.

    Returns (a, b, asymptote, tau_ms, r2). tau follows from b = -1/tau.
    """
    weights = counts / counts.sum()
    design = np.stack([np.ones_like(centres), centres], axis=1)
    solution, *_ = np.linalg.lstsq(design * weights[:, None], medians * weights, rcond=None)
    intercept, gradient = solution
    predicted = design @ solution
    residual = medians - predicted
    r2 = 1.0 - float(np.sum(weights * residual**2) / np.sum(weights * (medians - np.average(medians, weights=weights)) ** 2))
    asymptote = -intercept / gradient if gradient != 0 else np.nan
    tau_ms = -1000.0 / gradient if gradient != 0 else np.inf
    return float(intercept), float(gradient), float(asymptote), float(tau_ms), r2


def fit_constant_rate(centres: np.ndarray, medians: np.ndarray, counts: np.ndarray):
    weights = counts / counts.sum()
    constant = float(np.average(medians, weights=weights))
    residual = medians - constant
    r2 = 1.0 - float(np.sum(weights * residual**2) / np.sum(weights * (medians - constant) ** 2)) if np.any(residual) else 0.0
    return constant, r2
