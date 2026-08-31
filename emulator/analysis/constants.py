#!/usr/bin/env python3
"""Turns the fitted laws into the constants an emulator needs.

midi2exp quotes its rates as the time to cross a span, so both forms are given:
the tau of the fitted relaxation, and the time the same fit takes to cross the
printed P.P.-M.F. and M.F.-F.F. spans.
"""

from __future__ import annotations

import json

import numpy as np

import dataset
import measure

PRINTED = {"pp": 0.0, "mf": 0.5, "ff": 1.0}


def crossing_ms(fit: dict, start: float, stop: float) -> float:
    v_inf, tau = fit["v_inf"], fit["tau_ms"]
    if (v_inf - start) * (v_inf - stop) <= 0 or tau <= 0:
        return float("inf")
    return float(tau * np.log((v_inf - start) / (v_inf - stop)))


def main() -> None:
    data = json.loads((dataset.ROOT / "emulator" / "data" / "measurements.json").read_text())
    print("SLOW STATES — exponential fit, dv/dt = (v_inf - v)/tau\n")
    header = f"{'half':7s} {'state':17s} {'tau (ms)':>9s} {'v_inf':>7s} {'rate@0.1':>9s} {'rate@0.5':>9s} {'0.1->0.5':>9s} {'0.5->0.1':>9s}"
    print(header)
    for half in measure.HALVES:
        for state in ("slow_crescendo", "slow_decrescendo"):
            entry = data["slow_states"][half][state]
            fit = entry["fits"]["exponential"]
            rate = lambda v: (fit["v_inf"] - v) / (fit["tau_ms"] / 1000.0)
            up = crossing_ms(fit, 0.1, 0.5)
            down = crossing_ms(fit, 0.5, 0.1)
            print(
                f"{half:7s} {state:17s} {fit['tau_ms']:9.0f} {fit['v_inf']:7.3f} "
                f"{rate(0.1):+9.3f} {rate(0.5):+9.3f} {up:9.0f} {down:9.0f}"
            )

    print("\nFAST VALVES — peak and plateau rate, and the time to cross the full stop-to-stop span\n")
    print(f"{'half':7s} {'valve':17s} {'other latch':14s} {'n':>4s} {'peak/s':>8s} {'plateau/s':>10s} {'span (ms)':>10s}")
    for half in measure.HALVES:
        span = data["rails"][half]["f_rail"] - data["rails"][half]["p_rail"]
        for state, splits in data["fast_rates_by_state"][half].items():
            for label, entry in splits.items():
                if "peak_rate" not in entry:
                    print(f"{half:7s} {state:17s} {label:14s} {entry['n']:4d}   too few episodes")
                    continue
                plateau = entry["plateau_rate_median"]
                print(
                    f"{half:7s} {state:17s} {label:14s} {entry['n']:4d} {entry['peak_rate']['median']:+8.2f} "
                    f"{plateau:+10.2f} {abs(span / plateau) * 1000.0:10.0f}"
                )

    print("\nSTOPS\n")
    for half in measure.HALVES:
        rails = data["rails"][half]
        hook = data["mezzoforte"][half]
        travel = (hook["level"] - rails["p_rail"]) / rails["span"]
        print(
            f"{half:7s} P stop {rails['p_rail']:.3f}  F stop {rails['f_rail']:.3f}  span {rails['span']:.3f}  "
            f"M.F. hook {hook['level']:.3f} (95% CI {hook['ci95'][0]:.3f}-{hook['ci95'][1]:.3f}), "
            f"{travel:.3f} of stop-to-stop travel"
        )

    print("\nLEAD OF THE LINE OVER THE PUNCHES\n")
    for half in measure.HALVES:
        entry = data["lead"][half]
        marks = entry["change_points"]["fall_vs_sforz_off"]
        print(
            f"{half:7s} state scan: sforz {entry['global_state_scan_ms']['sforz']:6.1f} ms, "
            f"cresc {entry['global_state_scan_ms']['cresc']:6.1f} ms | "
            f"collapse vs sforzando-off: {marks['median_ms']:6.1f} ms "
            f"(95% CI {marks['ci95_ms'][0]:.1f}-{marks['ci95_ms'][1]:.1f}, IQR {marks['iqr_ms']:.1f}, n = {marks['n']}) "
            f"= {entry['fall_offset_px']['median']:.0f} px"
        )


if __name__ == "__main__":
    main()
