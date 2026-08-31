"""Three candidate laws for how fast the bellows travels, and how to score them.

Written in the phase plane, where each law has a distinct signature that needs
no time alignment:

    constant rate      dv/dt = k                     (midi2exp's assumption)
    exponential        dv/dt = (v_inf - v) / tau
    orifice flow       dv/dt = C * sqrt(v_inf - v)
"""

from __future__ import annotations

import numpy as np
from scipy.optimize import curve_fit

BIN_EDGES = np.arange(0.0, 1.0001, 0.04)


def profile(level: np.ndarray, rate: np.ndarray, edges: np.ndarray = BIN_EDGES, min_count: int = 60):
    """Median rate per level bin, with the count and the interquartile spread."""
    index = np.digitize(level, edges) - 1
    centre, median, spread, count = [], [], [], []
    for bin_index in range(edges.size - 1):
        take = index == bin_index
        if take.sum() < min_count:
            continue
        low, high = np.percentile(rate[take], [25, 75])
        centre.append(0.5 * (edges[bin_index] + edges[bin_index + 1]))
        median.append(float(np.median(rate[take])))
        spread.append(float(high - low))
        count.append(int(take.sum()))
    return np.array(centre), np.array(median), np.array(spread), np.array(count)


def _weighted_rms(residual: np.ndarray, weights: np.ndarray) -> float:
    return float(np.sqrt(np.sum(weights * residual**2)))


def fit_all(centre: np.ndarray, median: np.ndarray, count: np.ndarray) -> dict[str, dict]:
    """Fit the three laws to a phase profile and score them by weighted RMS."""
    weights = count / count.sum()
    root = np.sqrt(weights)
    out: dict[str, dict] = {}

    constant = float(np.average(median, weights=weights))
    out["constant"] = {
        "rms": _weighted_rms(median - constant, weights),
        "rate": constant,
        "params": 1,
    }

    design = np.stack([np.ones_like(centre), centre], axis=1)
    solution, *_ = np.linalg.lstsq(design * root[:, None], median * root, rcond=None)
    intercept, gradient = solution
    out["exponential"] = {
        "rms": _weighted_rms(median - design @ solution, weights),
        "v_inf": float(-intercept / gradient) if gradient else np.nan,
        "tau_ms": float(-1000.0 / gradient) if gradient else np.inf,
        "params": 2,
    }

    sign = np.sign(constant) or 1.0
    law = lambda v, v_inf, c: sign * c * np.sqrt(np.maximum(sign * (v_inf - v), 0.0))
    try:
        popt, _ = curve_fit(
            law,
            centre,
            median,
            p0=[centre[-1] + sign * 0.4, 1.0],
            sigma=1.0 / np.sqrt(count),
            bounds=([-2.0, 1e-3], [3.0, 60.0]),
            maxfev=40000,
        )
        out["sqrt"] = {
            "rms": _weighted_rms(median - law(centre, *popt), weights),
            "v_inf": float(popt[0]),
            "C": float(popt[1]),
            "params": 2,
        }
    except (RuntimeError, ValueError):
        out["sqrt"] = {"rms": np.nan, "params": 2}
    return out


def best(fits: dict[str, dict]) -> str:
    scored = {name: fit["rms"] for name, fit in fits.items() if np.isfinite(fit["rms"])}
    return min(scored, key=scored.get) if scored else "none"


def span_ms(fits: dict[str, dict], law: str, start: float, stop: float) -> float:
    """Time the fitted law needs to travel from `start` to `stop`.

    Reported alongside the time constants so the numbers can be set beside
    midi2exp's, which are quoted as a traversal time rather than a tau.
    """
    fit = fits[law]
    if law == "constant":
        return float(1000.0 * (stop - start) / fit["rate"])
    if law == "exponential":
        v_inf, tau = fit["v_inf"], fit["tau_ms"]
        if (v_inf - start) * (v_inf - stop) <= 0:
            return np.inf
        return float(tau * np.log((v_inf - start) / (v_inf - stop)))
    v_inf, c = fit["v_inf"], fit["C"]
    sign = np.sign(stop - start)
    remaining = lambda v: np.sqrt(max(sign * (v_inf - v), 0.0))
    return float(2000.0 * (remaining(start) - remaining(stop)) / c)
