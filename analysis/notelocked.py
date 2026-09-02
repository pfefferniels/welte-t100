"""Does the drawn line carry wiggles locked to individual note attacks?

The question is what the line physically records. The Regelbalg senses the
delivered vacuum and acts on the cone valve, not on the Nuancierbalg, so a trace
of bellows travel cannot contain note-locked structure while a trace of delivered
vacuum must. Section 8 asked this with a 500 ms boxcar, which smears exactly the
feature that would decide it; the timescale of a note attack is tens of
milliseconds and the test has to be event-triggered.

Two precautions run through everything here. Notes struck together are one event
weighted by its size, or dense passages would carry the average. And every
statement is made against the same average computed on circularly shifted onsets,
which keeps their rhythm and destroys only their alignment, because that and not
a nominal standard error is the floor a trace of this kind can be read against.
"""

from __future__ import annotations

import numpy as np

import timeline

CHORD_MS = 30.0        # onsets closer than this are one attack
SMOOTH_MS = 150.0      # what counts as the slow part of the line


def chords(onsets: np.ndarray, gap_ms: float = CHORD_MS) -> tuple[np.ndarray, np.ndarray]:
    """Attack times and how many notes fall in each."""
    if onsets.size == 0:
        return np.empty(0), np.empty(0, dtype=int)
    ordered = np.sort(onsets)
    breaks = np.flatnonzero(np.diff(ordered) > gap_ms / 1000.0)
    starts = np.concatenate(([0], breaks + 1))
    stops = np.concatenate((breaks + 1, [ordered.size]))
    return ordered[starts], (stops - starts)


def highpass(curve, smooth_ms: float = SMOOTH_MS) -> np.ndarray:
    """The line minus its own slow part, on witnessed rows.

    A running mean over the finite rows only, so that a punched gap neither
    contributes to the smooth part nor leaves a step behind it.
    """
    value = curve.masked()
    step = float(np.median(np.diff(curve.seconds)))
    width = int(round(smooth_ms / 1000.0 / step)) | 1
    finite = np.isfinite(value)
    filled = np.where(finite, value, 0.0)
    kernel = np.ones(width)
    total = np.convolve(filled, kernel, mode="same")
    count = np.convolve(finite.astype(float), kernel, mode="same")
    smooth = np.where(count > width * 0.5, total / np.maximum(count, 1e-9), np.nan)
    return value - smooth


def triggered(curve, series: np.ndarray, times: np.ndarray, lags_ms: np.ndarray,
              usable: np.ndarray | None = None) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Mean of `series` about each time, with the count and standard error."""
    take = timeline.Sampler(curve.seconds, np.where(usable, series, np.nan) if usable is not None else series)
    traces = np.array([take.at(moment + lags_ms / 1000.0) for moment in times])
    count = np.sum(np.isfinite(traces), axis=0)
    mean = np.nanmean(traces, axis=0)
    sem = np.nanstd(traces, axis=0, ddof=1) / np.sqrt(np.maximum(count, 1))
    return mean, sem, count


def shifted(times: np.ndarray, span: float, by_seconds: float, ) -> np.ndarray:
    return np.sort((times + by_seconds) % span)


def amplitude(mean: np.ndarray, lags_ms: np.ndarray, window=(0.0, 120.0)) -> dict:
    """The largest departure from the pre-onset level inside the window."""
    before = lags_ms < -20.0
    base = float(np.nanmean(mean[before])) if before.any() else 0.0
    inside = (lags_ms >= window[0]) & (lags_ms <= window[1])
    centred = mean - base
    dip_at = int(np.nanargmin(np.where(inside, centred, np.inf)))
    peak_at = int(np.nanargmax(np.where(inside, centred, -np.inf)))
    return {
        "baseline": base,
        "dip": float(centred[dip_at]), "dip_at_ms": float(lags_ms[dip_at]),
        "peak": float(centred[peak_at]), "peak_at_ms": float(lags_ms[peak_at]),
        "extreme": float(centred[dip_at] if abs(centred[dip_at]) > abs(centred[peak_at]) else centred[peak_at]),
    }
