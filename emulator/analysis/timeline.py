"""Latched expression state, event-aligned sampling of the drawn curve.

Every expression perforation on this roll is short (median 40-70 ticks), so all
six functions are read as latching triggers: the state changes at the leading
edge of the hole and holds until the opposing hole arrives.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

BELLOWS_NAMES = ("mf_on", "mf_off", "cresc_on", "cresc_off", "sforz_on", "sforz_off")
LATCHES = {"mf": ("mf_on", "mf_off"), "cresc": ("cresc_on", "cresc_off"), "sforz": ("sforz_on", "sforz_off")}


@dataclass(frozen=True)
class Sampler:
    """Nearest-sample lookup into one half's drawn curve.

    Nearest sample rather than interpolation, so that the interpolated-row mask
    survives the lookup instead of being smeared across neighbours.
    """

    seconds: np.ndarray
    value: np.ndarray

    def at(self, times: np.ndarray) -> np.ndarray:
        index = np.searchsorted(self.seconds, times)
        index = np.clip(index, 1, self.seconds.size - 1)
        left = np.abs(times - self.seconds[index - 1]) <= np.abs(self.seconds[index] - times)
        index = np.where(left, index - 1, index)
        out = self.value[index]
        inside = (times >= self.seconds[0]) & (times <= self.seconds[-1])
        return np.where(inside, out, np.nan)


def sampler(curve) -> Sampler:
    return Sampler(seconds=curve.seconds, value=curve.masked())


def bellows_events(events, half: str) -> list:
    """Events that move this half's nuance bellows, in time order."""
    return sorted(
        (e for e in events if e.half == half and e.name in BELLOWS_NAMES),
        key=lambda e: e.sec_on,
    )


def latch_state(events, half: str, latch: str, times: np.ndarray, initial: bool = False) -> np.ndarray:
    """Boolean state of one latch, sampled at `times`."""
    on_name, off_name = LATCHES[latch]
    switches = sorted(
        ((e.sec_on, e.name == on_name) for e in events if e.half == half and e.name in (on_name, off_name))
    )
    if not switches:
        return np.full(times.shape, initial, dtype=bool)
    edges = np.array([s for s, _ in switches])
    values = np.array([v for _, v in switches])
    index = np.searchsorted(edges, times, side="right") - 1
    out = np.where(index < 0, initial, values[np.clip(index, 0, None)])
    return out.astype(bool)


def isolated(events, half: str, name: str, before_ms: float = 300.0, require=None) -> list:
    """Occurrences of `name` with a clear run-up, optionally filtered by state.

    Time isolation on its own selects a biased set: a sforzando-on with 300 ms
    of silence before it is usually a re-trigger of a latch that is already on,
    with the line already sitting against the fortissimo stop. `require`, given
    the latch state immediately before the punch, keeps only genuine changes.

    The window after the trigger is not required to be clear: the response
    average censors each trace at its own next event instead, which keeps more
    of the short-lag data than a hard two-sided window would.
    """
    ordered = bellows_events(events, half)
    times = np.array([e.sec_on for e in ordered])
    out = []
    for position, event in enumerate(ordered):
        if event.name != name:
            continue
        earlier = times[:position]
        if earlier.size and (event.sec_on - earlier[-1]) * 1000.0 < before_ms:
            continue
        if require is not None:
            probe = np.array([event.sec_on - 1e-4])
            state = {latch: bool(latch_state(events, half, latch, probe)[0]) for latch in LATCHES}
            if not require(state["cresc"], state["sforz"], state["mf"]):
                continue
        out.append(event)
    return out


def next_event_time(events, half: str, after: float) -> float:
    ordered = bellows_events(events, half)
    times = np.array([e.sec_on for e in ordered])
    index = np.searchsorted(times, after, side="right")
    return float(times[index]) if index < times.size else np.inf


@dataclass
class Response:
    """An event-triggered average, censored at each trace's own next event."""

    name: str
    half: str
    lags_ms: np.ndarray
    mean: np.ndarray
    sem: np.ndarray
    count: np.ndarray
    traces: np.ndarray
    baseline: np.ndarray

    @property
    def n(self) -> int:
        return int(self.traces.shape[0])


def event_triggered(
    curve,
    events,
    half: str,
    name: str,
    lags_ms: np.ndarray,
    before_ms: float = 300.0,
    baseline_window_ms: tuple[float, float] = (-150.0, -120.0),
    subtract_baseline: bool = True,
    require=None,
) -> Response:
    take = sampler(curve)
    chosen = isolated(events, half, name, before_ms=before_ms, require=require)
    traces = np.full((len(chosen), lags_ms.size), np.nan)
    baselines = np.full(len(chosen), np.nan)
    for row, event in enumerate(chosen):
        values = take.at(event.sec_on + lags_ms / 1000.0)
        horizon = (next_event_time(events, half, event.sec_on) - event.sec_on) * 1000.0
        values[lags_ms > horizon] = np.nan
        pre = take.at(event.sec_on + np.arange(*baseline_window_ms, 2.0) / 1000.0)
        baselines[row] = np.nanmean(pre) if np.any(np.isfinite(pre)) else np.nan
        traces[row] = values
    if subtract_baseline:
        traces = traces - baselines[:, None]
    count = np.sum(np.isfinite(traces), axis=0)
    with np.errstate(invalid="ignore"):
        mean = np.nanmean(traces, axis=0)
        sd = np.nanstd(traces, axis=0, ddof=1)
    sem = np.where(count > 1, sd / np.sqrt(np.maximum(count, 1)), np.nan)
    return Response(
        name=name,
        half=half,
        lags_ms=lags_ms,
        mean=mean,
        sem=sem,
        count=count,
        traces=traces,
        baseline=baselines,
    )
