"""Does the blower sag when many notes sound?

One blower feeds the note pneumatics and, through wind chamber 15, the relay that
evacuates the Nuancierbälge. If the supply sags under load there is less vacuum to
close the bellows with, and the prediction is differential: closing should slow
while opening, which runs off atmosphere and the spring, should not care.

    closing   slow crescendo, fast crescendo      rate falls with density
    opening   slow decrescendo, sforzando release rate unchanged

The rate depends on where the bellows already is, and note density is not
independent of that, so every slope here is taken within bands of position: each
sample is compared with the median rate and the median density of its own band,
which is a fixed-effects slope with position as the effect.
"""

from __future__ import annotations

import numpy as np

BAND = 0.05
MIN_PER_BAND = 40
BLOCK_SECONDS = 1.0


def density(onsets: dict[str, np.ndarray], seconds: np.ndarray, half_width: float = 0.25) -> dict[str, np.ndarray]:
    """Note onsets per second, as a boxcar, for each half and for both together."""
    out = {}
    for name, times in onsets.items():
        counts = np.searchsorted(times, seconds + half_width) - np.searchsorted(times, seconds - half_width)
        out[name] = counts / (2 * half_width)
    out["both"] = out["bass"] + out["treble"]
    return out


def _within_band(level: np.ndarray, rate: np.ndarray, load: np.ndarray):
    """Rate and load with each sample's own position band centred away."""
    index = np.digitize(level, np.arange(0.0, 1.0001, BAND)) - 1
    keep = np.zeros(level.size, dtype=bool)
    rate_residual = np.full(level.size, np.nan)
    load_residual = np.full(level.size, np.nan)
    for band in np.unique(index):
        here = index == band
        if here.sum() < MIN_PER_BAND:
            continue
        keep |= here
        rate_residual[here] = rate[here] - np.median(rate[here])
        load_residual[here] = load[here] - np.median(load[here])
    return rate_residual[keep], load_residual[keep], keep


def slope(level: np.ndarray, rate: np.ndarray, load: np.ndarray) -> float:
    rate_residual, load_residual, _ = _within_band(level, rate, load)
    if rate_residual.size < MIN_PER_BAND:
        return np.nan
    denominator = float(np.sum(load_residual**2))
    return float(np.sum(load_residual * rate_residual) / denominator) if denominator else np.nan


def block_bootstrap(level, rate, load, seconds, draws: int = 1000, seed: int = 0):
    """Interval that respects how strongly neighbouring rows agree."""
    if seconds.size < 200:
        return (np.nan, np.nan)
    block = np.floor((seconds - seconds.min()) / BLOCK_SECONDS).astype(int)
    keys = np.unique(block)
    if keys.size < 12:
        return (np.nan, np.nan)
    members = {key: np.flatnonzero(block == key) for key in keys}
    rng = np.random.default_rng(seed)
    values = []
    for _ in range(draws):
        picked = rng.choice(keys, keys.size)
        index = np.concatenate([members[key] for key in picked])
        value = slope(level[index], rate[index], load[index])
        if np.isfinite(value):
            values.append(value)
    if len(values) < draws // 4:
        return (np.nan, np.nan)
    return (float(np.percentile(values, 2.5)), float(np.percentile(values, 97.5)))


def report(level, rate, load, seconds, label: str) -> dict:
    fitted = slope(level, rate, load)
    low, high = block_bootstrap(level, rate, load, seconds)
    median_rate = float(np.median(np.abs(rate)))
    busy = float(np.percentile(load, 95) - np.median(load))
    return {
        "load": label,
        "n": int(level.size),
        "slope_per_note_per_s": fitted,
        "ci95": [low, high],
        "median_abs_rate": median_rate,
        "density_median": float(np.median(load)),
        "density_p95": float(np.percentile(load, 95)),
        "fraction_of_rate_lost_at_p95": float(-fitted * busy / median_rate) if median_rate else np.nan,
    }


def shifted(load: np.ndarray, seconds: np.ndarray, by_seconds: float = 30.0) -> np.ndarray:
    """The load series slid along the roll, keeping its distribution."""
    step = float(np.median(np.diff(seconds)))
    return np.roll(load, int(round(by_seconds / step)))


CLOSING = ("slow_crescendo", "fast_crescendo")


def band_slopes(level, rate, load) -> list[dict]:
    """The slope band by band, so a pooled figure cannot hide a change of sign."""
    index = np.digitize(level, np.arange(0.0, 1.0001, BAND)) - 1
    out = []
    for band in np.unique(index):
        here = index == band
        if here.sum() < MIN_PER_BAND:
            continue
        centred_load = load[here] - np.median(load[here])
        centred_rate = rate[here] - np.median(rate[here])
        denominator = float(np.sum(centred_load**2))
        out.append({
            "level": float(BAND * band + BAND / 2),
            "n": int(here.sum()),
            "slope": float(np.sum(centred_load * centred_rate) / denominator) if denominator else np.nan,
        })
    return out


def independence(seconds: np.ndarray) -> dict:
    """How much of the roll a state actually rests on, in independent terms."""
    return {
        "rows": int(seconds.size),
        "seconds_of_line": float(seconds.size * 0.0017),
        "distinct_seconds": int(np.unique(np.floor(seconds)).size),
        "stretches": int(np.sum(np.diff(np.sort(seconds)) > 0.05) + 1),
    }


def state_report(level, rate, seconds, onsets, half: str, other: str, name: str) -> dict:
    loads = density(onsets, seconds)
    out = {
        "state": name,
        "closing": name in CLOSING,
        "support": independence(seconds),
        "median_abs_rate": float(np.median(np.abs(rate))),
        "band_slopes": band_slopes(level, rate, loads["both"]),
    }
    for key, label in (("both", "both_halves"), (half, "this_half"), (other, "other_half")):
        out[label] = report(level, rate, loads[key], seconds, label)
    out["shifted_30s"] = report(level, rate, shifted(loads["both"], seconds), seconds, "shifted_30s")
    signs = [b["slope"] for b in out["band_slopes"] if np.isfinite(b["slope"])]
    out["bands_positive"] = int(sum(1 for s in signs if s > 0))
    out["bands_total"] = len(signs)
    return out
