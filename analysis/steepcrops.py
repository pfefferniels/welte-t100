#!/usr/bin/env python3
"""Crops of the scan at the steepest edges, with the traces drawn over the ink.

Two paths per crop: the accepted trace and a re-trace at a fifth of its step
penalty. Where they lie on top of one another the penalty is not the thing
deciding where the path goes.
"""

from __future__ import annotations

import sys

import numpy as np
from PIL import Image

import dataset
import steepness as st

sys.path.insert(0, str(dataset.ROOT))
from nuance.iiif import BandReader, RollImage  # noqa: E402

CACHE = "/private/tmp/claude-501/-Users-nielspfeffer-Projects-roll-nuance-tracer/6b679fb7-144f-4cdf-a212-1b591f114a69/scratchpad/rcache"
OUT = dataset.ROOT / "emulator" / "docs" / "figures" / "steep"
ACCEPTED_COLOUR = (0, 210, 255)
RETRACE_COLOUR = (255, 200, 0)
PAD_ROWS = 60
COMPARE_PENALTY = 0.010


def draw(canvas: np.ndarray, rows: np.ndarray, columns: np.ndarray, colour, blend: float = 0.75) -> None:
    inside = np.isfinite(columns)
    r, c = rows[inside], np.rint(columns[inside]).astype(int)
    ok = (c >= 0) & (c < canvas.shape[1])
    canvas[r[ok], c[ok]] = (1 - blend) * canvas[r[ok], c[ok]] + blend * np.array(colour)


def steepest(frame, half: str, count: int) -> list[tuple[int, int, float]]:
    rate = st.rate(frame, half)
    rows = frame["y_px"].to_numpy()
    seen = st.observed(frame, half)
    steep = seen & np.isfinite(rate) & (np.abs(rate) > st.STEEP)
    edges = np.flatnonzero(np.diff(np.concatenate(([0], steep.view(np.int8), [0]))))
    runs = [(int(rows[a]), int(rows[b - 1]), float(np.nanmax(np.abs(rate[a:b])))) for a, b in zip(edges[::2], edges[1::2])]
    return sorted(runs, key=lambda run: -run[2])[:count]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    image = RollImage.open(dataset.DRUID, __import__("pathlib").Path(CACHE), "png")
    reader = BandReader(image, 1611, 1069, 8000)
    accepted = st.accepted()

    made = 0
    for start, _ in st.windows():
        retrace = st.load(st.RETRACE / f"w{start}_p{COMPARE_PENALTY:.3f}")
        for half in ("bass", "treble"):
            for first, last, peak in steepest(retrace, half, 2):
                top, bottom = first - PAD_ROWS, last + PAD_ROWS
                canvas = reader.rows(top, bottom).astype(np.float32).copy()
                rows = np.arange(bottom - top)
                for frame, colour in ((accepted, ACCEPTED_COLOUR), (retrace, RETRACE_COLOUR)):
                    inside = (frame["y_px"] >= top) & (frame["y_px"] < bottom)
                    piece = frame[inside]
                    draw(canvas, piece["y_px"].to_numpy() - top, piece[f"{half}_x"].to_numpy() - 1611, colour)
                name = f"{half}-{first}-peak{peak:.0f}.png"
                Image.fromarray(canvas.round().clip(0, 255).astype(np.uint8)).save(OUT / name)
                made += 1
                print(f"  {name}  rows {top}..{bottom}, peak {peak:.1f} units/s")
    print(f"wrote {made} crops to {OUT}")


if __name__ == "__main__":
    main()
