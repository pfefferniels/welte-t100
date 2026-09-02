"""How well the trace follows the steepest edges, and what it costs to ask it to follow harder.

The tracer charges `step_penalty` per pixel of lateral movement, once per row.
That cost is linear in the distance moved, so for a monotone traverse the total
is the same however the movement is spread over rows: a penalty of this form
cannot flatten a ramp. What it does penalise is going out and coming back, so
the place to look for clipping is the tip of a spike rather than its flanks.

This module compares the accepted trace against re-traces of the same rows at
lower penalties, which is the only way to separate "the line really does that"
from "the path was too dear to follow".
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

import dataset

RETRACE = dataset.ROOT / "emulator" / "data" / "retrace"
EDGE_MARGIN = 300      # rows dropped at each end, where the chunk boundary differs
STEEP = 8.0            # scale units per second


def load(path: Path) -> pd.DataFrame:
    return pd.read_csv(path / dataset.DRUID / "curves.csv")


def accepted() -> pd.DataFrame:
    return pd.read_csv(dataset.ROOT / "out" / dataset.DRUID / "curves.csv")


def rate(frame: pd.DataFrame, half: str, window: int = 3) -> np.ndarray:
    value = frame[f"{half}_value"].to_numpy().astype(float)
    seconds = frame["seconds"].to_numpy()
    out = np.full(value.shape, np.nan)
    out[window:-window] = (value[2 * window :] - value[: -2 * window]) / (
        seconds[2 * window :] - seconds[: -2 * window]
    )
    return out


def observed(frame: pd.DataFrame, half: str) -> np.ndarray:
    return np.isin(frame[f"{half}_flag"].to_numpy(), dataset.OBSERVED)


def compare(reference: pd.DataFrame, other: pd.DataFrame, half: str) -> dict:
    """Disagreement between two traces of the same rows, overall and at the steep edges."""
    rows = np.intersect1d(reference["y_px"], other["y_px"])
    rows = rows[(rows >= rows.min() + EDGE_MARGIN) & (rows <= rows.max() - EDGE_MARGIN)]
    left = reference.set_index("y_px").loc[rows]
    right = other.set_index("y_px").loc[rows]

    seen = np.isin(left[f"{half}_flag"], dataset.OBSERVED) & np.isin(right[f"{half}_flag"], dataset.OBSERVED)
    gap_value = np.abs(left[f"{half}_value"].to_numpy() - right[f"{half}_value"].to_numpy())
    gap_px = np.abs(left[f"{half}_x"].to_numpy() - right[f"{half}_x"].to_numpy())

    reference_rate = rate(reference, half)[np.isin(reference["y_px"], rows)]
    steep = seen & (np.abs(reference_rate) > STEEP)
    return {
        "rows": int(rows.size),
        "steep_rows": int(steep.sum()),
        "all": {
            "median_value": float(np.median(gap_value[seen])),
            "p95_value": float(np.percentile(gap_value[seen], 95)),
            "median_px": float(np.median(gap_px[seen])),
        },
        "steep": {
            "median_value": float(np.median(gap_value[steep])) if steep.any() else np.nan,
            "p95_value": float(np.percentile(gap_value[steep], 95)) if steep.any() else np.nan,
            "max_value": float(np.max(gap_value[steep])) if steep.any() else np.nan,
            "median_px": float(np.median(gap_px[steep])) if steep.any() else np.nan,
        },
    }


def extremes(frame: pd.DataFrame, half: str) -> dict:
    """How steep and how jumpy a trace is, which is what a lower penalty buys and costs."""
    seen = observed(frame, half)
    speeds = np.abs(rate(frame, half))
    x = frame[f"{half}_x"].to_numpy()
    both = seen[:-1] & seen[1:]
    step = np.abs(np.diff(x))[both]
    usable = seen & np.isfinite(speeds)
    return {
        "max_rate": float(np.nanmax(speeds[usable])),
        "p999_rate": float(np.percentile(speeds[usable], 99.9)),
        "max_step_px": float(step.max()),
        "median_step_px": float(np.median(step)),
        "p999_step_px": float(np.percentile(step, 99.9)),
        "reversals_per_1000_rows": float(1000.0 * np.mean(np.diff(np.sign(np.diff(x[seen]))) != 0)),
    }


def windows() -> list[tuple[int, list[float]]]:
    found: dict[int, list[float]] = {}
    for path in sorted(RETRACE.glob("w*_p*")):
        start, penalty = path.name[1:].split("_p")
        found.setdefault(int(start), []).append(float(penalty))
    return [(start, sorted(penalties)) for start, penalties in sorted(found.items())]
