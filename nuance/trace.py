"""Tracing one drawn line down the roll as a least-cost path.

Ink is free to follow, paper is expensive, punched holes and the printed
gridlines are neutral: the line disappears behind both and must be allowed to
pass without being attracted to them. Sideways movement is charged per pixel,
which lets a sforzando cross the whole scale within a few rows while a resting
line stays put.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Costs:
    paper: float = 1.0
    hole: float = 0.9
    rule: float = 1.0
    step: float = 0.05


def build_cost(
    evidence: np.ndarray,
    hole: np.ndarray,
    rule_columns: np.ndarray,
    costs: Costs = Costs(),
) -> np.ndarray:
    """Cheap on ink, dear on paper, uninformative where the line cannot be seen.

    A gridline must cost exactly what paper costs. Any discount, however small,
    accumulates over a column that runs the whole length of the roll, and the
    path then prefers to sit on the printed line rather than follow a faint
    drawn one.
    """
    cost = costs.paper * (1.0 - evidence)
    cost[hole] = costs.hole
    cost[:, rule_columns] = costs.rule
    return cost


def _sweep(values: np.ndarray, penalty: float) -> tuple[np.ndarray, np.ndarray]:
    """min over j <= i of values[j] + penalty * (i - j), with the winning j."""
    order = np.arange(values.size)
    shifted = values - penalty * order
    running = np.minimum.accumulate(shifted)
    winner = np.maximum.accumulate(np.where(shifted <= running, order, -1))
    return running + penalty * order, winner


def _relax(values: np.ndarray, penalty: float) -> tuple[np.ndarray, np.ndarray]:
    """min over all j of values[j] + penalty * |i - j|, with the winning j.

    Ties resolve in favour of standing still, so that a stretch of roll with no
    evidence at all holds the last position instead of drifting to whichever
    column the sweep happened to favour.
    """
    forward, forward_arg = _sweep(values, penalty)
    backward, backward_arg = _sweep(values[::-1], penalty)
    backward, backward_arg = backward[::-1], values.size - 1 - backward_arg[::-1]
    prefer_forward = forward <= backward
    relaxed = np.where(prefer_forward, forward, backward)
    argmin = np.where(prefer_forward, forward_arg, backward_arg)
    return relaxed, np.where(values <= relaxed, np.arange(values.size), argmin)


PIN_COST = 1e6


def pin(cost: np.ndarray, columns: dict[int, int]) -> np.ndarray:
    """Force the path through one column in each of the given rows."""
    if not columns:
        return cost
    pinned = cost.copy()
    rows = np.fromiter(columns, int, len(columns))
    pinned[rows] = PIN_COST
    pinned[rows, np.array([columns[row] for row in rows])] = 0.0
    return pinned


def least_cost_path(cost: np.ndarray, step_penalty: float) -> np.ndarray:
    """Column index per row of the cheapest path from top to bottom."""
    rows, width = cost.shape
    back = np.empty((rows, width), np.int32)
    back[0] = np.arange(width)
    accumulated = cost[0].astype(np.float64)
    for row in range(1, rows):
        relaxed, argmin = _relax(accumulated, step_penalty)
        accumulated = relaxed + cost[row]
        back[row] = argmin
    path = np.empty(rows, np.int32)
    path[-1] = int(np.argmin(accumulated))
    for row in range(rows - 1, 0, -1):
        path[row - 1] = back[row, path[row]]
    return path


def _neighbourhood(mask: np.ndarray, path: np.ndarray, reach: int) -> np.ndarray:
    offsets = np.arange(-reach, reach + 1)
    columns = np.clip(path[:, None] + offsets[None, :], 0, mask.shape[1] - 1)
    return mask[np.arange(mask.shape[0])[:, None], columns]


def _run_extent(window: np.ndarray, reach: int) -> tuple[np.ndarray, np.ndarray]:
    """How far the ink run through the centre of each window reaches each way."""
    left = window[:, : reach + 1][:, ::-1]
    right = window[:, reach:]
    reach_left = np.where(left.all(axis=1), left.shape[1], left.argmin(axis=1))
    reach_right = np.where(right.all(axis=1), right.shape[1], right.argmin(axis=1))
    return reach_left, reach_right


def centre_on_run(
    ink: np.ndarray, path: np.ndarray, reach: int = 10, max_width: int = 15
) -> np.ndarray:
    """Move each traced point to the middle of the ink run it sits in.

    Only when both ends of the run are in view: a run that leaves the window is
    a near-horizontal stretch of the line, and its visible part has no centre
    worth moving to.
    """
    window = _neighbourhood(ink, path, reach)
    reach_left, reach_right = _run_extent(window, reach)
    left = path - (reach_left - 1)
    right = path + (reach_right - 1)
    bounded = (reach_left <= reach) & (reach_right <= reach)
    usable = window[:, reach] & bounded & (right - left + 1 <= max_width)
    return np.where(usable, (left + right) / 2.0, path.astype(float))
