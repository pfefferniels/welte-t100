"""Separating drawn ink, punched holes and paper on a red Welte roll scan.

The paper is red, so ink sits low in the red channel while punches are bright in
green; that pair of thresholds separates all three cleanly.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Layers:
    red: np.ndarray
    evidence: np.ndarray
    ink: np.ndarray
    hole: np.ndarray


def _paper_level(channel: np.ndarray, block_rows: int) -> np.ndarray:
    """Median level per block of rows, broadcast back to one value per row."""
    blocks = np.array_split(channel, max(1, len(channel) // block_rows))
    medians = np.array([np.median(block) for block in blocks])
    return np.repeat(medians, [len(block) for block in blocks])[:, None]


def separate(
    rgb: np.ndarray,
    block_rows: int = 512,
    ink_offset: int = 40,
    hole_offset: int = 60,
    noise_floor: int = 12,
) -> Layers:
    """Split a band of scan into paper, drawn ink and punched holes.

    Ink evidence is graded rather than thresholded, because the drawn lines fade
    in places and a hard cut there costs the tracer the line altogether. It is
    also floored, so that the grain of the paper reads as no evidence at all
    rather than as a very faint line worth chasing.
    """
    red = rgb[..., 0].astype(np.int16)
    green = rgb[..., 1].astype(np.int16)
    hole = green > _paper_level(green, block_rows) + hole_offset
    darkness = _paper_level(red, block_rows) - red
    evidence = np.clip((darkness - noise_floor) / (ink_offset - noise_floor), 0.0, 1.0)
    ink = (darkness >= ink_offset) & ~hole
    return Layers(rgb[..., 0], evidence, ink, hole)
