#!/usr/bin/env python3
"""Extract the drawn Handnuancierung curves from a scanned Welte roll.

    ./trace_roll.py jq774vx6544
"""

from __future__ import annotations

import argparse
import csv
import json
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from nuance import calibrate, edits, overlay, rules, segment, trace
from nuance.iiif import BandReader, Region, RollImage
from nuance.supra import read_timing

BAND_MARGIN = 60
PROBE_ROWS = 2000
SPAN_STEP = 250
OVERLAY_ROWS = 1200
OVERVIEW_SQUASH = 160
OVERVIEW_INK = 25


@dataclass(frozen=True)
class Band:
    x: int
    width: int
    prior: np.ndarray
    rule_halfwidth: float


@dataclass(frozen=True)
class Half:
    name: str
    low: int
    high: int
    value_of: Callable[[np.ndarray, np.ndarray], np.ndarray]


def locate_band(image: RollImage, probes: tuple[float, ...] = (0.35, 0.5, 0.65)) -> Band:
    """Find the five gridlines from a few full-resolution probes near the middle."""
    search_x, search_width = image.width // 3, image.width // 3
    found, widths = [], []
    for fraction in probes:
        top = int(image.height * fraction)
        rgb = image.region(Region(search_x, top, search_width, PROBE_ROWS))
        density = rules.column_density(segment.separate(rgb).ink)
        found.append(rules.prior_positions(density) + search_x)
        widths.append(rules.widths(density))
    prior = np.mean(found, axis=0)
    x = int(prior[0]) - BAND_MARGIN
    return Band(
        x=x,
        width=int(prior[-1]) + BAND_MARGIN - x,
        prior=prior - x,
        rule_halfwidth=float(np.max(widths)) / 2.0,
    )


def _has_all_rules(reader: BandReader, band: Band, top: int, height: int) -> bool:
    density = rules.column_density(segment.separate(reader.rows(top, top + height)).ink)
    return rules.all_present(density, band.prior)


def _longest_run(flags: np.ndarray) -> slice:
    edges = np.flatnonzero(np.diff(np.concatenate(([0], flags.view(np.int8), [0]))))
    spans = [slice(start, stop) for start, stop in zip(edges[::2], edges[1::2])]
    if not spans:
        raise rules.RuleError("no stretch of roll carries the ruled band")
    return max(spans, key=lambda span: span.stop - span.start)


def coarse_span(image: RollImage, band: Band) -> tuple[int, int, float]:
    """Bracket the ruled band on a vertically squashed view of the whole roll.

    Squashing keeps full resolution across the roll, so the gridlines stay sharp
    columns and are simply present or absent; a plain thumbnail blurs them away.
    """
    view = image.squashed(Region(band.x, 0, band.width, image.height), image.height // OVERVIEW_SQUASH)
    scale = image.height / view.shape[0]
    ink = segment.separate(view, block_rows=view.shape[0], ink_offset=OVERVIEW_INK).ink
    reach = int(np.ceil(band.rule_halfwidth))
    seen = [ink[:, max(0, int(x) - reach):int(x) + reach + 1].any(axis=1) for x in band.prior]
    span = _longest_run(np.sum(seen, axis=0) >= rules.RULE_COUNT - 1)
    return int(span.start * scale), int(span.stop * scale), scale


def drawn_span(image: RollImage, reader: BandReader, band: Band) -> tuple[int, int]:
    """First and last row carrying all five gridlines."""
    coarse_start, coarse_stop, scale = coarse_span(image, band)
    reach = int(2 * scale)
    start = next(
        (
            row
            for row in range(max(0, coarse_start - reach), coarse_start + reach, SPAN_STEP)
            if _has_all_rules(reader, band, row, SPAN_STEP)
        ),
        coarse_start,
    )
    stop = next(
        (
            row + SPAN_STEP
            for row in range(min(coarse_stop + reach, image.height - SPAN_STEP), coarse_stop - reach, -SPAN_STEP)
            if _has_all_rules(reader, band, row, SPAN_STEP)
        ),
        coarse_stop,
    )
    return start, stop


def track_rules(ink: np.ndarray, top: int, band: Band, window: int = 500) -> tuple[np.ndarray, np.ndarray]:
    """Gridline positions per sub-window of one chunk."""
    blocks = np.array_split(ink, max(1, len(ink) // window))
    centres = np.cumsum([len(block) for block in blocks]) - np.array([len(block) for block in blocks]) / 2
    positions = np.array([rules.refine(rules.column_density(block), band.prior) for block in blocks])
    return centres + top, positions


RULE_REACH = 15
RULE_SHADOW = 0.3
RULE_PERSISTENCE = 0.4
RULE_SPREAD = 2


def _dilate(mask: np.ndarray, reach: int) -> np.ndarray:
    padded = np.pad(mask, reach)
    return np.logical_or.reduce([padded[shift:shift + mask.size] for shift in range(2 * reach + 1)])


def _rule_columns(evidence: np.ndarray, positions: np.ndarray, low: int, high: int) -> np.ndarray:
    """Columns to treat as printed gridline, measured on this stretch of roll.

    A gridline is dark in nearly every row; a drawn line resting beside one is
    dark in a quarter of them at most. Counting rows rather than averaging
    darkness separates the two, and catches the soft edges, which are lighter
    than the core but just as unbroken. Half a gridline left outside the mask is
    the strongest attractor there is.
    """
    persistence = (evidence > RULE_SHADOW).mean(axis=0)
    columns = np.arange(len(persistence))
    near = np.min(np.abs(columns[:, None] - positions[None, :]), axis=1) <= RULE_REACH
    return _dilate(near & (persistence > RULE_PERSISTENCE), RULE_SPREAD)[low:high]


FLAG_TOLERANCE = 1
INK_EVIDENCE = 0.75
FAINT_EVIDENCE = 0.25
FLAGS = ("ink", "faint", "hole", "rule", "gap", edits.LACUNA, edits.FADED)


def _beside_path(values: np.ndarray, path: np.ndarray) -> np.ndarray:
    """Strongest value at the traced column or immediately beside it."""
    offsets = np.arange(-FLAG_TOLERANCE, FLAG_TOLERANCE + 1)
    columns = np.clip(np.rint(path)[:, None] + offsets[None, :], 0, values.shape[1] - 1).astype(int)
    return values[np.arange(len(path))[:, None], columns].max(axis=1)


def witness_flags(
    layers: segment.Layers, path: np.ndarray, rule_x: np.ndarray, halfwidth: float
) -> np.ndarray:
    """How well each traced point is actually witnessed by the scan."""
    seen = _beside_path(layers.evidence, path)
    on_rule = np.min(np.abs(rule_x - path[:, None]), axis=1) <= halfwidth + 1
    on_hole = _beside_path(layers.hole, path) > 0
    return np.select(
        [on_rule, on_hole, seen >= INK_EVIDENCE, seen >= FAINT_EVIDENCE],
        ["rule", "hole", "ink", "faint"],
        default="gap",
    ).astype("<U8")


def trace_half(
    layers: segment.Layers,
    half: Half,
    positions: np.ndarray,
    costs: trace.Costs,
    pins: dict[int, int] | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Trace one half of one chunk; returns the path and where it came from."""
    window = slice(half.low, half.high)
    cost = trace.build_cost(
        layers.evidence[:, window],
        layers.hole[:, window],
        _rule_columns(layers.evidence, positions, half.low, half.high),
        costs,
    )
    inside = {
        row: column
        for row, column in (pins or {}).items()
        if 0 <= row < len(cost) and 0 <= column < cost.shape[1]
    }
    path = trace.centre_on_run(layers.ink[:, window], trace.least_cost_path(trace.pin(cost, inside), costs.step))
    source = np.full(len(path), edits.TRACED, dtype="<U8")
    for row, column in inside.items():
        path[row], source[row] = column, edits.ANCHORED
    return path + half.low, source


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("druid")
    parser.add_argument("--cache", type=Path, default=Path("cache"))
    parser.add_argument("--out", type=Path, default=Path("out"))
    parser.add_argument("--format", dest="image_format", choices=("png", "jpg"), default="png")
    parser.add_argument("--chunk-rows", type=int, default=8000)
    parser.add_argument("--overlap", type=int, default=1000)
    parser.add_argument("--step-penalty", type=float, default=0.05)
    parser.add_argument("--overlays", type=int, default=10)
    parser.add_argument("--rows", type=int, nargs=2, metavar=("START", "STOP"))
    parser.add_argument("--edits", type=Path, help="corrections to replay (default out/DRUID/edits.json)")
    args = parser.parse_args()

    image = RollImage.open(args.druid, args.cache, args.image_format)
    timing = read_timing(args.druid, args.cache)
    corrections = edits.Edits.load(args.edits or args.out / args.druid / "edits.json")
    if not corrections.is_empty():
        print(f"replaying {len(corrections.anchors)} anchors, {len(corrections.strokes)} strokes, "
              f"{len(corrections.regions)} declared regions")
    band = locate_band(image)
    reader = BandReader(image, band.x, band.width, args.chunk_rows)
    print(f"band x={band.x} width={band.width} gridlines={np.round(band.prior + band.x, 1)}")

    start, stop = args.rows if args.rows else drawn_span(image, reader, band)
    print(f"drawn span rows {start}..{stop} ({stop - start} rows)")

    halves = (
        Half("bass", int(band.prior[rules.PP_BASS]) - 15, int(band.prior[rules.FF]) + 15, calibrate.bass_value),
        Half("treble", int(band.prior[rules.FF]) - 15, int(band.prior[rules.PP_TREBLE]) + 15, calibrate.treble_value),
    )
    costs = trace.Costs(step=args.step_penalty)

    paths = {half.name: [] for half in halves}
    flags = {half.name: [] for half in halves}
    sources = {half.name: [] for half in halves}
    rule_rows, rule_positions = [], []

    for top in range(start, stop, args.chunk_rows):
        head = max(start, top - args.overlap)
        tail = min(stop, top + args.chunk_rows + args.overlap)
        keep = slice(top - head, top - head + min(args.chunk_rows, stop - top))
        layers = segment.separate(reader.rows(head, tail))
        sample_rows, sample_positions = track_rules(layers.ink, head, band)
        kept = (sample_rows >= top) & (sample_rows < top + (keep.stop - keep.start))
        rule_rows.append(sample_rows[kept])
        rule_positions.append(sample_positions[kept])
        track = rules.RuleTrack(sample_rows, sample_positions)
        rule_x = track.at(np.arange(head, tail))
        for half in halves:
            pins = corrections.pins(half.name, range(head, tail), band.x + half.low)
            path, source = trace_half(layers, half, sample_positions.mean(axis=0), costs, pins)
            paths[half.name].append(path[keep])
            flags[half.name].append(witness_flags(layers, path, rule_x, band.rule_halfwidth)[keep])
            sources[half.name].append(source[keep])
        print(f"  rows {top}..{top + keep.stop - keep.start} traced")

    span_rows = np.arange(start, stop)
    track = rules.RuleTrack(np.concatenate(rule_rows), np.concatenate(rule_positions))
    rule_x = track.at(span_rows)
    traced = {name: np.concatenate(pieces) for name, pieces in paths.items()}
    flagged = {name: np.concatenate(pieces) for name, pieces in flags.items()}
    origin = {name: np.concatenate(pieces) for name, pieces in sources.items()}
    for half in halves:
        edits.apply_strokes(corrections, half.name, span_rows, traced[half.name], origin[half.name], band.x)
        edits.apply_regions(corrections, half.name, span_rows, traced[half.name], flagged[half.name], origin[half.name])

    out_dir = args.out / args.druid
    out_dir.mkdir(parents=True, exist_ok=True)
    write_curves(out_dir / "curves.csv", span_rows, timing, band, traced, flagged, origin, rule_x, halves)
    write_rules(out_dir / "rules.csv", span_rows, band, rule_x)
    coverage = {
        name: {flag: float(np.mean(values == flag)) for flag in FLAGS}
        for name, values in flagged.items()
    }
    write_meta(out_dir / "meta.json", args, image, band, timing, (start, stop), coverage, halves, corrections)
    write_overlays(out_dir / "overlay", reader, band, span_rows, traced, rule_x, flagged, args.overlays)

    for name, shares in coverage.items():
        print(f"{name}: " + "  ".join(f"{flag} {share:.1%}" for flag, share in shares.items()))
    print(f"wrote {out_dir}")


CURVE_COLUMNS = [
    "y_px", "tick", "seconds",
    "bass_x", "bass_value", "bass_flag", "bass_source",
    "treble_x", "treble_value", "treble_flag", "treble_source",
]


def write_curves(path, span_rows, timing, band, traced, flagged, origin, rule_x, halves) -> None:
    absolute = {name: values + band.x for name, values in traced.items()}
    values = {half.name: half.value_of(traced[half.name], rule_x) for half in halves}
    with path.open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(CURVE_COLUMNS)
        writer.writerows(
            zip(
                span_rows,
                timing.ticks(span_rows),
                np.round(timing.seconds(span_rows), 4),
                np.round(absolute["bass"], 2),
                np.round(values["bass"], 5),
                flagged["bass"],
                origin["bass"],
                np.round(absolute["treble"], 2),
                np.round(values["treble"], 5),
                flagged["treble"],
                origin["treble"],
            )
        )


def write_rules(path, span_rows, band, rule_x, every: int = 100) -> None:
    with path.open("w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["y_px", "pp_bass", "mf_bass", "ff", "mf_treble", "pp_treble"])
        writer.writerows(
            [row, *np.round(columns + band.x, 2)] for row, columns in zip(span_rows[::every], rule_x[::every])
        )


def write_meta(path, args, image, band, timing, span, coverage, halves, corrections) -> None:
    path.write_text(
        json.dumps(
            {
                "druid": args.druid,
                "image": {"width": image.width, "height": image.height, "format": args.image_format},
                "band": {"x": band.x, "width": band.width},
                "gridlines_x": [round(float(value + band.x), 2) for value in band.prior],
                "rule_halfwidth_px": round(band.rule_halfwidth, 2),
                "halves": {half.name: {"low_x": half.low + band.x, "high_x": half.high + band.x} for half in halves},
                "drawn_span_rows": list(span),
                "trace": {"step_penalty": args.step_penalty, "chunk_rows": args.chunk_rows, "overlap": args.overlap},
                "timing": {"source": timing.source, "first_hole": timing.first_hole},
                "roll_metadata": timing.metadata,
                "coverage": coverage,
                "edits": {
                    "anchors": len(corrections.anchors),
                    "strokes": len(corrections.strokes),
                    "regions": len(corrections.regions),
                },
                "scale": "0.0 = P.P. gridline of the half, 0.5 = M.F., 1.0 = shared F.F.",
            },
            indent=2,
            ensure_ascii=False,
        )
    )


def write_overlays(directory, reader, band, span_rows, traced, rule_x, flagged, count) -> None:
    if count <= 0:
        return
    start, stop = span_rows[0], span_rows[-1] + 1
    evenly = np.linspace(start, max(start, stop - OVERLAY_ROWS), count).astype(int)
    doubtful = _worst_windows(flagged, span_rows, OVERLAY_ROWS, 4)
    for top in sorted(set(evenly.tolist()) | set(doubtful)):
        rows = slice(top - start, min(top - start + OVERLAY_ROWS, len(span_rows)))
        overlay.render(
            reader.rows(top, top + (rows.stop - rows.start)),
            traced["bass"][rows],
            traced["treble"][rows],
            rule_x[rows],
            directory / f"{top:06d}.png",
        )


def _worst_windows(flagged, span_rows, window, count) -> list[int]:
    doubt = sum(np.isin(flagged[half], ("gap", "rule")).astype(float) for half in flagged)
    blocks = np.array_split(doubt, max(1, len(doubt) // window))
    scores = np.array([block.mean() for block in blocks])
    offsets = np.cumsum([0] + [len(block) for block in blocks[:-1]])
    return [int(span_rows[0] + offsets[i]) for i in np.argsort(scores)[-count:]]


if __name__ == "__main__":
    main()
