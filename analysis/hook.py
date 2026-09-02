"""Does the Mezzoforte pin block travel in one direction or in both?

Hagmann has the pin confine the bellows to whichever half of its travel it is
already in. A one-sided floor makes the same prediction whenever the hook engages
from above, so the two are separated only by crossings of the stop level while the
hook is set: a two-sided stop forbids upward crossings, a floor permits them, and
both forbid downward ones.

Whether the roll can answer at all depends on where the line stands when the hook
engages, so that is reported alongside.
"""

from __future__ import annotations

import numpy as np

import timeline

MARGIN = 0.03
RUN_ROWS = 20


def _sustained(mask: np.ndarray, run: int) -> np.ndarray:
    return np.convolve(mask.astype(int), np.ones(run, dtype=int), "same") == run


def crossings(curve, events, half: str, stop: float, lead_ms: float,
              margin: float = MARGIN, run: int = RUN_ROWS) -> dict:
    value = curve.masked()
    engaged = timeline.latch_state(events, half, "mf", curve.seconds + lead_ms / 1000.0)
    edges = np.flatnonzero(np.diff(np.concatenate(([0], engaged.view(np.int8), [0]))))
    holds = list(zip(edges[::2], edges[1::2]))

    low = _sustained(np.isfinite(value) & (value < stop - margin), run)
    high = _sustained(np.isfinite(value) & (value > stop + margin), run)

    # A crossing bridged by rows the tracer could not witness proves nothing, so
    # the path between the two established runs has to be observed throughout.
    witnessed = curve.observed

    upward, downward, holds_with_low = 0, 0, 0
    unwitnessed_up, unwitnessed_down = 0, 0
    episodes = []
    for start, stop_row in holds:
        if low[start:stop_row].any():
            holds_with_low += 1
        states = [(index, "low" if low[index] else "high")
                  for index in range(start, stop_row) if low[index] or high[index]]
        compressed: list[list] = []
        for index, state in states:
            if not compressed or compressed[-1][1] != state:
                compressed.append([index, state])
        for (first, before), (second, after) in zip(compressed, compressed[1:]):
            if before == after:
                continue
            clear = bool(witnessed[first : second + 1].all())
            gaps = int((~witnessed[first : second + 1]).sum())
            if before == "low" and after == "high":
                if clear:
                    upward += 1
                else:
                    unwitnessed_up += 1
                episodes.append({
                    "direction": "up",
                    "witnessed": clear,
                    "unwitnessed_rows_in_the_bridge": gaps,
                    "bridge_rows": int(second - first + 1),
                    "from_row": int(curve.y_px[first]),
                    "to_row": int(curve.y_px[second]),
                    "seconds": float(curve.seconds[first]),
                    "from_value": float(value[first]),
                    "to_value": float(value[second]),
                    "ms": float(1000.0 * (curve.seconds[second] - curve.seconds[first])),
                })
            else:
                if clear:
                    downward += 1
                else:
                    unwitnessed_down += 1

    seen = engaged & np.isfinite(value)
    at_engagement = []
    take = timeline.sampler(curve)
    for event in events:
        if event.half != half or event.name != "mf_on":
            continue
        window = event.sec_on - lead_ms / 1000.0 + np.arange(-0.06, 0.001, 0.002)
        at_engagement.append(float(np.nanmedian(take.at(window))))

    return {
        "stop": stop,
        "margin": margin,
        "run_rows": run,
        "holds": len(holds),
        "holds_with_line_below": holds_with_low,
        "rows_engaged": int(engaged.sum()),
        "rows_established_below": int((low & engaged).sum()),
        "rows_established_above": int((high & engaged).sum()),
        "deepest_below_stop": float((stop - value[seen]).max()),
        "upward_crossings": upward,
        "downward_crossings": downward,
        "upward_rejected_unwitnessed": unwitnessed_up,
        "downward_rejected_unwitnessed": unwitnessed_down,
        "upward_episodes": episodes,
        "value_at_engagement": {
            "n": len(at_engagement),
            "min": float(np.nanmin(at_engagement)),
            "max": float(np.nanmax(at_engagement)),
            "above_stop": int(np.sum(np.array(at_engagement) > stop)),
            "values": [round(v, 4) for v in sorted(at_engagement)],
        },
    }
