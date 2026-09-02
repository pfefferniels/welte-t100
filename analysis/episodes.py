"""Single excursions of the drawn line, cut out around one latch transition.

An episode starts where the line itself begins to move, which keeps the fits
independent of the lead between line and punch, and it stops at whichever comes
first: the next punch, a reversal, or a rail.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.optimize import curve_fit

import timeline


@dataclass(frozen=True)
class Episode:
    half: str
    trigger: str
    trigger_time: float
    onset_time: float
    t: np.ndarray
    v: np.ndarray
    hit_rail: bool

    @property
    def travel(self) -> float:
        return float(self.v[-1] - self.v[0])

    @property
    def duration_ms(self) -> float:
        return float(1000.0 * (self.t[-1] - self.t[0]))

    @property
    def lead_ms(self) -> float:
        """Positive when the line moves before the punch arrives."""
        return float(1000.0 * (self.trigger_time - self.onset_time))


def _monotone_end(v: np.ndarray, sign: int, slack: float) -> int:
    """First index where the excursion has turned back by more than `slack`."""
    extreme = v[0]
    for index in range(1, v.size):
        extreme = max(extreme, v[index]) if sign > 0 else min(extreme, v[index])
        if sign * (extreme - v[index]) > slack:
            return index
    return v.size


def _stall_end(rate: np.ndarray, floor: float, run: int) -> int:
    """Index where the excursion stops making progress for `run` samples."""
    stalled = ~(rate > floor)
    if stalled.size < run:
        return rate.size
    held = np.convolve(stalled.astype(int), np.ones(run, dtype=int), mode="valid") == run
    return int(np.argmax(held)) if held.any() else rate.size


def extract(
    curve,
    events,
    half: str,
    trigger: str,
    sign: int,
    rails: tuple[float, float],
    mf_level: float,
    lead_ms: float,
    require=None,
    search_ms: float = 300.0,
    max_ms: float = 2500.0,
    onset_rate: float = 0.6,
    min_run: int = 6,
    slack: float = 0.02,
    rail_margin: float = 0.03,
) -> list[Episode]:
    """Excursions after each `trigger`, cut at the first stop they run into.

    `require(cresc, sforz, mf)` filters on the latch state immediately before
    the trigger fires; the Mezzoforte level counts as a stop for downward travel
    while the hook is engaged.
    """
    seconds, value = curve.seconds, curve.masked()
    step = float(np.median(np.diff(seconds)))
    window = max(3, int(round(0.010 / step)))
    rate = np.full(value.shape, np.nan)
    rate[window:-window] = (value[2 * window :] - value[: -2 * window]) / (
        seconds[2 * window :] - seconds[: -2 * window]
    )

    low, high = rails
    out: list[Episode] = []
    ordered = timeline.bellows_events(events, half)
    marks = np.array([e.sec_on for e in ordered])
    for index, event in enumerate(ordered):
        if event.name != trigger:
            continue
        probe = np.array([event.sec_on - 1e-4])
        cresc = bool(timeline.latch_state(events, half, "cresc", probe)[0])
        sforz = bool(timeline.latch_state(events, half, "sforz", probe)[0])
        mf = bool(timeline.latch_state(events, half, "mf", probe)[0])
        if require is not None and not require(cresc, sforz, mf):
            continue

        earliest = event.sec_on - (lead_ms + search_ms) / 1000.0
        if index > 0:
            earliest = max(earliest, marks[index - 1] - lead_ms / 1000.0 + 0.02)
        start = np.searchsorted(seconds, earliest)
        stop = np.searchsorted(seconds, event.sec_on + search_ms / 1000.0)
        moving = sign * rate[start:stop] > onset_rate
        run = min_run if moving.size >= min_run else 1
        sustained = np.convolve(moving.astype(int), np.ones(run, dtype=int), mode="valid") == run
        if not sustained.any():
            continue
        onset = start + int(np.argmax(sustained))

        horizon = marks[index + 1] - lead_ms / 1000.0 if index + 1 < marks.size else np.inf
        limit = min(seconds[onset] + max_ms / 1000.0, horizon)
        end = int(np.searchsorted(seconds, limit))
        v = value[onset:end]
        if v.size < 8 or not np.isfinite(v[0]):
            continue
        v = v[: _monotone_end(v, sign, slack)]
        v = v[: _stall_end(sign * rate[onset : onset + v.size], onset_rate / 3.0, run)]
        if v.size < 8:
            continue

        rail = high - rail_margin if sign > 0 else low + rail_margin
        if sign < 0 and mf:
            rail = max(rail, mf_level + rail_margin)
        beyond = np.flatnonzero(sign * (v - rail) > 0)
        hit_rail = beyond.size > 0
        if hit_rail:
            v = v[: int(beyond[0]) + 1]
        if v.size < 8 or np.mean(np.isfinite(v)) < 0.85:
            continue
        t = seconds[onset : onset + v.size] - seconds[onset]
        good = np.isfinite(v)
        out.append(
            Episode(
                half=half,
                trigger=trigger,
                trigger_time=event.sec_on,
                onset_time=float(seconds[onset]),
                t=t[good],
                v=v[good],
                hit_rail=hit_rail,
            )
        )
    return out


def _rms(residual: np.ndarray) -> float:
    return float(np.sqrt(np.mean(residual**2)))


def fit_linear(t: np.ndarray, v: np.ndarray) -> dict:
    slope, intercept = np.polyfit(t, v, 1)
    return {"model": "linear", "rate": float(slope), "v0": float(intercept), "rms": _rms(v - (slope * t + intercept))}


def fit_exponential(t: np.ndarray, v: np.ndarray, sign: int) -> dict:
    span = v[-1] - v[0]
    guess = (v[0] + 2.0 * span, v[0], max(t[-1], 1e-3))
    bounds = ([-2.0, -1.0, 1e-4], [3.0, 2.0, 30.0]) if sign > 0 else ([-2.0, -1.0, 1e-4], [3.0, 2.0, 30.0])
    model = lambda x, v_inf, v_zero, tau: v_inf + (v_zero - v_inf) * np.exp(-x / tau)
    try:
        popt, pcov = curve_fit(model, t, v, p0=guess, bounds=bounds, maxfev=20000)
    except (RuntimeError, ValueError):
        return {"model": "exponential", "rms": np.nan, "tau_ms": np.nan, "v_inf": np.nan, "v0": np.nan}
    errors = np.sqrt(np.diag(pcov)) if np.all(np.isfinite(pcov)) else np.full(3, np.nan)
    return {
        "model": "exponential",
        "v_inf": float(popt[0]),
        "v0": float(popt[1]),
        "tau_ms": float(1000.0 * popt[2]),
        "tau_se_ms": float(1000.0 * errors[2]),
        "v_inf_se": float(errors[0]),
        "rms": _rms(v - model(t, *popt)),
    }


def fit_sqrt_flow(t: np.ndarray, v: np.ndarray, sign: int) -> dict:
    """dv/dt = c*sqrt(|v_inf - v|), the orifice-limited alternative.

    Integrating gives a parabola that reaches the asymptote in finite time, so
    the model is evaluated with the post-arrival branch clamped.
    """

    def model(x, v_inf, v_zero, c):
        root = np.sqrt(np.maximum(sign * (v_inf - v_zero), 0.0))
        remaining = np.maximum(root - 0.5 * c * x, 0.0)
        return v_inf - sign * remaining**2

    span = v[-1] - v[0]
    guess = (v[0] + 2.0 * span, v[0], 1.0)
    try:
        popt, pcov = curve_fit(model, t, v, p0=guess, bounds=([-2.0, -1.0, 1e-3], [3.0, 2.0, 200.0]), maxfev=20000)
    except (RuntimeError, ValueError):
        return {"model": "sqrt", "rms": np.nan}
    return {
        "model": "sqrt",
        "v_inf": float(popt[0]),
        "v0": float(popt[1]),
        "c": float(popt[2]),
        "rms": _rms(v - model(t, *popt)),
    }


def compare(t: np.ndarray, v: np.ndarray, sign: int) -> dict[str, dict]:
    return {
        "linear": fit_linear(t, v),
        "exponential": fit_exponential(t, v, sign),
        "sqrt": fit_sqrt_flow(t, v, sign),
    }
