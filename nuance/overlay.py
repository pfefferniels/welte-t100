"""QA renderings: the traced paths blended over the original band pixels."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

BASS_COLOUR = (0, 210, 255)
TREBLE_COLOUR = (255, 90, 200)
RULE_COLOUR = (255, 220, 0)
BLEND = 0.65


def _blend(canvas: np.ndarray, rows: np.ndarray, columns: np.ndarray, colour) -> None:
    inside = (columns >= 0) & (columns < canvas.shape[1])
    target = canvas[rows[inside], columns[inside]]
    canvas[rows[inside], columns[inside]] = (1 - BLEND) * target + BLEND * np.array(colour)


def render(
    rgb: np.ndarray,
    bass: np.ndarray,
    treble: np.ndarray,
    rules: np.ndarray,
    path: Path,
) -> None:
    canvas = rgb.astype(np.float32).copy()
    rows = np.arange(len(canvas))
    for k in range(rules.shape[1]):
        _blend(canvas, rows[::6], np.rint(rules[::6, k]).astype(int), RULE_COLOUR)
    for trace, colour in ((bass, BASS_COLOUR), (treble, TREBLE_COLOUR)):
        _blend(canvas, rows, np.rint(trace).astype(int), colour)
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(canvas.round().clip(0, 255).astype(np.uint8)).save(path)
