"""How far the drawn line runs ahead of, or behind, the punched code.

Two independent estimates: a global scan of the offset that best lines the
curve's slope up with the latched state, and the offset between a code's
leading edge and the nearest sharp turn of the drawn line.
"""

from __future__ import annotations

import numpy as np

import timeline


def slope(curve, window: int = 6) -> tuple[np.ndarray, np.ndarray]:
    """Central difference over `window` scan rows, about 10 ms."""
    value, seconds = curve.masked(), curve.seconds
    rate = (value[window:] - value[:-window]) / (seconds[window:] - seconds[:-window])
    times = 0.5 * (seconds[window:] + seconds[:-window])
    return times, rate


def state_slope_contrast(curve, events, half: str, offsets_ms: np.ndarray) -> dict[str, np.ndarray]:
    """Difference in mean slope between latch on and off, per candidate offset.

    A positive offset means the punch comes first and the line follows.
    """
    times, rate = slope(curve)
    finite = np.isfinite(rate)
    times, rate = times[finite], rate[finite]
    out = {}
    for latch in ("cresc", "sforz"):
        contrast = []
        for offset in offsets_ms:
            state = timeline.latch_state(events, half, latch, times - offset / 1000.0)
            contrast.append(float(np.mean(rate[state]) - np.mean(rate[~state])))
        out[latch] = np.array(contrast)
    return out


def peak_offset(offsets_ms: np.ndarray, contrast: np.ndarray) -> float:
    """Sub-step peak by a parabola through the best point and its neighbours."""
    best = int(np.argmax(contrast))
    if 0 < best < contrast.size - 1:
        y0, y1, y2 = contrast[best - 1 : best + 2]
        denominator = y0 - 2 * y1 + y2
        if denominator != 0:
            step = offsets_ms[1] - offsets_ms[0]
            return float(offsets_ms[best] - 0.5 * step * (y2 - y0) / denominator)
    return float(offsets_ms[best])


def turning_points(curve, threshold: float, sign: int, separation_ms: float = 100.0) -> np.ndarray:
    """Onsets of runs where the slope passes `threshold` in the given direction."""
    times, rate = slope(curve)
    strong = np.isfinite(rate) & (sign * rate > threshold)
    starts = np.flatnonzero(strong & ~np.concatenate(([False], strong[:-1])))
    onsets = times[starts]
    keep = np.concatenate(([True], np.diff(onsets) > separation_ms / 1000.0))
    return onsets[keep]


def nearest_offsets(marks: np.ndarray, punches: np.ndarray, window_ms: float = 400.0) -> np.ndarray:
    """Signed mark-minus-punch offsets, in ms, for the nearest punch to each mark."""
    if punches.size == 0 or marks.size == 0:
        return np.empty(0)
    index = np.searchsorted(punches, marks)
    low = punches[np.clip(index - 1, 0, punches.size - 1)]
    high = punches[np.clip(index, 0, punches.size - 1)]
    below, above = marks - low, marks - high
    offset = np.where(np.abs(below) <= np.abs(above), below, above) * 1000.0
    return offset[np.abs(offset) < window_ms]


def bootstrap_median(sample: np.ndarray, draws: int = 2000, seed: int = 0) -> tuple[float, float]:
    if sample.size < 3:
        return (np.nan, np.nan)
    rng = np.random.default_rng(seed)
    medians = np.median(rng.choice(sample, size=(draws, sample.size)), axis=1)
    return float(np.percentile(medians, 2.5)), float(np.percentile(medians, 97.5))
