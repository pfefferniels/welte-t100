"""Hand corrections to a traced curve, kept apart from the trace itself.

Three kinds, all in scan coordinates so they survive a change of band:

*anchors* assert that the curve passes through one point. The tracer is forced
through it and follows the ink as usual on either side, so an anchor guides a
trace rather than replacing it.

*strokes* assert the whole course of the curve over a stretch, for places where
there is no ink left to follow and nothing to guide.

*regions* assert what can be seen rather than where the curve runs: that the
drawn line is faded over a stretch, or not there at all. A lacuna is bridged by
a straight line and flagged as such, so that the reading is never mistaken for
a measurement. That is a judgement about the source, and it belongs to the
editor rather than to the tracer.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

HALVES = ("bass", "treble")
TRACED, ANCHORED, DRAWN, BRIDGED = "traced", "anchored", "drawn", "bridged"
LACUNA, FADED = "lacuna", "faded"
STATES = (LACUNA, FADED)


class EditError(ValueError):
    pass


def _check_half(half: str) -> str:
    if half not in HALVES:
        raise EditError(f"unknown half {half!r}")
    return half


@dataclass(frozen=True)
class Anchor:
    half: str
    y: int
    x: float

    def __post_init__(self) -> None:
        _check_half(self.half)


@dataclass(frozen=True)
class Stroke:
    half: str
    points: tuple[tuple[int, float], ...]

    def __post_init__(self) -> None:
        _check_half(self.half)
        if len(self.points) < 2:
            raise EditError("a stroke needs at least two points")

    @property
    def start(self) -> int:
        return int(self.points[0][0])

    @property
    def stop(self) -> int:
        return int(self.points[-1][0]) + 1

    def at(self, rows: np.ndarray) -> np.ndarray:
        ys = [y for y, _ in self.points]
        xs = [x for _, x in self.points]
        return np.interp(rows, ys, xs)


@dataclass(frozen=True)
class Region:
    """A stretch where the editor declares what the source actually shows."""

    half: str
    start: int
    stop: int
    state: str

    def __post_init__(self) -> None:
        _check_half(self.half)
        if self.state not in STATES:
            raise EditError(f"unknown region state {self.state!r}")
        if self.stop <= self.start:
            raise EditError("a region needs at least one row")


@dataclass(frozen=True)
class Edits:
    anchors: tuple[Anchor, ...] = ()
    strokes: tuple[Stroke, ...] = ()
    regions: tuple[Region, ...] = ()
    druid: str = ""

    @classmethod
    def load(cls, path: Path) -> Edits:
        if not path.exists():
            return cls()
        raw = json.loads(path.read_text())
        return cls(
            anchors=tuple(Anchor(a["half"], int(a["y"]), float(a["x"])) for a in raw.get("anchors", [])),
            strokes=tuple(
                Stroke(s["half"], tuple((int(y), float(x)) for y, x in s["points"]))
                for s in raw.get("strokes", [])
            ),
            regions=tuple(
                Region(r["half"], int(r["start"]), int(r["stop"]), r["state"]) for r in raw.get("regions", [])
            ),
            druid=raw.get("druid", ""),
        )

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(
                {
                    "druid": self.druid,
                    "anchors": [{"half": a.half, "y": a.y, "x": a.x} for a in self.anchors],
                    "strokes": [{"half": s.half, "points": [list(p) for p in s.points]} for s in self.strokes],
                    "regions": [
                        {"half": r.half, "start": r.start, "stop": r.stop, "state": r.state} for r in self.regions
                    ],
                },
                indent=2,
            )
        )

    def is_empty(self) -> bool:
        return not self.anchors and not self.strokes and not self.regions

    def regions_for(self, half: str) -> tuple[Region, ...]:
        return tuple(region for region in self.regions if region.half == half)

    def pins(self, half: str, rows: range, offset: float) -> dict[int, int]:
        """Anchors of one half inside a row range, as row index to column index."""
        return {
            anchor.y - rows.start: int(round(anchor.x - offset))
            for anchor in self.anchors
            if anchor.half == half and anchor.y in rows
        }

    def anchored_rows(self, half: str) -> set[int]:
        return {anchor.y for anchor in self.anchors if anchor.half == half}

    def strokes_for(self, half: str) -> tuple[Stroke, ...]:
        return tuple(stroke for stroke in self.strokes if stroke.half == half)

    def touched(self, half: str) -> list[tuple[int, int]]:
        """Row ranges this half's edits affect, merged and sorted."""
        spans = [(a.y, a.y + 1) for a in self.anchors if a.half == half]
        spans += [(s.start, s.stop) for s in self.strokes_for(half)]
        spans += [(r.start, r.stop) for r in self.regions_for(half)]
        merged: list[list[int]] = []
        for start, stop in sorted(spans):
            if merged and start <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], stop)
            else:
                merged.append([start, stop])
        return [(start, stop) for start, stop in merged]


def apply_strokes(
    edits: Edits,
    half: str,
    rows: np.ndarray,
    path: np.ndarray,
    source: np.ndarray,
    offset: float = 0.0,
) -> None:
    """Overwrite the traced path where a stroke says otherwise, in place.

    Strokes are stored in scan coordinates; `offset` shifts them into whatever
    frame `path` is kept in.
    """
    for stroke in edits.strokes_for(half):
        inside = (rows >= stroke.start) & (rows < stroke.stop)
        if inside.any():
            path[inside] = stroke.at(rows[inside]) - offset
            source[inside] = DRAWN


def _bridge(path: np.ndarray, inside: np.ndarray) -> None:
    """Replace a stretch by a straight line between the values on either side."""
    span = np.flatnonzero(inside)
    before = path[span[0] - 1] if span[0] > 0 else None
    after = path[span[-1] + 1] if span[-1] + 1 < len(path) else None
    if before is None and after is None:
        return
    if before is None or after is None:
        path[inside] = after if before is None else before
    else:
        path[inside] = np.linspace(before, after, len(span) + 2)[1:-1]


def apply_regions(
    edits: Edits, half: str, rows: np.ndarray, path: np.ndarray, flag: np.ndarray, source: np.ndarray
) -> None:
    """Record what the editor says is visible, and bridge the lacunae.

    A stroke is a deliberate reading of an invisible stretch, so it survives:
    the region then only records that the stretch cannot be seen.
    """
    for region in edits.regions_for(half):
        inside = (rows >= region.start) & (rows < region.stop)
        if not inside.any():
            continue
        flag[inside] = region.state
        bridgeable = inside & (source != DRAWN)
        if region.state == LACUNA and bridgeable.any():
            _bridge(path, bridgeable)
            source[bridgeable] = BRIDGED
