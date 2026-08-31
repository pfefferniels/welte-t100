"""What the drawn line does at the moment it reaches a stop.

A rigid stop takes the line's momentum away instantly and the line simply stays
there. A compliant one lets it past, and the line springs back: an overshoot,
then a return, with an amplitude that should grow with how hard the stop was
struck and a period set by the mass and the stiffness, not by the arrival.

The three stops are treated identically so that they can be compared: the two
rails and the Mezzoforte hook. If the rails ring at the hook's amplitude and
period they are the same compliance and can share its constants.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

import timeline

APPROACH_MS = 100.0    # window whose peak speed counts as the arrival speed
SETTLE_FROM = 150.0    # where the resting level is read, ms after arrival
SETTLE_TO = 300.0
NEAR = 0.01            # how close to the stop counts as having reached it
STAY = 0.025           # and how close it must remain to count as having come to rest


@dataclass(frozen=True)
class Arrival:
    time: float
    speed: float
    rest: float
    trace: np.ndarray


def rate(curve, window: int = 3) -> np.ndarray:
    value, seconds = curve.masked(), curve.seconds
    out = np.full(value.shape, np.nan)
    out[window:-window] = (value[2 * window :] - value[: -2 * window]) / (
        seconds[2 * window :] - seconds[: -2 * window]
    )
    return out


def arrivals(curve, level: float, sign: int, lags_ms: np.ndarray, min_speed: float = 5.0,
             engaged: np.ndarray | None = None, quiet_ms: float = 400.0) -> tuple[list[Arrival], dict]:
    """Every fast approach that comes to rest at `level`, with the window witnessed throughout.

    `sign` is the direction of travel: +1 arriving from below, -1 from above.
    An overshoot is then movement past `level` in that same direction.
    """
    value, seconds = curve.masked(), curve.seconds
    speeds = rate(curve)
    witnessed = curve.observed
    step = float(np.median(np.diff(seconds)))
    span = int(round((lags_ms[-1] - lags_ms[0]) / 1000.0 / step))

    close = np.isfinite(value) & (np.abs(value - level) < NEAR)
    reached = close & ~np.concatenate(([False], close[:-1]))
    fast = np.isfinite(speeds) & (sign * speeds > min_speed)
    approach = int(round(APPROACH_MS / 1000.0 / step))

    found, rejected = [], {"not_fast": 0, "unwitnessed": 0, "not_settled": 0, "hook_released": 0}
    last = -np.inf
    for index in np.flatnonzero(reached):
        moment = seconds[index]
        if moment - last < quiet_ms / 1000.0:
            continue
        if not fast[max(index - approach, 0) : index].any():
            rejected["not_fast"] += 1
            continue
        if engaged is not None and not engaged[index]:
            rejected["hook_released"] += 1
            continue
        first = index + int(round(lags_ms[0] / 1000.0 / step))
        if first < 0 or first + span >= value.size:
            continue
        if not witnessed[first : first + span + 1].all():
            rejected["unwitnessed"] += 1
            continue
        settled = value[
            index + int(round(SETTLE_FROM / 1000.0 / step)) : index + int(round(SETTLE_TO / 1000.0 / step))
        ]
        # The line has to still be there at the end of the window, or it never
        # came to rest and what looks like a rebound is only its departure.
        if settled.size < 5 or not np.isfinite(settled).all() or np.abs(settled - level).max() > STAY:
            rejected["not_settled"] += 1
            continue
        take = timeline.Sampler(seconds, value)
        found.append(Arrival(
            time=float(moment),
            speed=float(np.nanmax(sign * speeds[max(index - approach, 0) : index + 1])),
            rest=float(np.median(settled)),
            trace=take.at(moment + lags_ms / 1000.0),
        ))
        last = moment
    return found, rejected


def average(found: list[Arrival], lags_ms: np.ndarray, sign: int) -> dict:
    """Mean trajectory about the resting level, and the ring it does or does not show."""
    if len(found) < 5:
        return {"n": len(found), "note": "too few arrivals"}
    traces = np.array([a.trace - a.rest for a in found])
    mean = np.nanmean(traces, axis=0)
    count = np.sum(np.isfinite(traces), axis=0)
    sem = np.nanstd(traces, axis=0, ddof=1) / np.sqrt(np.maximum(count, 1))

    after = lags_ms >= 0
    excursion = sign * mean
    peak_at = int(np.nanargmax(np.where(after, excursion, -np.inf)))
    overshoot = float(excursion[peak_at])
    # The return: the first extremum the other way after the overshoot.
    beyond = lags_ms > lags_ms[peak_at]
    trough_at = int(np.nanargmin(np.where(beyond, excursion, np.inf))) if beyond.any() else peak_at
    half_period = float(lags_ms[trough_at] - lags_ms[peak_at])
    return {
        "n": len(found),
        "overshoot": overshoot,
        "overshoot_sem": float(sem[peak_at]),
        "overshoot_at_ms": float(lags_ms[peak_at]),
        "return_at_ms": float(lags_ms[trough_at]),
        "half_period_ms": half_period,
        "period_ms": 2.0 * half_period,
        "undershoot_on_return": float(-excursion[trough_at]),
        "arrival_speed_median": float(np.median([a.speed for a in found])),
        "rest_level_median": float(np.median([a.rest for a in found])),
        "mean": mean.tolist(),
        "sem": sem.tolist(),
        "lags_ms": lags_ms.tolist(),
    }


def speed_regression(found: list[Arrival], lags_ms: np.ndarray, sign: int) -> dict:
    """Per-arrival overshoot against how hard the stop was struck."""
    after = lags_ms >= 0
    window = after & (lags_ms <= 120.0)
    amplitude, speed = [], []
    for arrival in found:
        excursion = sign * (arrival.trace - arrival.rest)
        piece = excursion[window]
        if not np.any(np.isfinite(piece)):
            continue
        amplitude.append(float(np.nanmax(piece)))
        speed.append(arrival.speed)
    amplitude, speed = np.array(amplitude), np.array(speed)
    if amplitude.size < 8:
        return {"n": int(amplitude.size), "note": "too few"}
    slope, intercept = np.polyfit(speed, amplitude, 1)
    rng = np.random.default_rng(0)
    draws = [
        np.polyfit(speed[pick], amplitude[pick], 1)[0]
        for pick in rng.integers(0, amplitude.size, (2000, amplitude.size))
    ]
    return {
        "n": int(amplitude.size),
        "r": float(np.corrcoef(speed, amplitude)[0, 1]),
        "slope_per_unit_per_s": float(slope),
        "slope_ci95": [float(np.percentile(draws, 2.5)), float(np.percentile(draws, 97.5))],
        "intercept": float(intercept),
        "speed_range": [float(speed.min()), float(speed.max())],
    }
