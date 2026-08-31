"""Loading the two sources that the empirical work compares.

The drawn curve comes from `out/<druid>/curves.csv`, one row per pixel row of
the scan; the punched expression code comes from the SUPRA raw MIDI, where one
tick is one pixel row and tick zero sits at FIRST_HOLE.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from nuance.supra import read_timing  # noqa: E402

DRUID = "jq774vx6544"
OBSERVED = ("ink", "faint")

EXPRESSION_CODES = {
    "bass": {
        14: "mf_off",
        15: "mf_on",
        16: "cresc_off",
        17: "cresc_on",
        18: "sforz_off",
        19: "sforz_on",
        20: "soft_pedal_off",
        21: "soft_pedal_on",
        22: "motor_off",
        23: "motor_on",
    },
    "treble": {
        104: "rewind",
        105: "electric_cutoff",
        106: "sustain_on",
        107: "sustain_off",
        108: "sforz_on",
        109: "sforz_off",
        110: "cresc_on",
        111: "cresc_off",
        112: "mf_on",
        113: "mf_off",
    },
}

EXPRESSION_TRACK = {3: "bass", 4: "treble"}
NOTE_TRACK = {1: "bass", 2: "treble"}


@dataclass(frozen=True)
class Event:
    half: str
    code: int
    name: str
    tick_on: int
    tick_off: int
    y_px_on: int
    y_px_off: int
    sec_on: float
    sec_off: float

    @property
    def duration_ticks(self) -> int:
        return self.tick_off - self.tick_on

    @property
    def duration_ms(self) -> float:
        return 1000.0 * (self.sec_off - self.sec_on)


@dataclass(frozen=True)
class Curve:
    """One half's drawn line, sampled on the scan's pixel rows."""

    half: str
    y_px: np.ndarray
    seconds: np.ndarray
    value: np.ndarray
    flag: np.ndarray

    @property
    def observed(self) -> np.ndarray:
        return np.isin(self.flag, OBSERVED)

    def masked(self) -> np.ndarray:
        """Values with interpolated rows replaced by NaN."""
        out = self.value.astype(np.float64).copy()
        out[~self.observed] = np.nan
        return out


def _absolute_note_events(track) -> list[tuple[int, int, bool]]:
    tick = 0
    out = []
    for msg in track:
        tick += msg.time
        if msg.type == "note_on":
            out.append((tick, msg.note, msg.velocity > 0))
    return out


def _pair(events: list[tuple[int, int, bool]]) -> list[tuple[int, int, int]]:
    """(note, tick_on, tick_off) from interleaved note on/off events."""
    open_at: dict[int, int] = {}
    paired = []
    for tick, note, is_on in events:
        if is_on:
            open_at[note] = tick
        elif note in open_at:
            paired.append((note, open_at.pop(note), tick))
    return sorted(paired, key=lambda p: (p[1], p[0]))


def load_timing():
    return read_timing(DRUID, ROOT / "cache")


def load_events(timing) -> list[Event]:
    import mido

    midi = mido.MidiFile(ROOT / "cache" / DRUID / f"{DRUID}_raw.mid")
    events: list[Event] = []
    for index, half in EXPRESSION_TRACK.items():
        codes = EXPRESSION_CODES[half]
        for note, tick_on, tick_off in _pair(_absolute_note_events(midi.tracks[index])):
            rows = np.array([tick_on, tick_off], dtype=np.float64) + timing.first_hole
            sec_on, sec_off = timing.seconds(rows)
            events.append(
                Event(
                    half=half,
                    code=note,
                    name=codes.get(note, f"key_{note}"),
                    tick_on=tick_on,
                    tick_off=tick_off,
                    y_px_on=int(rows[0]),
                    y_px_off=int(rows[1]),
                    sec_on=float(sec_on),
                    sec_off=float(sec_off),
                )
            )
    return sorted(events, key=lambda e: (e.tick_on, e.half, e.code))


def load_notes(timing) -> dict[str, np.ndarray]:
    """Note onsets in seconds, per half."""
    import mido

    midi = mido.MidiFile(ROOT / "cache" / DRUID / f"{DRUID}_raw.mid")
    out = {}
    for index, half in NOTE_TRACK.items():
        onsets = np.array(
            [tick_on for _, tick_on, _ in _pair(_absolute_note_events(midi.tracks[index]))],
            dtype=np.float64,
        )
        out[half] = timing.seconds(onsets + timing.first_hole)
    return out


def load_curves() -> dict[str, Curve]:
    frame = pd.read_csv(ROOT / "out" / DRUID / "curves.csv")
    return {
        half: Curve(
            half=half,
            y_px=frame["y_px"].to_numpy(),
            seconds=frame["seconds"].to_numpy(),
            value=frame[f"{half}_value"].to_numpy(),
            flag=frame[f"{half}_flag"].to_numpy(),
        )
        for half in ("bass", "treble")
    }
