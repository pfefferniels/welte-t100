"""Is the sforzando-crescendo coupling Hagmann describes punched into the roll?

Hagmann (1984) says setting Sforzando always also sets Crescendo, and that
cancelling it goes through the crescendo-off opening as well. If the roll is
punched that way the two codes should arrive together; if the relay does it
internally they need not, and an emulator has to supply the coupling itself.

Chance co-occurrence at this event density is not negligible, so the same
statistic is computed against circularly shifted copies of the trigger series,
which keeps each series' own rhythm and destroys only the alignment between them.
"""

from __future__ import annotations

import numpy as np

WINDOW_ROWS = 40


def onsets(events, half: str, name: str) -> np.ndarray:
    return np.array(sorted(e.tick_on for e in events if e.half == half and e.name == name), dtype=float)


def nearest_offset(triggers: np.ndarray, partners: np.ndarray) -> np.ndarray:
    """Signed partner-minus-trigger row offset, for the nearest partner to each trigger."""
    if triggers.size == 0 or partners.size == 0:
        return np.empty(0)
    index = np.searchsorted(partners, triggers)
    below = partners[np.clip(index - 1, 0, partners.size - 1)] - triggers
    above = partners[np.clip(index, 0, partners.size - 1)] - triggers
    return np.where(np.abs(below) <= np.abs(above), below, above)


def overlap_fraction(triggers, trigger_stops, partners, partner_stops) -> float:
    """Fraction of triggers whose perforation overlaps a partner perforation."""
    if triggers.size == 0:
        return float("nan")
    hits = 0
    for start, stop in zip(triggers, trigger_stops):
        if np.any((partners <= stop) & (partner_stops >= start)):
            hits += 1
    return hits / triggers.size


def within(offsets: np.ndarray, window: float = WINDOW_ROWS) -> float:
    return float(np.mean(np.abs(offsets) <= window)) if offsets.size else float("nan")


def shifted_control(triggers, partners, span, draws: int = 2000, window: float = WINDOW_ROWS, seed: int = 0):
    """Distribution of the co-occurrence rate under random circular shifts."""
    rng = np.random.default_rng(seed)
    rates = []
    for shift in rng.uniform(0.0, span, draws):
        moved = np.sort((triggers + shift) % span)
        rates.append(within(nearest_offset(moved, partners), window))
    rates = np.array(rates)
    return {
        "mean": float(rates.mean()),
        "p2.5": float(np.percentile(rates, 2.5)),
        "p97.5": float(np.percentile(rates, 97.5)),
    }


def contingency(events, half: str, trigger: str, partner: str, span: float) -> dict:
    triggers = onsets(events, half, trigger)
    partners = onsets(events, half, partner)
    stops = np.array(sorted((e.tick_on, e.tick_off) for e in events if e.half == half and e.name == trigger))
    partner_stops = np.array(sorted((e.tick_on, e.tick_off) for e in events if e.half == half and e.name == partner))
    offsets = nearest_offset(triggers, partners)
    observed = within(offsets)
    control = shifted_control(triggers, partners, span)
    edges = np.arange(-400.0, 401.0, 40.0)
    histogram, _ = np.histogram(offsets, bins=edges)
    return {
        "trigger": trigger,
        "partner": partner,
        "n_trigger": int(triggers.size),
        "n_partner": int(partners.size),
        "overlapping_perforations": overlap_fraction(stops[:, 0], stops[:, 1], partner_stops[:, 0], partner_stops[:, 1]),
        "within_40_rows": observed,
        "control_within_40_rows": control,
        "excess_over_chance": observed - control["mean"],
        "offset_median": float(np.median(offsets)),
        "offset_iqr": [float(np.percentile(offsets, 25)), float(np.percentile(offsets, 75))],
        "offset_histogram": {"edges": edges.tolist(), "counts": histogram.tolist()},
    }
