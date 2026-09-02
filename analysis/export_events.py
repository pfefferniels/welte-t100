"""Write the punched expression code out as JSON, with the roll metadata."""

from __future__ import annotations

import json
from dataclasses import asdict

import numpy as np

import dataset


def event_record(event: dataset.Event) -> dict:
    return {
        "track": event.half,
        "code": event.code,
        "name": event.name,
        "tickOn": event.tick_on,
        "tickOff": event.tick_off,
        "yPxOn": event.y_px_on,
        "yPxOff": event.y_px_off,
        "secOn": round(event.sec_on, 6),
        "secOff": round(event.sec_off, 6),
    }


def nearest_by_name(events: list[dataset.Event]) -> list[dict]:
    """For every event, the nearest event of each other code in the same half.

    Saves re-deriving co-occurrence relations downstream. `index` points into
    this same array; `rowOffset` is the other event's leading edge minus this
    one's, in scan rows, so a positive value means the other code comes later.
    """
    positions: dict[tuple[str, str], list[tuple[int, int]]] = {}
    for index, event in enumerate(events):
        positions.setdefault((event.half, event.name), []).append((event.tick_on, index))
    ordered = {key: sorted(rows) for key, rows in positions.items()}

    out = []
    for event in events:
        neighbours = {}
        for (half, name), rows in ordered.items():
            if half != event.half or name == event.name:
                continue
            ticks = np.array([tick for tick, _ in rows])
            slot = int(np.searchsorted(ticks, event.tick_on))
            best = None
            for candidate in (slot - 1, slot):
                if not 0 <= candidate < len(rows):
                    continue
                offset = rows[candidate][0] - event.tick_on
                if best is None or abs(offset) < abs(best[0]):
                    best = (offset, rows[candidate][1])
            if best is not None:
                neighbours[name] = {"index": best[1], "rowOffset": int(best[0])}
        out.append(neighbours)
    return out


def tempo_summary(timing) -> dict:
    rows = timing.tempo_rows
    rate = timing.rows_per_second
    return {
        "count": int(rows.size),
        "spacingTicks": int(round(float(np.median(np.diff(rows))))) if rows.size > 1 else None,
        "firstRow": int(rows[0]),
        "lastRow": int(rows[-1]),
        "rowsPerSecondFirst": float(rate[0]),
        "rowsPerSecondLast": float(rate[-1]),
        "secondsAtLastTempo": float(timing.tempo_seconds[-1]),
        "note": (
            "One MIDI tick is one pixel row; y_px = tick + first_hole. "
            "Seconds follow this tempo map, which models the take-up spool accelerating."
        ),
    }


def main() -> None:
    timing = dataset.load_timing()
    events = dataset.load_events(timing)

    out_dir = dataset.ROOT / "emulator" / "data"
    records = [event_record(e) for e in events]
    for record, neighbours in zip(records, nearest_by_name(events)):
        record["nearest"] = neighbours
    (out_dir / "expression-events.json").write_text(json.dumps(records, indent=1) + "\n")

    meta = {
        "druid": dataset.DRUID,
        "label": timing.metadata.get("LABEL"),
        "performer": timing.metadata.get("PERFORMER"),
        "composer": timing.metadata.get("COMPOSER"),
        "rollType": timing.metadata.get("ROLL_TYPE"),
        "source": "SUPRA raw MIDI, " + timing.source.split("roll-nuance-tracer/")[-1],
        "firstHole": timing.first_hole,
        "lastHole": int(timing.metadata["LAST_HOLE"].rstrip("px")),
        "division": 570,
        "lengthDpi": timing.metadata.get("LENGTH_DPI"),
        "tempoMap": tempo_summary(timing),
        "codes": dataset.EXPRESSION_CODES,
        "eventCount": len(events),
        "nearest": (
            "Per event, the nearest event of every other code in the same half: "
            "`index` into this array and `rowOffset`, the other event's leading edge "
            "minus this one's, in scan rows (positive means the other code comes later)."
        ),
        "curveSource": "out/{}/curves.csv".format(dataset.DRUID),
        "curveScale": "0.0 = P.P. gridline of the half, 0.5 = M.F., 1.0 = shared F.F.; higher is louder",
        "curveFlags": {
            "observed": list(dataset.OBSERVED),
            "interpolated": ["hole", "rule", "gap"],
        },
    }
    (out_dir / "expression-events.meta.json").write_text(json.dumps(meta, indent=1) + "\n")
    print(f"wrote {len(events)} events")


if __name__ == "__main__":
    main()
