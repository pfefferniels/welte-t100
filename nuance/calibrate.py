"""Turning a traced pixel column into a position on the printed dynamic scale.

0.0 is the half's P.P. gridline, 1.0 the shared F.F. line in the middle, and the
M.F. line is taken as the value in between it is labelled with. On this roll the
M.F. line sits at the geometric midpoint of the P.P.-F.F. span, so the piecewise
mapping is very nearly linear; the raw pixel column is kept in the output so any
other reading of the scale stays derivable.
"""

from __future__ import annotations

import numpy as np

from .rules import FF, MF_BASS, MF_TREBLE, PP_BASS, PP_TREBLE

MF_VALUE = 0.5


def _piecewise(x: np.ndarray, pp: np.ndarray, mf: np.ndarray, ff: np.ndarray) -> np.ndarray:
    """Scale position, measured as a fraction of the P.P. to F.F. span."""
    span = (x - pp) / (ff - pp)
    at_mf = (mf - pp) / (ff - pp)
    below = MF_VALUE * span / at_mf
    above = MF_VALUE + MF_VALUE * (span - at_mf) / (1.0 - at_mf)
    return np.where(span < at_mf, below, above)


def bass_value(x: np.ndarray, rules: np.ndarray) -> np.ndarray:
    return _piecewise(x, rules[:, PP_BASS], rules[:, MF_BASS], rules[:, FF])


def treble_value(x: np.ndarray, rules: np.ndarray) -> np.ndarray:
    return _piecewise(x, rules[:, PP_TREBLE], rules[:, MF_TREBLE], rules[:, FF])
