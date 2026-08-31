"""How deep a subito piano goes, and what decides it.

Welte's controls 4c and 4d say a long cancelling perforation returns the bellows
fully and a short one only partly, so on a regulated playback instrument the
depth of the fall should follow the length of the punch that commanded it. The
alternative is that the bellows simply keeps falling until something countermands
it, in which case the depth follows the interval to the next sforzando-on and the
cancelling valve is behaving as a latch.

The turning point is found from the drawn line alone, with no reference to any
punch, because locating it at the next event would build the second hypothesis
into the measurement.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

import latching
import timeline

TURN_RATE = 0.4        # sustained rise that counts as the line having turned
TURN_ROWS = 12
MAX_FALL_MS = 2500.0
ONSET_RATE = 1.5
SEARCH_MS = 300.0
CENSOR = 0.03          # how close to a stop counts as having run out of room


@dataclass(frozen=True)
class Collapse:
    punch: float
    onset: float
    start: float
    bottom: float
    bottom_at: float
    slot_ticks: int
    to_next_on_ms: float
    crescendo: bool
    hook: bool
    censored: bool

    @property
    def depth(self) -> float:
        return self.start - self.bottom

    @property
    def duration_ms(self) -> float:
        return 1000.0 * (self.bottom_at - self.onset)


def _rate(curve, window: int = 3) -> np.ndarray:
    value, seconds = curve.masked(), curve.seconds
    out = np.full(value.shape, np.nan)
    out[window:-window] = (value[2 * window :] - value[: -2 * window]) / (
        seconds[2 * window :] - seconds[: -2 * window]
    )
    return out


def collapses(curve, events, half: str, lead_ms: float, p_rail: float, mf_level: float) -> list[Collapse]:
    value, seconds = curve.masked(), curve.seconds
    speeds = _rate(curve)
    step = float(np.median(np.diff(seconds)))
    engaged = timeline.latch_state(events, half, "mf", seconds + lead_ms / 1000.0)

    ordered = timeline.bellows_events(events, half)
    on_times = np.array([e.sec_on for e in ordered if e.name == "sforz_on"])

    out: list[Collapse] = []
    for event in ordered:
        if event.name != "sforz_off":
            continue
        centre = event.sec_on - lead_ms / 1000.0
        first = int(np.searchsorted(seconds, centre - SEARCH_MS / 1000.0))
        last = int(np.searchsorted(seconds, centre + SEARCH_MS / 1000.0))
        falling = np.flatnonzero(-speeds[first:last] > ONSET_RATE)
        if falling.size == 0:
            continue
        onset = first + int(falling[0])
        if not np.isfinite(value[onset]):
            continue

        # Follow the line until it has clearly turned back up, or time runs out.
        stop = min(onset + int(round(MAX_FALL_MS / 1000.0 / step)), value.size - 1)
        rising = speeds[onset:stop] > TURN_RATE
        sustained = np.convolve(rising.astype(int), np.ones(TURN_ROWS, dtype=int), "valid") == TURN_ROWS
        end = onset + (int(np.argmax(sustained)) if sustained.any() else stop - onset)
        window = value[onset : end + 1]
        if window.size < 6 or np.mean(np.isfinite(window)) < 0.8:
            continue
        bottom_at = onset + int(np.nanargmin(window))
        bottom = float(value[bottom_at])
        start = float(np.nanmax(value[onset : onset + max(int(round(0.010 / step)), 3)]))

        later = on_times[on_times > event.sec_on]
        censored = bottom - p_rail < CENSOR or (engaged[bottom_at] and abs(bottom - mf_level) < CENSOR)
        out.append(Collapse(
            punch=event.sec_on,
            onset=float(seconds[onset]),
            start=start,
            bottom=bottom,
            bottom_at=float(seconds[bottom_at]),
            slot_ticks=latching.slot_length(events, half, event),
            to_next_on_ms=float(1000.0 * (later[0] - event.sec_on)) if later.size else np.inf,
            crescendo=bool(timeline.latch_state(events, half, "cresc", np.array([event.sec_on - 1e-4]))[0]),
            hook=bool(engaged[bottom_at]),
            censored=bool(censored),
        ))
    return out


def partial(x: np.ndarray, y: np.ndarray, control: np.ndarray) -> float:
    """Correlation of x and y with `control` regressed out of both."""
    residual = lambda a: a - np.polyval(np.polyfit(control, a, 1), control)
    return float(np.corrcoef(residual(x), residual(y))[0, 1])


def bootstrap_r(x: np.ndarray, y: np.ndarray, draws: int = 4000, seed: int = 0):
    rng = np.random.default_rng(seed)
    values = [np.corrcoef(x[pick], y[pick])[0, 1] for pick in rng.integers(0, x.size, (draws, x.size))]
    return float(np.percentile(values, 2.5)), float(np.percentile(values, 97.5))
