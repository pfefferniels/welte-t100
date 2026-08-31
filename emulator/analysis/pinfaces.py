"""Does the Mezzoforte pin show two faces, or only the one the line lands on?

A pin with extent along the bellows' travel arrests a board descending onto it at
its upper face and a board rising onto it at its lower face, and the band between
the two cannot be occupied while the pin is down. If both faces appear in the
drawn line, the gap between them measures the pin. If only one appears, the level
that has been measured is that face and the pin's centre lies somewhere below it,
unmeasurable from this roll.

Every plateau inside a Mezzoforte hold is therefore classified by the direction
the line was travelling as it settled.
"""

from __future__ import annotations

import numpy as np

import timeline

FLAT_RATE = 0.10       # scale units per second
MIN_PLATEAU_ROWS = 25
APPROACH_MS = 100.0
APPROACH_MIN = 0.010   # travel over the approach window that counts as a direction


def _rate(curve, window: int = 15) -> np.ndarray:
    value, seconds = curve.masked(), curve.seconds
    out = np.full(value.shape, np.nan)
    out[window:-window] = (value[2 * window :] - value[: -2 * window]) / (
        seconds[2 * window :] - seconds[: -2 * window]
    )
    return out


def plateaus(curve, events, half: str, lead_ms: float, low: float, high: float) -> list[dict]:
    """Every settled stretch inside a hook hold, with how the line got there."""
    value, seconds = curve.masked(), curve.seconds
    engaged = timeline.latch_state(events, half, "mf", seconds + lead_ms / 1000.0)
    witnessed = curve.observed
    rate = _rate(curve)

    flat = engaged & witnessed & np.isfinite(value) & np.isfinite(rate)
    flat &= np.abs(rate) < FLAT_RATE
    flat &= (value > low) & (value < high)

    edges = np.flatnonzero(np.diff(np.concatenate(([0], flat.view(np.int8), [0]))))
    out = []
    for start, stop in zip(edges[::2], edges[1::2]):
        if stop - start < MIN_PLATEAU_ROWS:
            continue
        before = seconds[start] - APPROACH_MS / 1000.0
        index = int(np.searchsorted(seconds, before))
        if index <= 0 or not engaged[index]:
            continue
        approach = value[start] - value[index]
        if not np.isfinite(approach):
            continue
        clear = bool(witnessed[index : start + 1].all())
        if approach <= -APPROACH_MIN:
            arrival = "from above"
        elif approach >= APPROACH_MIN:
            arrival = "from below"
        else:
            arrival = "ambiguous"
        out.append({
            "row": int(curve.y_px[start]),
            "seconds": float(seconds[start]),
            "rows": int(stop - start),
            "level": float(np.nanmedian(value[start:stop])),
            "arrival": arrival,
            "approach_travel": float(approach),
            "approach_witnessed": clear,
        })
    return out


def summarise(found: list[dict]) -> dict:
    out = {}
    for arrival in ("from above", "from below", "ambiguous"):
        levels = np.array([p["level"] for p in found if p["arrival"] == arrival])
        rows = int(sum(p["rows"] for p in found if p["arrival"] == arrival))
        if levels.size == 0:
            out[arrival] = {"n": 0, "rows": 0}
            continue
        out[arrival] = {
            "n": int(levels.size),
            "rows": rows,
            "level_median": float(np.median(levels)),
            "level_sd": float(np.std(levels)),
            "level_min": float(levels.min()),
            "level_max": float(levels.max()),
        }
    return out


def drift(curve, events, half: str, lead_ms: float, stop: float, p_rail: float, f_rail: float) -> dict:
    """What moves the stop level between one Mezzoforte hold and the next.

    Three candidates: the tracer's calibration, the speed at which the line
    arrives, and nothing but hold-to-hold variation. The fortissimo stop of the
    same hold serves as a reference that no hook can move, so anything the two
    stops do together belongs to the trace rather than to the mechanism.
    """
    value, seconds = curve.masked(), curve.seconds
    engaged = timeline.latch_state(events, half, "mf", seconds + lead_ms / 1000.0)
    edges = np.flatnonzero(np.diff(np.concatenate(([0], engaged.view(np.int8), [0]))))
    holds = [(int(curve.y_px[a]), int(curve.y_px[b - 1])) for a, b in zip(edges[::2], edges[1::2])]
    settled = [p for p in plateaus(curve, events, half, lead_ms, stop - 0.12, stop + 0.12)
               if p["arrival"] == "from above"]

    step = 3
    quick = np.full(value.shape, np.nan)
    quick[step:-step] = (value[2 * step :] - value[: -2 * step]) / (seconds[2 * step :] - seconds[: -2 * step])

    levels, speeds, groups = [], [], []
    for plateau in settled:
        index = int(np.searchsorted(curve.y_px, plateau["row"]))
        start = int(np.searchsorted(seconds, seconds[index] - 0.200))
        impact = np.nanmax(np.abs(quick[start : index + 1])) if index > start else np.nan
        if not np.isfinite(impact):
            continue
        levels.append(plateau["level"])
        speeds.append(float(impact))
        groups.append(next((k for k, (low, high) in enumerate(holds) if low <= plateau["row"] <= high), -1))
    levels, speeds, groups = np.array(levels), np.array(speeds), np.array(groups)

    # Within-hold, so that a hold's own level cannot masquerade as a speed effect.
    centred_level, centred_speed = levels.copy(), speeds.copy()
    for group in np.unique(groups):
        here = groups == group
        if here.sum() < 4:
            centred_level[here] = np.nan
            continue
        centred_level[here] -= centred_level[here].mean()
        centred_speed[here] -= centred_speed[here].mean()
    usable = np.isfinite(centred_level)

    hook, forte = [], []
    for low, high in holds:
        first, last = np.searchsorted(curve.y_px, low), np.searchsorted(curve.y_px, high)
        window = value[first:last]
        at_forte = window[np.isfinite(window) & (np.abs(window - f_rail) < 0.02)]
        inside = [p["level"] for p in settled if low <= p["row"] <= high]
        if inside and at_forte.size >= 200:
            hook.append(float(np.median(inside)))
            forte.append(float(np.median(at_forte)))
    hook, forte = np.array(hook), np.array(forte)
    referred = hook - forte
    fraction = (hook - p_rail) / (forte - p_rail)

    return {
        "plateaus": int(levels.size),
        "impact_speed_per_s": {"min": float(speeds.min()), "median": float(np.median(speeds)), "max": float(speeds.max())},
        "speed_vs_level_pooled_r": float(np.corrcoef(speeds, levels)[0, 1]),
        "speed_vs_level_within_hold_r": float(np.corrcoef(centred_speed[usable], centred_level[usable])[0, 1]),
        "speed_vs_level_slope": float(np.polyfit(centred_speed[usable], centred_level[usable], 1)[0]),
        "holds_compared": int(hook.size),
        "hook_level_sd": float(hook.std()),
        "forte_level_sd": float(forte.std()),
        "hook_vs_forte_r": float(np.corrcoef(hook, forte)[0, 1]),
        "referred_to_forte": {"median": float(np.median(referred)), "sd": float(referred.std()), "spread": float(referred.max() - referred.min())},
        "fraction_of_travel": {"median": float(np.median(fraction)), "sd": float(fraction.std())},
    }
