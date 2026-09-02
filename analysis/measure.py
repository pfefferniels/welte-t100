#!/usr/bin/env python3
"""Every number reported in emulator/docs/empirics.md.

Run from this directory. Writes emulator/data/measurements.json and prints a
readable summary; the figures are drawn by figures.py from the same helpers.
"""

from __future__ import annotations

import json
import warnings
from collections import Counter, defaultdict

import numpy as np

import conductance
import coupling
import dataset
import episodes
import hook
import lag
import latching
import models
import phase
import pinfaces
import roworigin
import timeline

warnings.filterwarnings("ignore", category=RuntimeWarning)

HALVES = ("bass", "treble")
BRIDGE_TICKS = 29  # SUPRA's own bridge factor 1.37 times the 20.9 px average hole width

# Rails and Mezzoforte level are measured below; these seed the episode cutting
# and are checked against the measurement.
SEED_RAILS = {"bass": (0.017, 0.915), "treble": (0.021, 0.951)}
SEED_MF = {"bass": 0.578, "treble": 0.622}

FAST_SPECS = {
    "fast_crescendo": ("sforz_on", +1, 0.6, lambda cresc, sforz, mf: not sforz),
    "fast_decrescendo": ("sforz_off", -1, 1.5, lambda cresc, sforz, mf: sforz),
}
SLOW_STATES = {
    "slow_crescendo": lambda cresc, sforz: cresc & ~sforz,
    "slow_decrescendo": lambda cresc, sforz: ~cresc & ~sforz,
}


def inventory(events) -> dict:
    """Counts and lengths of every code, before and after joining bridges."""
    out: dict[str, dict] = {}
    for half in HALVES:
        per_code: dict[str, dict] = {}
        names = sorted({e.name for e in events if e.half == half})
        for name in names:
            punches = [e for e in events if e.half == half and e.name == name]
            ticks = np.array([e.duration_ticks for e in punches])
            millis = np.array([e.duration_ms for e in punches])
            slots, parts = [], []
            for punch in punches:
                if slots and punch.tick_on - slots[-1][1] <= BRIDGE_TICKS:
                    slots[-1][1] = punch.tick_off
                    slots[-1][2] += 1
                else:
                    slots.append([punch.tick_on, punch.tick_off, 1])
                    parts.append(punch)
            slot_ticks = np.array([stop - start for start, stop, _ in slots])
            per_code[name] = {
                "punches": len(punches),
                "slots_after_joining_bridges": len(slots),
                "chained_slots": int(sum(1 for *_, n in slots if n > 1)),
                "punch_ticks": {
                    "median": float(np.median(ticks)),
                    "p10": float(np.percentile(ticks, 10)),
                    "p90": float(np.percentile(ticks, 90)),
                    "max": int(ticks.max()),
                },
                "punch_ms": {
                    "median": float(np.median(millis)),
                    "p10": float(np.percentile(millis, 10)),
                    "p90": float(np.percentile(millis, 90)),
                    "max": float(millis.max()),
                },
                "slot_ticks_median": float(np.median(slot_ticks)),
            }
        out[half] = per_code
    return out


def rails(curves) -> dict:
    """Where the line comes to rest, which is what a mechanical stop looks like."""
    out = {}
    for half in HALVES:
        curve = curves[half]
        value, seconds = curve.masked(), curve.seconds
        window = 15
        rate = np.full(value.shape, np.nan)
        rate[window:-window] = (value[2 * window :] - value[: -2 * window]) / (
            seconds[2 * window :] - seconds[: -2 * window]
        )
        resting = np.isfinite(value) & np.isfinite(rate) & (np.abs(rate) < 0.08)
        seen = np.isfinite(value)

        bins = np.arange(-0.06, 1.121, 0.005)
        histogram, edges = np.histogram(value[resting], bins=bins)
        centres = 0.5 * (edges[:-1] + edges[1:])
        low_mode = float(centres[np.argmax(np.where(centres < 0.25, histogram, 0))])
        high_mode = float(centres[np.argmax(np.where(centres > 0.75, histogram, 0))])
        observed = value[seen]
        out[half] = {
            "n_observed": int(observed.size),
            "p_rail": low_mode,
            "f_rail": high_mode,
            "span": high_mode - low_mode,
            "resting_fraction": float(resting.sum() / seen.sum()),
            "at_p_rail_fraction": float(np.mean(np.abs(observed - low_mode) < 0.02)),
            "at_f_rail_fraction": float(np.mean(np.abs(observed - high_mode) < 0.02)),
            "quantiles": {str(q): float(np.percentile(observed, q)) for q in (0.1, 1, 5, 50, 95, 99, 99.9)},
            "min": float(observed.min()),
            "max": float(observed.max()),
        }
    return out


def mezzoforte(curves, events, lead_ms: dict) -> dict:
    out = {}
    for half in HALVES:
        curve = curves[half]
        value, seconds = curve.masked(), curve.seconds
        engaged = timeline.latch_state(events, half, "mf", seconds + lead_ms[half] / 1000.0)
        window = 15
        rate = np.full(value.shape, np.nan)
        rate[window:-window] = (value[2 * window :] - value[: -2 * window]) / (
            seconds[2 * window :] - seconds[: -2 * window]
        )
        flat = np.isfinite(value) & np.isfinite(rate) & (np.abs(rate) < 0.08)
        plateau = flat & engaged & (value > 0.45) & (value < 0.78)

        # One value per visit to the plateau, so the interval is not inflated by
        # the autocorrelation of 1.7 ms samples.
        breaks = np.flatnonzero(np.diff(np.concatenate(([0], plateau.view(np.int8), [0]))))
        visits = np.array(
            [np.nanmedian(value[start:stop]) for start, stop in zip(breaks[::2], breaks[1::2]) if stop - start > 30]
        )
        rng = np.random.default_rng(0)
        draws = np.median(rng.choice(visits, size=(4000, visits.size)), axis=1)

        seen = np.isfinite(value)
        level = float(np.median(visits))
        out[half] = {
            "level": level,
            "ci95": [float(np.percentile(draws, 2.5)), float(np.percentile(draws, 97.5))],
            "visits": int(visits.size),
            "visit_sd": float(np.std(visits)),
            "rows_on_plateau": int(plateau.sum()),
            "printed_mf": 0.5,
            "offset_from_printed": level - 0.5,
            "engaged_below_level": float(np.mean(value[engaged & seen] < level - 0.02)),
            "engaged_within": float(np.mean(np.abs(value[engaged & seen] - level) <= 0.02)),
            "engaged_above": float(np.mean(value[engaged & seen] > level + 0.02)),
            "released_within": float(np.mean(np.abs(value[~engaged & seen] - level) <= 0.02)),
            "engaged_fraction_of_roll": float(np.mean(engaged)),
        }
    return out


def lead(curves, events) -> dict:
    offsets = np.arange(-400.0, 401.0, 5.0)
    out = {}
    for half in HALVES:
        curve = curves[half]
        contrast = lag.state_slope_contrast(curve, events, half, offsets)
        global_peaks = {name: -lag.peak_offset(offsets, values) for name, values in contrast.items()}

        falls = lag.turning_points(curve, 3.0, -1)
        rises = lag.turning_points(curve, 1.5, +1)
        marks = {}
        for label, points, code in (("fall_vs_sforz_off", falls, "sforz_off"), ("rise_vs_sforz_on", rises, "sforz_on")):
            punches = np.array([e.sec_on for e in events if e.half == half and e.name == code])
            offset = -lag.nearest_offsets(points, punches, 300.0)
            low, high = lag.bootstrap_median(offset)
            marks[label] = {
                "n": int(offset.size),
                "median_ms": float(np.median(offset)),
                "ci95_ms": [low, high],
                "iqr_ms": float(np.percentile(offset, 75) - np.percentile(offset, 25)),
            }

        # The same fall offsets expressed as paper distance, to tell a fixed
        # distance on the roll from a fixed delay in time.
        punches = np.array([e.sec_on for e in events if e.half == half and e.name == "sforz_off"])
        index = np.searchsorted(punches, falls)
        below = punches[np.clip(index - 1, 0, punches.size - 1)]
        above = punches[np.clip(index, 0, punches.size - 1)]
        nearer = np.where(np.abs(falls - below) <= np.abs(falls - above), below, above)
        keep = np.abs(falls - nearer) < 0.25
        rows = np.interp(nearer[keep], curve.seconds, curve.y_px) - np.interp(falls[keep], curve.seconds, curve.y_px)
        thirds = np.quantile(falls[keep], [0.0, 1 / 3, 2 / 3, 1.0])
        drift = []
        for start, stop in zip(thirds[:-1], thirds[1:]):
            inside = (falls[keep] >= start) & (falls[keep] <= stop)
            drift.append(
                {
                    "from_s": float(start),
                    "to_s": float(stop),
                    "median_px": float(np.median(rows[inside])),
                    "median_ms": float(np.median(1000.0 * (nearer[keep][inside] - falls[keep][inside]))),
                }
            )
        out[half] = {
            "global_state_scan_ms": global_peaks,
            "change_points": marks,
            "fall_offset_px": {
                "median": float(np.median(rows)),
                "iqr": float(np.percentile(rows, 75) - np.percentile(rows, 25)),
            },
            "drift_thirds": drift,
        }
    return out


def slow_states(curves, events, lead_ms: dict, rail_levels: dict, margin: float = 0.03) -> dict:
    out: dict[str, dict] = {}
    for half in HALVES:
        per_state = {}
        low, high = rail_levels[half]
        sample = phase.samples(curves[half], events, half, lead_ms[half], window=60, settle_ms=250.0)
        free = (sample.value > low + margin) & (sample.value < high - margin)
        for name, predicate in SLOW_STATES.items():
            take = predicate(sample.cresc, sample.sforz) & ~sample.mf & free
            centre, median, spread, count = models.profile(
                sample.value[take], sample.rate[take], np.arange(0.0, 1.0001, 0.05), min_count=40
            )
            if centre.size < 4:
                per_state[name] = {"n": int(take.sum()), "note": "too few level bins"}
                continue
            fits = models.fit_all(centre, median, count)
            per_state[name] = {
                "n": int(take.sum()),
                "bins": int(centre.size),
                "profile": {"level": centre.tolist(), "rate": median.tolist(), "count": count.tolist(), "iqr": spread.tolist()},
                "fits": fits,
                "best": models.best(fits),
            }
        out[half] = per_state
    return out


def fast_states(curves, events, lead_ms: dict, rail_levels: dict, mf_levels: dict) -> dict:
    out: dict[str, dict] = {}
    pooled: dict[tuple[str, str], tuple[np.ndarray, np.ndarray]] = {}
    for half in HALVES:
        per_state = {}
        for name, (trigger, sign, onset_rate, require) in FAST_SPECS.items():
            found = episodes.extract(
                curves[half],
                events,
                half,
                trigger,
                sign,
                rail_levels[half],
                mf_levels[half],
                lead_ms[half],
                require=require,
                onset_rate=onset_rate,
            )
            levels, rates, elapsed = [], [], []
            for episode in found:
                if episode.v.size < 12:
                    continue
                step = 3
                rates.append(
                    (episode.v[2 * step :] - episode.v[: -2 * step]) / (episode.t[2 * step :] - episode.t[: -2 * step])
                )
                levels.append(episode.v[step:-step])
                elapsed.append(episode.t[step:-step])
            if not levels:
                per_state[name] = {"episodes": len(found), "note": "no usable episodes"}
                continue
            level = np.concatenate(levels)
            rate = np.concatenate(rates)
            since = np.concatenate(elapsed) * 1000.0
            pooled[(half, name)] = (level, rate)
            centre, median, spread, count = models.profile(level, rate, min_count=150)
            fits = models.fit_all(centre, median, count)

            # Past the first 40 ms the valve is fully open, so the level
            # dependence there is the one the model should reproduce.
            late = since > 40.0
            late_fits, late_profile = None, None
            if late.sum() > 500:
                lc, lm, ls, ln = models.profile(level[late], rate[late], min_count=150)
                if lc.size >= 4:
                    late_fits = models.fit_all(lc, lm, ln)
                    late_profile = {"level": lc.tolist(), "rate": lm.tolist(), "count": ln.tolist(), "iqr": ls.tolist()}

            time_edges = np.arange(0.0, 401.0, 10.0)
            tc, tm, ts, tn = models.profile(since, rate, time_edges, min_count=40)
            duration = np.array([e.duration_ms for e in found])
            travel = np.array([e.travel for e in found])
            per_state[name] = {
                "episodes": len(found),
                "pooled_samples": int(level.size),
                "duration_ms": {"median": float(np.median(duration)), "p10": float(np.percentile(duration, 10)), "p90": float(np.percentile(duration, 90))},
                "travel": {"median": float(np.median(travel)), "p10": float(np.percentile(travel, 10)), "p90": float(np.percentile(travel, 90))},
                "hit_stop_fraction": float(np.mean([e.hit_rail for e in found])),
                "profile": {"level": centre.tolist(), "rate": median.tolist(), "count": count.tolist(), "iqr": spread.tolist()},
                "time_profile": {"ms": tc.tolist(), "rate": tm.tolist(), "count": tn.tolist(), "iqr": ts.tolist()},
                "fits": fits,
                "best": models.best(fits),
                "late_profile": late_profile,
                "late_fits": late_fits,
                "late_best": models.best(late_fits) if late_fits else None,
            }
        out[half] = per_state
    return out, pooled


TRANSITIONS = {
    "cresc_on": lambda cresc, sforz, mf: (not cresc) and (not sforz),
    "cresc_off": lambda cresc, sforz, mf: cresc and (not sforz),
    "sforz_on": lambda cresc, sforz, mf: not sforz,
    "sforz_off": lambda cresc, sforz, mf: sforz,
    "mf_on": lambda cresc, sforz, mf: not mf,
    "mf_off": lambda cresc, sforz, mf: mf,
}
BEFORE_MS = {"mf_on": 0.0, "mf_off": 0.0}


FAST_SPLITS = {
    "fast_crescendo": (
        ("sforz_on", +1, 0.6),
        {
            "crescendo_off": lambda cresc, sforz, mf: (not sforz) and (not mf) and (not cresc),
            "crescendo_on": lambda cresc, sforz, mf: (not sforz) and (not mf) and cresc,
            "hook_engaged": lambda cresc, sforz, mf: (not sforz) and mf,
        },
    ),
    "fast_decrescendo": (
        ("sforz_off", -1, 1.5),
        {
            "crescendo_off": lambda cresc, sforz, mf: sforz and (not mf) and (not cresc),
            "crescendo_on": lambda cresc, sforz, mf: sforz and (not mf) and cresc,
            "hook_engaged": lambda cresc, sforz, mf: sforz and mf,
        },
    ),
}


def fast_rates_by_state(curves, events, lead_ms: dict, rail_levels: dict, mf_levels: dict) -> dict:
    """Peak and plateau rate of the fast valves, split by what else is latched.

    The fast crescendo turns out to run faster when the crescendo latch is on as
    well, so the two ports cannot be treated as alternatives.
    """
    out: dict[str, dict] = {}
    for half in HALVES:
        per_state: dict[str, dict] = {}
        for state, ((trigger, sign, onset_rate), splits) in FAST_SPLITS.items():
            per_split = {}
            for label, require in splits.items():
                found = episodes.extract(
                    curves[half], events, half, trigger, sign, rail_levels[half], mf_levels[half],
                    lead_ms[half], require=require, onset_rate=onset_rate,
                )
                kept = [e for e in found if abs(e.travel) > 0.15 and e.v.size >= 12]
                peaks, plateaus, elapsed, rates = [], [], [], []
                for episode in kept:
                    step = 3
                    rate = (episode.v[2 * step :] - episode.v[: -2 * step]) / (
                        episode.t[2 * step :] - episode.t[: -2 * step]
                    )
                    peaks.append(float(sign * np.max(sign * rate)))
                    # The middle half of the excursion, so that neither the
                    # valve opening nor the approach to the stop dominates.
                    low, high = rate.size // 4, max(rate.size // 4 + 1, 3 * rate.size // 4)
                    plateaus.append(float(np.median(rate[low:high])))
                    elapsed.append(episode.t[step:-step] * 1000.0)
                    rates.append(rate)
                if len(kept) < 5:
                    per_split[label] = {"n": len(kept), "note": "too few episodes"}
                    continue
                peaks = np.array(peaks)
                since, rate = np.concatenate(elapsed), np.concatenate(rates)
                tc, tm, ts, tn = models.profile(since, rate, np.arange(0.0, 301.0, 10.0), min_count=25)
                per_split[label] = {
                    "n": len(kept),
                    "peak_rate": {
                        "median": float(np.median(peaks)),
                        "q1": float(np.percentile(peaks, 25)),
                        "q3": float(np.percentile(peaks, 75)),
                    },
                    "plateau_rate_median": float(np.median(plateaus)) if plateaus else None,
                    "span_ms_at_peak": float(abs((rail_levels[half][1] - rail_levels[half][0]) / np.median(peaks)) * 1000.0),
                    "roll_span_s": [float(min(e.onset_time for e in kept)), float(max(e.onset_time for e in kept))],
                    "start_level_median": float(np.median([e.v[0] for e in kept])),
                    "time_profile": {"ms": tc.tolist(), "rate": tm.tolist(), "count": tn.tolist()},
                }
            per_state[state] = per_split
        out[half] = per_state
    return out


def responses(curves, events, lags_ms: np.ndarray) -> dict:
    out: dict[str, dict] = {}
    for half in HALVES:
        per_name = {}
        for name in timeline.BELLOWS_NAMES:
            before = BEFORE_MS.get(name, 150.0)
            response = timeline.event_triggered(
                curves[half], events, half, name, lags_ms, before_ms=before, require=TRANSITIONS[name]
            )
            if response.n == 0:
                per_name[name] = {"n": 0}
                continue
            per_name[name] = {
                "n": response.n,
                "clear_before_ms": before,
                "lags_ms": lags_ms.tolist(),
                "mean": np.where(np.isfinite(response.mean), response.mean, None).tolist(),
                "sem": np.where(np.isfinite(response.sem), response.sem, None).tolist(),
                "count": response.count.tolist(),
                "baseline_median": float(np.nanmedian(response.baseline)),
            }
        out[half] = per_name
    return out


def _block_bootstrap_r(x: np.ndarray, y: np.ndarray, block: int, draws: int = 2000, seed: int = 0):
    """Correlation interval that respects how strongly neighbouring rows agree."""
    blocks = min(x.size // block, 4000)
    if blocks < 8:
        return (np.nan, np.nan)
    starts = np.arange(blocks) * block
    rng = np.random.default_rng(seed)
    values = []
    for _ in range(draws):
        pick = rng.integers(0, blocks, blocks)
        index = (starts[pick][:, None] + np.arange(block)[None, :]).ravel()
        values.append(np.corrcoef(x[index], y[index])[0, 1])
    return (float(np.percentile(values, 2.5)), float(np.percentile(values, 97.5)))


def note_density(curves, events, timing, lead_ms: dict, slow: dict, mf_levels: dict) -> dict:
    """Does what the line does, beyond the expression code, track the notes?

    Two tests: the residual rate in the slow states, and the wobble of the line
    while it is resting against the Mezzoforte stop, where a rigid hook predicts
    no variation at all.
    """
    onsets = dataset.load_notes(timing)
    out = {}
    for half in HALVES:
        curve = curves[half]
        value, seconds = curve.masked(), curve.seconds
        window = 60
        rate = np.full(value.shape, np.nan)
        rate[window:-window] = (value[2 * window :] - value[: -2 * window]) / (
            seconds[2 * window :] - seconds[: -2 * window]
        )
        shifted = seconds + lead_ms[half] / 1000.0
        cresc = timeline.latch_state(events, half, "cresc", shifted)
        sforz = timeline.latch_state(events, half, "sforz", shifted)
        mf = timeline.latch_state(events, half, "mf", shifted)

        predicted = np.full(value.shape, np.nan)
        for name, predicate in SLOW_STATES.items():
            fit = slow[half][name].get("fits", {}).get("exponential")
            if fit is None:
                continue
            take = predicate(cresc, sforz) & ~mf
            predicted[take] = (fit["v_inf"] - value[take]) / (fit["tau_ms"] / 1000.0)
        residual = rate - predicted

        half_width = 0.25
        counts = np.searchsorted(onsets[half], seconds + half_width) - np.searchsorted(onsets[half], seconds - half_width)
        density = counts / (2 * half_width)

        block = int(round(1.0 / float(np.median(np.diff(seconds)))))  # one second
        report: dict = {
            "note_onsets": int(onsets[half].size),
            "density_per_s": {"median": float(np.median(density)), "p95": float(np.percentile(density, 95))},
        }

        usable = np.isfinite(residual) & np.isfinite(density)
        r_residual = float(np.corrcoef(residual[usable], density[usable])[0, 1])
        report["residual_rate"] = {
            "n_rows": int(usable.sum()),
            "r": r_residual,
            "ci95_block_bootstrap": _block_bootstrap_r(residual[usable], density[usable], block),
        }

        # Punches under the drawn line are themselves more frequent when more
        # notes sound, so the plateau test is repeated with a growing exclusion
        # zone around every row the tracer could not witness.
        missing = ~np.isfinite(value)
        plateau: dict[str, dict] = {}
        for margin in (0, 20, 60):
            clean = np.isfinite(value)
            if margin:
                clean &= ~(np.convolve(missing.astype(int), np.ones(2 * margin + 1, dtype=int), mode="same") > 0)
            resting = mf & clean & (np.abs(value - mf_levels[half]) < 0.05)
            wobble = value[resting] - mf_levels[half]
            slope = float(np.polyfit(density[resting], wobble, 1)[0])
            plateau[f"margin_{margin}_rows"] = {
                "n_rows": int(resting.sum()),
                "sd_of_wobble": float(np.std(wobble)),
                "r": float(np.corrcoef(wobble, density[resting])[0, 1]),
                "ci95_block_bootstrap": _block_bootstrap_r(wobble, density[resting], block),
                "slope_per_note_per_s": slope,
            }
        report["mf_plateau_wobble"] = plateau
        report["r_hole_flag_vs_density"] = float(
            np.corrcoef((curve.flag == "hole").astype(float), density)[0, 1]
        )
        out[half] = report
    return out


def sforzando_coupling(events) -> dict:
    """Hagmann's claim that a sforzando always sets the crescendo too."""
    span = float(max(e.tick_off for e in events))
    pairs = (("sforz_on", "cresc_on"), ("sforz_off", "cresc_off"), ("sforz_on", "cresc_off"), ("sforz_off", "cresc_on"))
    return {
        half: {f"{a}_vs_{b}": coupling.contingency(events, half, a, b, span) for a, b in pairs}
        for half in HALVES
    }


def sforzando_latching(curves, events, lead_ms, rail_levels, mf_levels, slow) -> dict:
    out = {}
    for half in HALVES:
        rails = rail_levels[half]
        out[half] = {
            "predictors": latching.measure(curves[half], events, half, rails, mf_levels[half], lead_ms[half]),
            "cancel_gap": latching.cancel_gap_ms(events, half),
            "after_the_rise": latching.after_the_rise(
                curves[half], events, half, rails, mf_levels[half], lead_ms[half],
                slow[half]["slow_decrescendo"]["fits"]["exponential"],
            ),
        }
    return out


def row_origin(curves) -> dict:
    """Do the traced rows and SUPRA's hole rows share an origin?"""
    import pandas as pd

    timing = dataset.load_timing()
    punches = roworigin.load_punches(timing)
    frame = pd.read_csv(dataset.ROOT / "out" / dataset.DRUID / "curves.csv")
    out = {}
    for half in HALVES:
        curve = curves[half]
        starts, stops, traced = roworigin.hole_runs(curve, frame[f"{half}_x"].to_numpy())
        origin, explained, _ = roworigin.fit_origin(starts, stops, traced, punches)
        lead_rows, trail_rows, keys = roworigin.offsets(starts, stops, traced, punches, origin)
        midpoint = 0.5 * (lead_rows + trail_rows)
        low, high = lag.bootstrap_median(midpoint)
        square = (stops - starts + 1) >= 10
        lead_sq, trail_sq, _ = roworigin.offsets(starts[square], stops[square], traced[square], punches, origin)
        mid_sq = 0.5 * (lead_sq + trail_sq)
        low_sq, high_sq = lag.bootstrap_median(mid_sq)
        out[half] = {
            "runs": int(starts.size),
            "column_origin_px": origin,
            "runs_explained": explained,
            "matched": int(lead_rows.size),
            "run_length_rows_median": float(np.median(stops - starts + 1)),
            "start_offset_rows_median": float(np.median(lead_rows)),
            "end_offset_rows_median": float(np.median(trail_rows)),
            "midpoint_offset_rows": {"median": float(np.median(midpoint)), "ci95": [low, high]},
            "square_crossings": {
                "n": int(mid_sq.size),
                "start_offset_rows_median": float(np.median(lead_sq)),
                "end_offset_rows_median": float(np.median(trail_sq)),
                "midpoint_offset_rows": {"median": float(np.median(mid_sq)), "ci95": [low_sq, high_sq]},
            },
            "keys_crossed": [int(keys.min()), int(keys.max())],
        }
    return out


def additive_conductance(curves, events, lead_ms, rail_levels, mf_levels, slow) -> dict:
    return {
        half: conductance.test(
            curves[half], events, half, rail_levels[half], mf_levels[half], lead_ms[half],
            slow[half]["slow_crescendo"]["fits"]["exponential"],
            slow[half]["slow_decrescendo"]["fits"]["exponential"],
        )
        for half in HALVES
    }


def main() -> None:
    timing = dataset.load_timing()
    events = dataset.load_events(timing)
    curves = dataset.load_curves()

    result: dict = {
        "roll": dataset.DRUID,
        "inventory": inventory(events),
        "rails": rails(curves),
    }

    lead_result = lead(curves, events)
    lead_ms = {half: lead_result[half]["change_points"]["fall_vs_sforz_off"]["median_ms"] for half in HALVES}
    result["lead"] = lead_result
    result["lead_used_ms"] = lead_ms

    result["mezzoforte"] = mezzoforte(curves, events, lead_ms)
    mf_levels = {half: result["mezzoforte"][half]["level"] for half in HALVES}
    rail_levels = {half: (result["rails"][half]["p_rail"], result["rails"][half]["f_rail"]) for half in HALVES}

    result["slow_states"] = slow_states(curves, events, lead_ms, rail_levels)
    fast, _ = fast_states(curves, events, lead_ms, rail_levels, mf_levels)
    result["fast_states"] = fast
    result["fast_rates_by_state"] = fast_rates_by_state(curves, events, lead_ms, rail_levels, mf_levels)
    result["responses"] = responses(curves, events, np.arange(-250.0, 2001.0, 2.0))
    result["note_density"] = note_density(curves, events, timing, lead_ms, result["slow_states"], mf_levels)
    result["pin_faces"] = {
        half: {
            "plateaus": (found := pinfaces.plateaus(
                curves[half], events, half, lead_ms[half],
                mf_levels[half] - 0.12, mf_levels[half] + 0.12)) and pinfaces.summarise(found),
            "from_below_detail": [p for p in found if p["arrival"] == "from below"],
        }
        for half in HALVES
    }
    result["hook_crossings"] = {
        half: hook.crossings(curves[half], events, half, mf_levels[half], lead_ms[half]) for half in HALVES
    }
    result["sforzando_coupling"] = sforzando_coupling(events)
    result["sforzando_latching"] = sforzando_latching(curves, events, lead_ms, rail_levels, mf_levels, result["slow_states"])
    result["row_origin"] = row_origin(curves)
    result["additive_conductance"] = additive_conductance(curves, events, lead_ms, rail_levels, mf_levels, result["slow_states"])

    path = dataset.ROOT / "emulator" / "data" / "measurements.json"
    path.write_text(json.dumps(result, indent=1))
    print(f"wrote {path}")
    return result


if __name__ == "__main__":
    main()
