#!/usr/bin/env python3
"""A local app for correcting a traced roll by hand.

    ./correct.py jq774vx6544

Serves a page that pulls the scan straight from IIIF, so nothing large has to
be on disk. Anchors are re-traced against the pixels of the stretch they touch,
which is fetched on demand; strokes replace the trace outright. Corrections are
kept in out/DRUID/edits.json and replayed by trace_roll.py.
"""

from __future__ import annotations

import argparse
import json
import webbrowser
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np

import trace_roll as tracer
from nuance import calibrate, edits, rules, segment, trace
from nuance.iiif import BandReader, RollImage
from nuance.supra import RollTiming, read_timing

WEB = Path(__file__).parent / "web"
RETRACE_MARGIN = 1200
RETRACE_OVERLAP = 1200
SUSPECT_MINIMUM = 40
UNWITNESSED = ("gap", "rule")


@dataclass
class Session:
    """One roll, its trace and its corrections, held in memory while editing."""

    druid: str
    out_dir: Path
    image: RollImage
    band: tracer.Band
    halves: tuple[tracer.Half, ...]
    timing: RollTiming
    reader: BandReader
    rows: np.ndarray
    rule_x: np.ndarray
    x: dict[str, np.ndarray]
    flag: dict[str, np.ndarray]
    source: dict[str, np.ndarray]
    records: list[dict] = field(default_factory=list)
    _next_id: int = 1

    @property
    def start(self) -> int:
        return int(self.rows[0])

    @property
    def stop(self) -> int:
        return int(self.rows[-1]) + 1

    def as_edits(self) -> edits.Edits:
        return edits.Edits(
            anchors=tuple(
                edits.Anchor(r["half"], int(r["y"]), float(r["x"]))
                for r in self.records
                if r["kind"] == "anchor"
            ),
            strokes=tuple(
                edits.Stroke(r["half"], tuple((int(y), float(x)) for y, x in r["points"]))
                for r in self.records
                if r["kind"] == "stroke"
            ),
            regions=tuple(
                edits.Region(r["half"], int(r["start"]), int(r["stop"]), r["state"])
                for r in self.records
                if r["kind"] == "region"
            ),
            druid=self.druid,
        )

    def add(self, record: dict) -> tuple[int, int]:
        _validate(record)
        record["id"] = self._next_id
        self._next_id += 1
        self.records.append(record)
        return self._affected(record)

    def remove(self, edit_id: int) -> tuple[int, int]:
        record = next(r for r in self.records if r["id"] == edit_id)
        self.records.remove(record)
        return self._affected(record)

    def _affected(self, record: dict) -> tuple[int, int]:
        if record["kind"] == "anchor":
            ys = [record["y"]]
        elif record["kind"] == "stroke":
            ys = [y for y, _ in record["points"]]
        else:
            ys = [record["start"], record["stop"] - 1]
        return (
            max(self.start, min(ys) - RETRACE_MARGIN),
            min(self.stop, max(ys) + RETRACE_MARGIN + 1),
        )

    def retrace(self, start: int, stop: int) -> None:
        """Trace one stretch again with the current corrections in force."""
        start, stop = max(self.start, start), min(self.stop, stop)
        head = max(self.start, start - RETRACE_OVERLAP)
        tail = min(self.stop, stop + RETRACE_OVERLAP)
        corrections = self.as_edits()
        layers = segment.separate(self.reader.rows(head, tail))
        sample_rows, positions = tracer.track_rules(layers.ink, head, self.band)
        rule_x = rules.RuleTrack(sample_rows, positions).at(np.arange(head, tail))
        keep = slice(start - head, stop - head)
        target = slice(start - self.start, stop - self.start)
        for half in self.halves:
            pins = corrections.pins(half.name, range(head, tail), self.band.x + half.low)
            path, source = tracer.trace_half(layers, half, positions.mean(axis=0), trace.Costs(), pins)
            flags = tracer.witness_flags(layers, path, rule_x, self.band.rule_halfwidth)
            self.x[half.name][target] = path[keep]
            self.flag[half.name][target] = flags[keep]
            self.source[half.name][target] = source[keep]
        self.reapply(corrections)

    def reapply(self, corrections: edits.Edits) -> None:
        """Lay strokes and declared regions over the whole roll.

        Over the whole roll rather than the retraced window, so that a lacuna
        can be bridged from the values on either side of it even when those lie
        outside the stretch just traced.
        """
        for half in self.halves:
            edits.apply_strokes(
                corrections, half.name, self.rows, self.x[half.name], self.source[half.name], self.band.x
            )
            edits.apply_regions(
                corrections, half.name, self.rows, self.x[half.name], self.flag[half.name], self.source[half.name]
            )

    def window(self, start: int, stop: int, step: int) -> dict:
        start, stop = max(self.start, start), min(self.stop, stop)
        picked = slice(start - self.start, stop - self.start, step)
        return {
            "start": start,
            "stop": stop,
            "step": step,
            "y": self.rows[picked].tolist(),
            **{
                half.name: {
                    "x": np.round(self.x[half.name][picked] + self.band.x, 2).tolist(),
                    "value": np.round(half.value_of(self.x[half.name][picked], self.rule_x[picked]), 4).tolist(),
                    "flag": self.flag[half.name][picked].tolist(),
                    "source": self.source[half.name][picked].tolist(),
                }
                for half in self.halves
            },
        }

    def suspects(self) -> list[dict]:
        found = []
        for half in self.halves:
            doubtful = np.isin(self.flag[half.name], UNWITNESSED)
            edges = np.flatnonzero(np.diff(np.concatenate(([0], doubtful.view(np.int8), [0]))))
            found += [
                {
                    "half": half.name,
                    "start": int(self.rows[a]),
                    "stop": int(self.rows[b - 1]) + 1,
                    "rows": int(b - a),
                    "seconds": round(float(self.timing.seconds(self.rows[a])), 1),
                }
                for a, b in zip(edges[::2], edges[1::2])
                if b - a >= SUSPECT_MINIMUM
            ]
        return sorted(found, key=lambda run: -run["rows"])

    def save(self) -> dict:
        self.as_edits().save(self.out_dir / "edits.json")
        tracer.write_curves(
            self.out_dir / "curves.csv",
            self.rows,
            self.timing,
            self.band,
            self.x,
            self.flag,
            self.source,
            self.rule_x,
            self.halves,
        )
        return {"edits": str(self.out_dir / "edits.json"), "curves": str(self.out_dir / "curves.csv")}


def _validate(record: dict) -> None:
    """Build the matching edit so a bad one is refused before it is stored."""
    kind = record.get("kind")
    if kind == "anchor":
        edits.Anchor(record["half"], int(record["y"]), float(record["x"]))
    elif kind == "stroke":
        edits.Stroke(record["half"], tuple((int(y), float(x)) for y, x in record["points"]))
    elif kind == "region":
        edits.Region(record["half"], int(record["start"]), int(record["stop"]), record["state"])
    else:
        raise edits.EditError(f"unknown kind of correction {kind!r}")


def _column(table: np.ndarray, name: str, fallback) -> np.ndarray:
    return table[name] if name in table.dtype.names else np.full(len(table), fallback)


def open_session(druid: str, out: Path, cache: Path, image_format: str, chunk_rows: int) -> Session:
    out_dir = out / druid
    meta = json.loads((out_dir / "meta.json").read_text())
    gridlines = np.array(meta["gridlines_x"])
    band = tracer.Band(
        x=meta["band"]["x"],
        width=meta["band"]["width"],
        prior=gridlines - meta["band"]["x"],
        rule_halfwidth=meta["rule_halfwidth_px"],
    )
    halves = (
        tracer.Half("bass", int(band.prior[rules.PP_BASS]) - 15, int(band.prior[rules.FF]) + 15, calibrate.bass_value),
        tracer.Half("treble", int(band.prior[rules.FF]) - 15, int(band.prior[rules.PP_TREBLE]) + 15, calibrate.treble_value),
    )
    curves = np.genfromtxt(out_dir / "curves.csv", delimiter=",", names=True, dtype=None, encoding="utf-8")
    ruled = np.genfromtxt(out_dir / "rules.csv", delimiter=",", names=True)
    rows = curves["y_px"].astype(int)
    rule_x = np.stack(
        [np.interp(rows, ruled["y_px"], ruled[name]) - band.x for name in ruled.dtype.names[1:]], axis=1
    )
    image = RollImage.open(druid, cache, image_format)
    session = Session(
        druid=druid,
        out_dir=out_dir,
        image=image,
        band=band,
        halves=halves,
        timing=read_timing(druid, cache),
        reader=BandReader(image, band.x, band.width, chunk_rows),
        rows=rows,
        rule_x=rule_x,
        x={h.name: curves[f"{h.name}_x"] - band.x for h in halves},
        flag={h.name: curves[f"{h.name}_flag"].astype("<U8") for h in halves},
        source={h.name: _column(curves, f"{h.name}_source", edits.TRACED).astype("<U8") for h in halves},
    )
    stored = edits.Edits.load(out_dir / "edits.json")
    for anchor in stored.anchors:
        session.add({"kind": "anchor", "half": anchor.half, "y": anchor.y, "x": anchor.x})
    for stroke in stored.strokes:
        session.add({"kind": "stroke", "half": stroke.half, "points": [list(p) for p in stroke.points]})
    for region in stored.regions:
        session.add(
            {"kind": "region", "half": region.half, "start": region.start, "stop": region.stop, "state": region.state}
        )
    session.reapply(stored)
    return session


class Handler(BaseHTTPRequestHandler):
    session: Session

    def log_message(self, *args) -> None:
        pass

    def _send(self, body: bytes, kind: str, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _json(self, payload: dict, status: int = 200) -> None:
        self._send(json.dumps(payload).encode(), "application/json", status)

    def _static(self, name: str) -> None:
        path = WEB / name
        kinds = {".html": "text/html", ".js": "text/javascript", ".css": "text/css"}
        if not path.is_file() or path.parent != WEB:
            self._json({"error": "not found"}, 404)
            return
        self._send(path.read_bytes(), kinds.get(path.suffix, "text/plain") + "; charset=utf-8")

    def do_GET(self) -> None:
        path, _, query = self.path.partition("?")
        params = dict(pair.split("=", 1) for pair in query.split("&") if "=" in pair)
        if path == "/":
            self._static("index.html")
        elif path in ("/app.js", "/app.css"):
            self._static(path.lstrip("/"))
        elif path == "/api/state":
            self._json(self._state())
        elif path == "/api/curve":
            self._json(
                self.session.window(
                    int(params.get("start", self.session.start)),
                    int(params.get("stop", self.session.start + 2000)),
                    max(1, int(params.get("step", 1))),
                )
            )
        else:
            self._json({"error": "not found"}, 404)

    def do_POST(self) -> None:
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        try:
            if self.path == "/api/edits":
                start, stop = self.session.add(body)
            elif self.path == "/api/edits/delete":
                start, stop = self.session.remove(int(body["id"]))
            elif self.path == "/api/save":
                self._json(self.session.save())
                return
            else:
                self._json({"error": "not found"}, 404)
                return
        except (edits.EditError, KeyError, StopIteration, ValueError) as problem:
            self._json({"error": str(problem) or problem.__class__.__name__}, 400)
            return
        self.session.retrace(start, stop)
        self._json({"edits": self.session.records, "changed": [start, stop], "suspects": self.session.suspects()})

    def _state(self) -> dict:
        session = self.session
        return {
            "druid": session.druid,
            "iiif": session.image.base_url,
            "band": {"x": session.band.x, "width": session.band.width},
            "gridlines": [round(float(g + session.band.x), 2) for g in session.band.prior],
            "span": [session.start, session.stop],
            "halves": {h.name: {"low": h.low + session.band.x, "high": h.high + session.band.x} for h in session.halves},
            "edits": session.records,
            "suspects": session.suspects(),
        }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("druid")
    parser.add_argument("--out", type=Path, default=Path("out"))
    parser.add_argument("--cache", type=Path, default=Path("cache"))
    parser.add_argument("--format", dest="image_format", choices=("png", "jpg"), default="png")
    parser.add_argument("--chunk-rows", type=int, default=8000, help="match trace_roll.py to reuse its cache")
    parser.add_argument("--port", type=int, default=8731)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    Handler.session = open_session(args.druid, args.out, args.cache, args.image_format, args.chunk_rows)
    address = f"http://localhost:{args.port}/"
    print(f"{args.druid}: rows {Handler.session.start}..{Handler.session.stop}, "
          f"{len(Handler.session.suspects())} suspect stretches")
    print(f"serving {address}  (ctrl-c to stop)")
    if not args.no_browser:
        webbrowser.open(address)
    with ThreadingHTTPServer(("127.0.0.1", args.port), Handler) as server:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == "__main__":
    main()
