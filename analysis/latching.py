"""Does the sforzando hold until cancelled, or only while its hole is open?

midi2exp treats it as momentary, so the excursion should follow the length of the
perforation. Hagmann has it latch, so the excursion should follow the interval to
the cancelling perforation instead. The drawn line can be asked directly.

The two predictors are themselves correlated, so partial correlations are given
alongside the plain ones: what each predictor explains once the other is allowed
for is what separates the two accounts.
"""

from __future__ import annotations

import numpy as np

import episodes
import timeline

BRIDGE_TICKS = 29


def slot_length(events, half: str, event) -> int:
    """Length of the perforation, joining bridged punches into the slot they form."""
    same = sorted((e for e in events if e.half == half and e.name == event.name), key=lambda e: e.tick_on)
    start, stop = event.tick_on, event.tick_off
    for other in same:
        if other.tick_on > stop + BRIDGE_TICKS:
            break
        if other.tick_on >= start and other.tick_on - stop <= BRIDGE_TICKS:
            stop = max(stop, other.tick_off)
    return stop - start


def cancel_interval(events, half: str, event) -> float:
    later = [e.tick_on for e in events if e.half == half and e.name == "sforz_off" and e.tick_on > event.tick_on]
    return float(min(later) - event.tick_on) if later else np.inf


def _partial(x: np.ndarray, y: np.ndarray, z: np.ndarray) -> float:
    """Correlation of x and y with z regressed out of both."""
    residual = lambda a: a - np.polyval(np.polyfit(z, a, 1), z)
    return float(np.corrcoef(residual(x), residual(y))[0, 1])


def measure(curve, events, half: str, rails, mf_level: float, lead_ms: float) -> dict:
    found = episodes.extract(
        curve, events, half, "sforz_on", +1, rails, mf_level, lead_ms,
        require=lambda cresc, sforz, mf: not sforz, onset_rate=0.6,
    )
    by_time = {round(e.trigger_time, 6): e for e in found}
    lengths, cancels, travels, durations, stopped = [], [], [], [], []
    for event in timeline.bellows_events(events, half):
        if event.name != "sforz_on":
            continue
        episode = by_time.get(round(event.sec_on, 6))
        if episode is None:
            continue
        interval = cancel_interval(events, half, event)
        if not np.isfinite(interval):
            continue
        lengths.append(slot_length(events, half, event))
        cancels.append(interval)
        travels.append(episode.travel)
        durations.append(episode.duration_ms)
        stopped.append(episode.hit_rail)

    length = np.array(lengths, dtype=float)
    cancel = np.array(cancels, dtype=float)
    travel = np.array(travels)
    duration = np.array(durations)
    free = ~np.array(stopped)

    def block(mask: np.ndarray, response: np.ndarray, name: str) -> dict:
        if mask.sum() < 10:
            return {"n": int(mask.sum()), "note": "too few episodes"}
        a, b, y = length[mask], cancel[mask], response[mask]
        return {
            "response": name,
            "n": int(mask.sum()),
            "r_with_perforation_length": float(np.corrcoef(a, y)[0, 1]),
            "r_with_cancel_interval": float(np.corrcoef(b, y)[0, 1]),
            "partial_r_perforation_length": _partial(a, y, b),
            "partial_r_cancel_interval": _partial(b, y, a),
            "r_between_predictors": float(np.corrcoef(a, b)[0, 1]),
        }

    return {
        "episodes": int(length.size),
        "free_of_a_stop": int(free.sum()),
        "perforation_slot_ticks": {"median": float(np.median(length)), "p10": float(np.percentile(length, 10)), "p90": float(np.percentile(length, 90))},
        "cancel_interval_ticks": {"median": float(np.median(cancel)), "p10": float(np.percentile(cancel, 10)), "p90": float(np.percentile(cancel, 90))},
        "excursion_all": block(np.ones_like(free), travel, "travel in scale units"),
        "excursion_free": block(free, travel, "travel in scale units, stop-free only"),
        "duration_all": block(np.ones_like(free), duration, "rise duration in ms"),
        "duration_free": block(free, duration, "rise duration in ms, stop-free only"),
    }


def after_the_rise(curve, events, half: str, rails, mf_level: float, lead_ms: float, decrescendo_fit: dict,
                   min_hold_ms: float = 150.0) -> dict:
    """What the line does between the rise ending and the cancelling perforation.

    This is what separates the two accounts. If the sforzando were momentary the
    line would already be falling at the slow decrescendo rate once its hole has
    closed; if the valve is latched open the line holds where the sforzando's own
    target put it.
    """
    take = timeline.sampler(curve)
    found = episodes.extract(
        curve, events, half, "sforz_on", +1, rails, mf_level, lead_ms,
        require=lambda cresc, sforz, mf: not sforz, onset_rate=0.6,
    )
    by_time = {round(e.trigger_time, 6): e for e in found}
    bellows = timeline.bellows_events(events, half)
    observed, predicted, levels = [], [], []
    for event in bellows:
        if event.name != "sforz_on":
            continue
        episode = by_time.get(round(event.sec_on, 6))
        if episode is None or episode.hit_rail:
            continue
        cancels = [e.sec_on for e in bellows if e.name == "sforz_off" and e.sec_on > event.sec_on]
        following = [e.sec_on for e in bellows if e.sec_on > event.sec_on]
        if not cancels or not following:
            continue
        start = episode.onset_time + episode.t[-1] + 0.030
        stop = min(cancels[0], following[0]) - lead_ms / 1000.0 - 0.030
        if (stop - start) * 1000.0 < min_hold_ms:
            continue
        times = np.arange(start, stop, 0.002)
        values = take.at(times)
        if np.mean(np.isfinite(values)) < 0.9:
            continue
        good = np.isfinite(values)
        observed.append(float(np.polyfit(times[good], values[good], 1)[0]))
        level = float(np.nanmedian(values))
        levels.append(level)
        predicted.append((decrescendo_fit["v_inf"] - level) / (decrescendo_fit["tau_ms"] / 1000.0))

    observed = np.array(observed)
    if observed.size < 5:
        return {"n": int(observed.size), "note": "too few holds long enough to read"}
    import lag

    low, high = lag.bootstrap_median(observed)
    return {
        "n": int(observed.size),
        "min_hold_ms": min_hold_ms,
        "observed_rate_median": float(np.median(observed)),
        "observed_ci95": [low, high],
        "observed_iqr": [float(np.percentile(observed, 25)), float(np.percentile(observed, 75))],
        "momentary_prediction_median": float(np.median(predicted)),
        "level_held_median": float(np.median(levels)),
        "fraction_within_0.1_per_s_of_still": float(np.mean(np.abs(observed) < 0.10)),
    }


def cancel_gap_ms(events, half: str) -> dict:
    """How long a sforzando stands before its cancelling perforation arrives."""
    ordered = timeline.bellows_events(events, half)
    gaps = []
    for index, event in enumerate(ordered):
        if event.name != "sforz_on":
            continue
        later = [e for e in ordered[index + 1 :] if e.name == "sforz_off"]
        if later:
            gaps.append(1000.0 * (later[0].sec_on - event.sec_on))
    gaps = np.array(gaps)
    return {
        "n": int(gaps.size),
        "median_ms": float(np.median(gaps)),
        "p10_ms": float(np.percentile(gaps, 10)),
        "p90_ms": float(np.percentile(gaps, 90)),
    }
