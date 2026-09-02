"""Do the traced rows and SUPRA's hole rows share an origin?

The tracer flags a row `hole` when a punch has removed the paper under the drawn
line. Those runs can be matched to the perforation that made them, which gives a
direct reading of the offset between the two row systems and so decides whether
the measured lead of the line over the punches is real.

The tracker column of MIDI key k sits at x = ORIGIN_X + (k - 14) * HOLE_SEPARATION
in the scan. ORIGIN_X is fitted here rather than taken from the roll metadata,
and the fit is its own check: at the right value nearly every `hole` run is
explained by a perforation on the column the drawn line was crossing.
"""

from __future__ import annotations

import collections
from dataclasses import dataclass

import numpy as np

import dataset

HOLE_SEPARATION = 37.7561  # px, from the roll metadata
FIRST_KEY = 14
COLUMN_TOLERANCE = 16.0  # px from the traced column to the centre of a tracker column


@dataclass(frozen=True)
class Punches:
    """Row spans of every perforation, by MIDI key."""

    spans: dict[int, np.ndarray]

    def overlapping(self, key: int, start: int, stop: int, slack: int = 0) -> np.ndarray:
        span = self.spans.get(key)
        if span is None:
            return np.empty((0, 2), dtype=int)
        return span[(span[:, 0] <= stop + slack) & (span[:, 1] >= start - slack)]


def load_punches(timing) -> Punches:
    import mido

    midi = mido.MidiFile(dataset.ROOT / "cache" / dataset.DRUID / f"{dataset.DRUID}_raw.mid")
    spans: dict[int, list] = collections.defaultdict(list)
    for index in (1, 2, 3, 4):
        for key, start, stop in dataset._pair(dataset._absolute_note_events(midi.tracks[index])):
            spans[key].append((start + timing.first_hole, stop + timing.first_hole))
    return Punches({key: np.array(sorted(rows)) for key, rows in spans.items()})


def hole_runs(curve, columns: np.ndarray):
    """Start row, stop row and traced column of every `hole`-flagged run."""
    flagged = curve.flag == "hole"
    edges = np.flatnonzero(np.diff(np.concatenate(([0], flagged.view(np.int8), [0]))))
    first, last = edges[::2], edges[1::2] - 1
    traced = np.array([np.nanmedian(columns[a : b + 1]) for a, b in zip(first, last)])
    return curve.y_px[first], curve.y_px[last], traced


def fit_origin(starts, stops, traced, punches: Punches, grid=np.arange(60.0, 220.0, 0.5)):
    """The column origin that explains the most runs."""
    scores = []
    for origin in grid:
        explained = 0
        for column, start, stop in zip(traced, starts, stops):
            key = int(round((column - origin) / HOLE_SEPARATION)) + FIRST_KEY
            for candidate in (key - 1, key, key + 1):
                centre = origin + (candidate - FIRST_KEY) * HOLE_SEPARATION
                if abs(centre - column) > COLUMN_TOLERANCE:
                    continue
                if punches.overlapping(candidate, start, stop, slack=6).size:
                    explained += 1
                    break
        scores.append((origin, explained))
    scores = np.array(scores)
    best = int(np.argmax(scores[:, 1]))
    return float(scores[best, 0]), int(scores[best, 1]), scores


def offsets(starts, stops, traced, punches: Punches, origin: float):
    """Run start minus punch start, and run end minus punch end, per matched run."""
    lead, trail, keys = [], [], []
    for column, start, stop in zip(traced, starts, stops):
        key = int(round((column - origin) / HOLE_SEPARATION)) + FIRST_KEY
        best = None
        for candidate in (key - 1, key, key + 1):
            centre = origin + (candidate - FIRST_KEY) * HOLE_SEPARATION
            if abs(centre - column) > COLUMN_TOLERANCE:
                continue
            for punch_start, punch_stop in punches.overlapping(candidate, start, stop, slack=6):
                overlap = min(stop, punch_stop) - max(start, punch_start)
                if best is None or overlap > best[0]:
                    best = (overlap, candidate, punch_start, punch_stop)
        if best is None:
            continue
        _, candidate, punch_start, punch_stop = best
        lead.append(start - punch_start)
        trail.append(stop - punch_stop)
        keys.append(candidate)
    return np.array(lead), np.array(trail), np.array(keys)
