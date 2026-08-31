"""Roll geometry and the time axis, taken from Stanford's SUPRA raw MIDI.

In those files one MIDI tick is one pixel row of the scan, tick zero sits at
FIRST_HOLE, and the tempo map already carries the take-up spool's acceleration.
"""

from __future__ import annotations

import re
import struct
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .iiif import fetch

SUPRA_RAW = "https://raw.githubusercontent.com/pianoroll/SUPRA/master/welte-red/midi-raw/{druid}_raw.mid"
METADATA = re.compile(r"@([A-Z_]+):\s*(.*)")
TEXT_META = frozenset({0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07})
SET_TEMPO = 0x51


@dataclass(frozen=True)
class RollTiming:
    """Pixel row to seconds, via the roll's own tempo map."""

    first_hole: int
    tempo_rows: np.ndarray
    tempo_seconds: np.ndarray
    rows_per_second: np.ndarray
    metadata: dict[str, str]
    source: str

    def seconds(self, rows: np.ndarray) -> np.ndarray:
        index = np.clip(np.searchsorted(self.tempo_rows, rows, side="right") - 1, 0, None)
        return self.tempo_seconds[index] + (rows - self.tempo_rows[index]) / self.rows_per_second[index]

    def ticks(self, rows: np.ndarray) -> np.ndarray:
        return rows - self.first_hole


def _variable_length(data: bytes, position: int) -> tuple[int, int]:
    value = 0
    while True:
        byte = data[position]
        position += 1
        value = (value << 7) | (byte & 0x7F)
        if not byte & 0x80:
            return value, position


def _meta_events(data: bytes) -> list[tuple[int, int, bytes]]:
    """Every meta event in the file, as (tick, kind, payload)."""
    events: list[tuple[int, int, bytes]] = []
    tracks = struct.unpack(">H", data[10:12])[0]
    position = 8 + struct.unpack(">I", data[4:8])[0]
    for _ in range(tracks):
        length = struct.unpack(">I", data[position + 4:position + 8])[0]
        position, end, tick, status = position + 8, position + 8 + length, 0, 0
        while position < end:
            delta, position = _variable_length(data, position)
            tick += delta
            marker = data[position]
            if marker == 0xFF:
                kind = data[position + 1]
                size, position = _variable_length(data, position + 2)
                events.append((tick, kind, data[position:position + size]))
                position += size
            elif marker in (0xF0, 0xF7):
                size, position = _variable_length(data, position + 1)
                position += size
            else:
                if marker & 0x80:
                    status = marker
                    position += 1
                position += 1 if (status & 0xF0) in (0xC0, 0xD0) else 2
    return events


def _roll_metadata(events: list[tuple[int, int, bytes]]) -> dict[str, str]:
    pairs = (
        METADATA.match(payload.decode("utf-8", "replace").strip())
        for _, kind, payload in events
        if kind in TEXT_META
    )
    return {match.group(1): match.group(2).strip() for match in pairs if match}


def read_timing(druid: str, cache_dir: Path) -> RollTiming:
    path = cache_dir / druid / f"{druid}_raw.mid"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(fetch(SUPRA_RAW.format(druid=druid)))
    data = path.read_bytes()

    division = struct.unpack(">H", data[12:14])[0]
    events = _meta_events(data)
    metadata = _roll_metadata(events)
    first_hole = int(metadata["FIRST_HOLE"].rstrip("px"))

    tempos = sorted((tick, int.from_bytes(payload, "big")) for tick, kind, payload in events if kind == SET_TEMPO)
    ticks = np.array([tick for tick, _ in tempos], dtype=np.float64)
    rows_per_second = np.array([division * 1e6 / micros for _, micros in tempos])
    seconds = np.concatenate(([0.0], np.cumsum(np.diff(ticks) / rows_per_second[:-1])))
    return RollTiming(
        first_hole=first_hole,
        tempo_rows=ticks + first_hole,
        tempo_seconds=seconds,
        rows_per_second=rows_per_second,
        metadata=metadata,
        source=str(path),
    )
