"""The five printed gridlines that carry the dynamic scale.

Reading left to right they are P.P. · M.F. · F.F. · M.F. · P.P.; the central
F.F. line belongs to both keyboard halves. They are evenly spaced, and they
drift across the roll only as a group, which is what makes them separable from
a drawn line that happens to rest in one place for a while.
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations

import numpy as np

RULE_COUNT = 5
PP_BASS, MF_BASS, FF, MF_TREBLE, PP_TREBLE = range(RULE_COUNT)
DENSITY_THRESHOLD = 0.6


class RuleError(RuntimeError):
    pass


@dataclass(frozen=True)
class RuleTrack:
    """Gridline positions sampled along the roll, in band-local pixels."""

    rows: np.ndarray
    positions: np.ndarray

    def at(self, rows: np.ndarray) -> np.ndarray:
        columns = (np.interp(rows, self.rows, self.positions[:, k]) for k in range(RULE_COUNT))
        return np.stack(list(columns), axis=1)


def column_density(ink: np.ndarray) -> np.ndarray:
    return ink.mean(axis=0)


def _runs(mask: np.ndarray) -> list[slice]:
    edges = np.flatnonzero(np.diff(np.concatenate(([0], mask.view(np.int8), [0]))))
    return [slice(start, stop) for start, stop in zip(edges[::2], edges[1::2])]


def candidates(density: np.ndarray, threshold: float = DENSITY_THRESHOLD) -> np.ndarray:
    """Density-weighted centre of every column run dark enough to be a gridline."""
    centres = [
        np.average(np.arange(run.start, run.stop), weights=density[run])
        for run in _runs(density > threshold)
    ]
    return np.array(centres)


def widths(density: np.ndarray, threshold: float = DENSITY_THRESHOLD) -> np.ndarray:
    return np.array([run.stop - run.start for run in _runs(density > threshold)])


def _most_regular(centres: np.ndarray) -> np.ndarray:
    """The evenly spaced quintuple among the candidates."""
    if len(centres) > 12:
        raise RuleError(f"too many gridline candidates to disambiguate: {np.round(centres, 1)}")
    spread = lambda group: np.std(np.diff(group)) / np.mean(np.diff(group))
    return np.array(min(combinations(centres, RULE_COUNT), key=spread))


def prior_positions(density: np.ndarray, threshold: float = DENSITY_THRESHOLD) -> np.ndarray:
    centres = candidates(density, threshold)
    if len(centres) < RULE_COUNT:
        raise RuleError(f"expected {RULE_COUNT} gridlines, found {np.round(centres, 1)}")
    return centres if len(centres) == RULE_COUNT else _most_regular(centres)


def refine(density: np.ndarray, prior: np.ndarray, tolerance: float = 8.0) -> np.ndarray:
    """Shift the whole gridline set onto the nearest candidates.

    The five lines drift together, so a single median offset is both enough and
    far steadier than fitting each line on its own.
    """
    centres = candidates(density)
    if len(centres) == 0:
        return prior
    offsets = centres[np.abs(centres[None, :] - prior[:, None]).argmin(axis=1)] - prior
    shift = float(np.median(offsets[np.abs(offsets) <= tolerance])) if np.any(np.abs(offsets) <= tolerance) else 0.0
    return prior + shift


def all_present(density: np.ndarray, prior: np.ndarray, tolerance: float = 3.0) -> bool:
    centres = candidates(density)
    if len(centres) < RULE_COUNT:
        return False
    positions = refine(density, prior)
    return bool(np.all(np.min(np.abs(centres[None, :] - positions[:, None]), axis=1) <= tolerance))
