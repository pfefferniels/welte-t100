"""Where each punch sits relative to the line feature it names, control by control.

Section 7 measured this for the sforzando-off collapse, which is the sharpest
feature on the roll. The other controls move the line more gently, so a
definition tied to a fixed rate threshold would place them differently for
reasons of sharpness alone. What is used here instead is the half-maximum
onset: find the extremum of the rate near the punch, then walk back to where
the rate last stood at half of it. That is the same definition of "the feature
began" whatever the feature's amplitude, which is what makes the controls
comparable.
"""

from __future__ import annotations

import numpy as np

HOLE_SEPARATION = 37.7561
FIRST_KEY = 14
COLUMN_ORIGIN = {"bass": 153.0, "treble": 151.5}   # fitted in roworigin.py

SIGN = {"sforz_on": +1, "sforz_off": -1, "cresc_on": +1, "cresc_off": -1, "mf_on": -1, "mf_off": -1}
CODE = {
    "bass": {"mf_off": 14, "mf_on": 15, "cresc_off": 16, "cresc_on": 17, "sforz_off": 18, "sforz_on": 19},
    "treble": {"sforz_on": 108, "sforz_off": 109, "cresc_on": 110, "cresc_off": 111, "mf_on": 112, "mf_off": 113},
}


def tracker_column(half: str, name: str) -> float:
    return COLUMN_ORIGIN[half] + (CODE[half][name] - FIRST_KEY) * HOLE_SEPARATION


def rate(curve, window: int) -> np.ndarray:
    value, seconds = curve.masked(), curve.seconds
    out = np.full(value.shape, np.nan)
    out[window:-window] = (value[2 * window :] - value[: -2 * window]) / (
        seconds[2 * window :] - seconds[: -2 * window]
    )
    return out


def half_max_onset(curve, at: float, sign: int, window: int, search_ms: float = 250.0,
                   min_peak: float = 0.5) -> tuple[float, float, float] | None:
    """Time the feature began, its peak rate, and the level it began from.

    Returns None where no extremum of the right sign clears `min_peak`, which is
    how an event whose feature cannot be located declines to contribute.
    """
    seconds = curve.seconds
    speeds = rate(curve, window)
    value = curve.masked()
    first = int(np.searchsorted(seconds, at - search_ms / 1000.0))
    last = int(np.searchsorted(seconds, at + search_ms / 1000.0))
    if last - first < 8:
        return None
    piece = sign * speeds[first:last]
    if not np.any(np.isfinite(piece)):
        return None
    peak_at = int(np.nanargmax(piece))
    peak = float(piece[peak_at])
    if not np.isfinite(peak) or peak < min_peak:
        return None
    threshold = peak / 2.0
    index = peak_at
    while index > 0 and (not np.isfinite(piece[index - 1]) or piece[index - 1] > threshold):
        index -= 1
    if index == 0:
        return None
    return float(seconds[first + index]), peak, float(value[first + index])


def per_event(curve, events, half: str, name: str, window: int, **kwargs) -> dict:
    """Signed offset per event, in seconds: punch time minus feature time."""
    found = []
    for event in events:
        if event.half != half or event.name != name:
            continue
        located = half_max_onset(curve, event.sec_on, SIGN[name], window, **kwargs)
        if located is None:
            continue
        onset, peak, level = located
        found.append({
            "punch": event.sec_on,
            "onset": onset,
            "offset_ms": 1000.0 * (event.sec_on - onset),
            "peak_rate": peak,
            "level": level,
        })
    return {"name": name, "column": tracker_column(half, name), "events": found}


def summarise(entry: dict, bootstrap, window_ms: float = 300.0) -> dict:
    offsets = np.array([e["offset_ms"] for e in entry["events"]])
    kept = offsets[np.abs(offsets) < window_ms]
    if kept.size < 5:
        return {"name": entry["name"], "n": int(kept.size), "note": "too few locatable events"}
    low, high = bootstrap(kept)
    return {
        "name": entry["name"],
        "column_px": entry["column"],
        "n": int(kept.size),
        "n_located": len(entry["events"]),
        "median_ms": float(np.median(kept)),
        "ci95_ms": [low, high],
        "iqr_ms": float(np.percentile(kept, 75) - np.percentile(kept, 25)),
        "sd_ms": float(np.std(kept)),
        "median_peak_rate": float(np.median([e["peak_rate"] for e in entry["events"]])),
    }
