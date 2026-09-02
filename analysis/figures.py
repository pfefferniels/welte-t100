#!/usr/bin/env python3
"""Draws every figure in emulator/docs/figures/ from measurements.json."""

from __future__ import annotations

import json
import warnings

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

import dataset
import measure
import timeline

warnings.filterwarnings("ignore")

INK = "#111827"
GRID = "#e5e7eb"
MUTED = "#9ca3af"
BAND = "#d1d5db"
RISE = "#1d4ed8"
FALL = "#b91c1c"
FIGURES = dataset.ROOT / "emulator" / "docs" / "figures"

plt.rcParams.update(
    {
        "figure.facecolor": "white",
        "axes.facecolor": "white",
        "savefig.facecolor": "white",
        "axes.edgecolor": "#d1d5db",
        "axes.labelcolor": INK,
        "text.color": INK,
        "xtick.color": "#4b5563",
        "ytick.color": "#4b5563",
        "grid.color": GRID,
        "font.size": 9,
        "axes.titlesize": 9,
        "legend.frameon": False,
    }
)

CODE_ORDER = ("sforz_on", "sforz_off", "cresc_on", "cresc_off", "mf_on", "mf_off")
MIN_CONTRIBUTING = 5
CODE_TITLE = {
    "sforz_on": "Sforzando on (fast crescendo)",
    "sforz_off": "Sforzando off (fast decrescendo)",
    "cresc_on": "Crescendo on (slow crescendo)",
    "cresc_off": "Crescendo off (slow decrescendo)",
    "mf_on": "Mezzoforte hook on",
    "mf_off": "Mezzoforte hook off",
}


def tidy(ax) -> None:
    ax.grid(True, lw=0.6)
    ax.set_axisbelow(True)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)


def event_triggered(data: dict) -> None:
    for half in measure.HALVES:
        lead = data["lead_used_ms"][half]
        fig, axes = plt.subplots(3, 2, figsize=(9.5, 8.0), sharex=True)
        for ax, name in zip(axes.ravel(), CODE_ORDER):
            entry = data["responses"][half][name]
            tidy(ax)
            ax.axhline(0, color=MUTED, lw=0.8)
            ax.axvline(0, color=MUTED, lw=0.8)
            if not entry.get("n"):
                ax.set_title(f"{CODE_TITLE[name]} — no isolated case")
                continue
            lags = np.array(entry["lags_ms"])
            mean = np.array([np.nan if v is None else v for v in entry["mean"]], dtype=float)
            sem = np.array([np.nan if v is None else v for v in entry["sem"]], dtype=float)
            count = np.array(entry["count"])
            thin = count < MIN_CONTRIBUTING
            mean, sem = np.where(thin, np.nan, mean), np.where(thin, np.nan, sem)
            colour = RISE if "on" in name.split("_")[1] else FALL
            ax.fill_between(lags, mean - 1.96 * sem, mean + 1.96 * sem, color=BAND, lw=0)
            ax.plot(lags, mean, color=colour, lw=1.4)
            ax.axvline(-lead, color=MUTED, lw=0.8, ls=(0, (4, 3)))
            ax.set_title(f"{CODE_TITLE[name]}   n = {entry['n']}")
            ax.set_xlim(lags[0], 1200)

            twin = ax.twinx()
            twin.plot(lags, count, color=MUTED, lw=0.7)
            twin.set_ylim(0, max(count.max() * 3, 3))
            twin.set_yticks([])
            for side in ("top", "right", "left"):
                twin.spines[side].set_visible(False)
        for ax in axes[-1]:
            ax.set_xlabel("ms from the leading edge of the punch")
        for ax in axes[:, 0]:
            ax.set_ylabel("change in scale units")
        fig.suptitle(
            f"{half.capitalize()}: drawn line aligned on each expression punch\n"
            f"baseline −150 to −120 ms; dashed line marks the measured lead of {lead:.0f} ms; "
            "grey trace is how many events still contribute",
            fontsize=9.5,
        )
        fig.tight_layout(rect=(0, 0, 1, 0.94))
        fig.savefig(FIGURES / f"event-triggered-{half}.png", dpi=170)
        plt.close(fig)


def _draw_profile(ax, entry: dict, key: str = "profile") -> None:
    profile = entry[key]
    level = np.array(profile["level"])
    rate = np.array(profile["rate"])
    spread = np.array(profile["iqr"])
    count = np.array(profile["count"])
    ax.errorbar(level, rate, yerr=spread / 2, fmt="o", ms=3.2, color=INK, ecolor=BAND, elinewidth=1.0, capsize=0)

    fits = entry["fits"] if key == "profile" else entry["late_fits"]
    grid = np.linspace(level.min() - 0.05, level.max() + 0.05, 200)
    styles = {
        "constant": (MUTED, (0, (5, 3)), f"constant  {fits['constant']['rate']:+.2f}/s"),
        "exponential": (RISE, "-", "exponential"),
        "sqrt": (FALL, (0, (1, 1.6)), "orifice √"),
    }
    for name, (colour, dashes, label) in styles.items():
        fit = fits.get(name)
        if fit is None or not np.isfinite(fit["rms"]):
            continue
        if name == "constant":
            curve = np.full_like(grid, fit["rate"])
        elif name == "exponential":
            curve = (fit["v_inf"] - grid) / (fit["tau_ms"] / 1000.0)
            label = f"exponential  τ = {fit['tau_ms']:.0f} ms, v∞ = {fit['v_inf']:.2f}"
        else:
            sign = np.sign(np.average(rate, weights=count))
            curve = sign * fit["C"] * np.sqrt(np.maximum(sign * (fit["v_inf"] - grid), 0.0))
            label = f"orifice √  C = {fit['C']:.2f}, v∞ = {fit['v_inf']:.2f}"
        ax.plot(grid, curve, color=colour, ls=dashes, lw=1.3, label=f"{label}   rms {fit['rms']:.3f}")
    ax.axhline(0, color=MUTED, lw=0.8)
    ax.legend(fontsize=7.2, loc="best")
    tidy(ax)


def phase_planes(data: dict) -> None:
    panels = [
        ("slow_states", "slow_crescendo", "Slow crescendo — crescendo latched on"),
        ("slow_states", "slow_decrescendo", "Slow decrescendo — nothing latched"),
        ("fast_states", "fast_crescendo", "Fast crescendo — sforzando latched on"),
        ("fast_states", "fast_decrescendo", "Fast decrescendo — sforzando released"),
    ]
    for group, filename in (("slow_states", "phase-plane-slow"), ("fast_states", "phase-plane-fast")):
        chosen = [p for p in panels if p[0] == group]
        fig, axes = plt.subplots(len(chosen), 2, figsize=(9.5, 3.4 * len(chosen)))
        axes = np.atleast_2d(axes)
        for row, (_, state, title) in enumerate(chosen):
            for column, half in enumerate(measure.HALVES):
                ax = axes[row, column]
                entry = data[group][half][state]
                if "profile" not in entry:
                    ax.set_title(f"{half} — {state}: {entry.get('note', 'no data')}")
                    tidy(ax)
                    continue
                _draw_profile(ax, entry)
                sample = entry.get("n") or entry.get("pooled_samples")
                verdict = f"best fit: {entry['best']}" if group == "slow_states" else "no candidate law fits"
                ax.set_title(f"{title}\n{half}, {sample} samples, {verdict}")
                ax.set_xlabel("position on the printed scale (0 = P.P., 1 = F.F.)")
                ax.set_ylabel("rate of travel, scale units / s")
        if group == "fast_states":
            fig.suptitle(
                "The fitted laws are drawn to show that they fail: the rate is not monotone in position.\n"
                "It rises while the valve opens, holds, and falls away near the stop — see fast-valve-opening.png",
                fontsize=9.5,
            )
            fig.tight_layout(rect=(0, 0, 1, 0.93))
        else:
            fig.tight_layout()
        fig.savefig(FIGURES / f"{filename}.png", dpi=170)
        plt.close(fig)


SPLIT_STYLE = {
    "crescendo_on": ("-", "crescendo latch on"),
    "crescendo_off": ((0, (5, 2)), "crescendo latch off"),
    "hook_engaged": ((0, (1, 1.6)), "M.F. hook engaged"),
}


def fast_time_profiles(data: dict) -> None:
    """Rate against time since the line moved, kept apart by starting condition.

    Pooling the three conditions would misread as a decay what is mostly the
    short excursions dropping out of the average.
    """
    fig, axes = plt.subplots(1, 2, figsize=(9.5, 4.0))
    for ax, state in zip(axes, ("fast_crescendo", "fast_decrescendo")):
        tidy(ax)
        for half, colour in zip(measure.HALVES, (RISE, FALL)):
            for label, (dashes, title) in SPLIT_STYLE.items():
                entry = data["fast_rates_by_state"][half][state].get(label, {})
                if "time_profile" not in entry:
                    continue
                profile = entry["time_profile"]
                ax.plot(
                    profile["ms"], profile["rate"], "o", ls=dashes, ms=2.6, lw=1.2, color=colour,
                    label=f"{half}, {title}  (n = {entry['n']}, from {entry['start_level_median']:.2f})",
                )
        ax.axhline(0, color=MUTED, lw=0.8)
        ax.set_xlabel("ms since the line started to move")
        ax.set_ylabel("rate of travel, scale units / s")
        ax.set_title(state.replace("_", " "))
        ax.set_xlim(0, 220)
        ax.legend(fontsize=7)
    fig.suptitle("How the fast valves open: rate against time since the line left its rest", fontsize=9.5)
    fig.tight_layout(rect=(0, 0, 1, 0.93))
    fig.savefig(FIGURES / "fast-valve-opening.png", dpi=170)
    plt.close(fig)


def fast_by_state(data: dict) -> None:
    """The fast valves are not one rate: the crescendo latch changes them."""
    labels = {"crescendo_off": "crescendo latch off", "crescendo_on": "crescendo latch on", "hook_engaged": "M.F. hook engaged"}
    fig, axes = plt.subplots(1, 2, figsize=(9.5, 3.8))
    for ax, state in zip(axes, ("fast_crescendo", "fast_decrescendo")):
        tidy(ax)
        positions, ticks = [], []
        for index, (label, title) in enumerate(labels.items()):
            for offset, (half, colour) in enumerate(zip(measure.HALVES, (RISE, FALL))):
                entry = data["fast_rates_by_state"][half][state].get(label, {})
                if "peak_rate" not in entry:
                    continue
                x = index + (offset - 0.5) * 0.32
                peak = entry["peak_rate"]
                ax.plot([x, x], [peak["q1"], peak["q3"]], color=colour, lw=5, solid_capstyle="butt", alpha=0.35)
                ax.plot([x], [peak["median"]], "o", ms=5, color=colour)
                ax.annotate(f"n={entry['n']}", (x, peak["median"]), textcoords="offset points",
                            xytext=(0, 9 if offset else -14), ha="center", fontsize=7, color=colour)
            positions.append(index)
            ticks.append(title)
        ax.set_xticks(positions)
        ax.set_xticklabels(ticks, fontsize=8)
        ax.axhline(0, color=MUTED, lw=0.8)
        ax.set_ylabel("peak rate of travel, scale units / s")
        ax.set_title(state.replace("_", " ") + "\nmedian and interquartile range over episodes")
        handles = [plt.Line2D([], [], marker="o", ls="", color=c, label=h) for h, c in zip(measure.HALVES, (RISE, FALL))]
        ax.legend(handles=handles, fontsize=8, loc="center left")
    fig.tight_layout()
    fig.savefig(FIGURES / "fast-rates-by-state.png", dpi=170)
    plt.close(fig)


def coupling_figure(data: dict) -> None:
    """Hagmann's coupling against what chance alone would put there."""
    pairs = ("sforz_on_vs_cresc_on", "sforz_off_vs_cresc_off")
    titles = {
        "sforz_on_vs_cresc_on": "Sforzando on against the nearest crescendo on",
        "sforz_off_vs_cresc_off": "Sforzando off against the nearest crescendo off",
    }
    fig, axes = plt.subplots(2, 2, figsize=(9.5, 6.0))
    for row, pair in enumerate(pairs):
        for column, half in enumerate(measure.HALVES):
            ax = axes[row, column]
            tidy(ax)
            entry = data["sforzando_coupling"][half][pair]
            edges = np.array(entry["offset_histogram"]["edges"])
            counts = np.array(entry["offset_histogram"]["counts"])
            ax.bar(0.5 * (edges[:-1] + edges[1:]), counts, width=edges[1] - edges[0], color=BAND, lw=0)
            ax.axvline(0, color=INK, lw=1.0)
            for edge in (-40, 40):
                ax.axvline(edge, color=FALL, lw=0.9, ls=(0, (4, 3)))
            control = entry["control_within_40_rows"]
            ax.set_title(
                f"{titles[pair]}\n{half}: {entry['within_40_rows']:.1%} within ±40 rows, "
                f"chance {control['mean']:.1%} ({control['p2.5']:.1%}–{control['p97.5']:.1%})"
            )
            ax.set_xlabel("crescendo punch minus sforzando punch, scan rows")
            ax.set_ylabel("count")
    fig.suptitle(
        "If the roll punched the two codes together the counts would pile up between the dashed lines. They do not.",
        fontsize=9.5,
    )
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    fig.savefig(FIGURES / "sforzando-crescendo-coupling.png", dpi=170)
    plt.close(fig)


def row_origin_figure(data: dict, curves) -> None:
    """The two row systems, checked where a punch crosses the drawn line."""
    import pandas as pd

    import roworigin

    punches = roworigin.load_punches(dataset.load_timing())
    frame = pd.read_csv(dataset.ROOT / "out" / dataset.DRUID / "curves.csv")
    bins = np.arange(-60.5, 61.5, 3.0)
    fig, axes = plt.subplots(2, 2, figsize=(9.5, 6.0))
    for column, half in enumerate(measure.HALVES):
        entry = data["row_origin"][half]
        starts, stops, traced = roworigin.hole_runs(curves[half], frame[f"{half}_x"].to_numpy())
        square = (stops - starts + 1) >= 10
        for row, (mask, label) in enumerate(((np.ones_like(square), "all runs"), (square, "square crossings only"))):
            ax = axes[row, column]
            tidy(ax)
            lead_rows, trail_rows, _ = roworigin.offsets(starts[mask], stops[mask], traced[mask], punches, entry["column_origin_px"])
            midpoint = 0.5 * (lead_rows + trail_rows)
            ax.hist(lead_rows, bins=bins, histtype="step", lw=1.4, color=RISE,
                    label=f"run start − punch start  (median {np.median(lead_rows):+.0f})")
            ax.hist(trail_rows, bins=bins, histtype="step", lw=1.4, color=FALL,
                    label=f"run end − punch end  (median {np.median(trail_rows):+.0f})")
            ax.hist(midpoint, bins=bins, color=BAND, lw=0,
                    label=f"midpoint  (median {np.median(midpoint):+.1f})")
            ax.axvline(0, color=INK, lw=1.0)
            ax.set_title(f"{half}, {label}: n = {lead_rows.size}")
            ax.set_xlabel("scan rows")
            ax.set_ylabel("count")
            ax.legend(fontsize=7.2)
    fig.suptitle(
        "A punch crossing the drawn line: the ink is lost over the middle of the punch, symmetrically about its centre.\n"
        "The midpoints coincide, so the two row systems share an origin.",
        fontsize=9.5,
    )
    fig.tight_layout(rect=(0, 0, 1, 0.93))
    fig.savefig(FIGURES / "row-origin.png", dpi=170)
    plt.close(fig)


def mezzoforte(data: dict, curves, events) -> None:
    """Where the hook holds the line, on the printed scale and in raw pixels.

    The lower row answers the obvious worry about the upper one. The tracer
    cannot tell the drawn line from a printed gridline, so it flags such rows
    `rule` and interpolates them; if the stop sat on the M.F. gridline the tracer
    would miss it there and report only the shoulders. Measured in raw scan
    columns against the local gridline, the peak is a single clean mode far
    outside the excluded band, and nothing is excluded between the two.
    """
    import pandas as pd

    frame = pd.read_csv(dataset.ROOT / "out" / dataset.DRUID / "curves.csv")
    rules = pd.read_csv(dataset.ROOT / "out" / dataset.DRUID / "rules.csv")
    halfwidth = json.loads((dataset.ROOT / "out" / dataset.DRUID / "meta.json").read_text())["rule_halfwidth_px"]

    fig, axes = plt.subplots(2, 2, figsize=(9.5, 6.4))
    for column, half in enumerate(measure.HALVES):
        curve = curves[half]
        value = curve.masked()
        engaged = timeline.latch_state(events, half, "mf", curve.seconds + data["lead_used_ms"][half] / 1000.0)
        seen = np.isfinite(value)
        level = data["mezzoforte"][half]["level"]

        ax = axes[0, column]
        tidy(ax)
        ax.hist(value[seen & engaged], bins=np.arange(-0.05, 1.06, 0.01), color=RISE, alpha=0.75, lw=0, label="hook engaged")
        ax.hist(value[seen & ~engaged], bins=np.arange(-0.05, 1.06, 0.01), color=MUTED, alpha=0.7, lw=0, label="hook released")
        ax.axvline(level, color=FALL, lw=1.2, label=f"stop at {level:.3f}")
        ax.axvline(0.5, color=INK, lw=1.0, ls=(0, (4, 3)), label="printed M.F. gridline")
        ax.set_title(f"{half}: where the line sits, with and without the hook")
        ax.set_xlabel("position on the printed scale")
        ax.set_ylabel("scan rows")
        ax.legend(fontsize=7.5)

        ax = axes[1, column]
        tidy(ax)
        gridline = np.interp(curve.y_px, rules["y_px"].to_numpy(), rules[f"mf_{half}"].to_numpy())
        towards_centre = 1.0 if half == "bass" else -1.0
        offset = towards_centre * (frame[f"{half}_x"].to_numpy() - gridline)
        ax.hist(offset[engaged], bins=np.arange(-30, 121, 2.0), color=RISE, lw=0, label="hook engaged, every row, unmasked")
        ax.axvspan(-halfwidth, halfwidth, color=FALL, alpha=0.25, lw=0, label=f"band the tracer cannot read (±{halfwidth:.0f} px)")
        ax.axvline(0, color=INK, lw=1.0, ls=(0, (4, 3)), label="printed M.F. gridline")
        ax.set_title(f"{half}: raw traced column, distance from the printed gridline")
        ax.set_xlabel("scan columns towards the F.F. line")
        ax.set_ylabel("scan rows")
        ax.legend(fontsize=7.5)
    fig.suptitle(
        "The stop is not the printed gridline, and not an artefact of the band the tracer cannot read",
        fontsize=9.5,
    )
    fig.tight_layout(rect=(0, 0, 1, 0.95))
    fig.savefig(FIGURES / "mezzoforte-level.png", dpi=170)
    plt.close(fig)


def rails(data: dict, curves) -> None:
    fig, axes = plt.subplots(1, 2, figsize=(9.5, 3.6))
    for ax, half in zip(axes, measure.HALVES):
        tidy(ax)
        curve = curves[half]
        value, seconds = curve.masked(), curve.seconds
        window = 15
        rate = np.full(value.shape, np.nan)
        rate[window:-window] = (value[2 * window :] - value[: -2 * window]) / (
            seconds[2 * window :] - seconds[: -2 * window]
        )
        resting = np.isfinite(value) & np.isfinite(rate) & (np.abs(rate) < 0.08)
        bins = np.arange(-0.05, 1.06, 0.005)
        ax.hist(value[np.isfinite(value)], bins=bins, color=BAND, lw=0, label="all observed rows")
        ax.hist(value[resting], bins=bins, color=INK, lw=0, label="rows where the line is at rest")
        entry = data["rails"][half]
        for level, label in ((entry["p_rail"], "P stop"), (entry["f_rail"], "F stop")):
            ax.axvline(level, color=FALL, lw=1.1)
            ax.text(level, ax.get_ylim()[1] * 0.92, f" {label} {level:.3f}", fontsize=7.5, color=FALL)
        for gridline in (0.0, 0.5, 1.0):
            ax.axvline(gridline, color=MUTED, lw=0.8, ls=(0, (4, 3)))
        ax.set_title(f"{half}: printed gridlines at 0, 0.5, 1 against the mechanism's stops")
        ax.set_xlabel("position on the printed scale")
        ax.set_ylabel("scan rows")
        ax.legend(fontsize=7.5)
    fig.tight_layout()
    fig.savefig(FIGURES / "rails.png", dpi=170)
    plt.close(fig)


def lead_figure(data: dict, curves, events) -> None:
    import lag

    offsets = np.arange(-400.0, 401.0, 5.0)
    fig, axes = plt.subplots(1, 2, figsize=(9.5, 3.6))
    tidy(axes[0])
    for half, colour in zip(measure.HALVES, (RISE, FALL)):
        contrast = lag.state_slope_contrast(curves[half], events, half, offsets)
        for latch, dashes in (("sforz", "-"), ("cresc", (0, (4, 3)))):
            axes[0].plot(-offsets, contrast[latch], color=colour, ls=dashes, lw=1.2, label=f"{half} {latch}")
    axes[0].axvline(0, color=MUTED, lw=0.8)
    axes[0].set_xlabel("line leads the punch by (ms)")
    axes[0].set_ylabel("mean rate, latch on minus latch off")
    axes[0].set_title("Offset that best lines the code up with the line")
    axes[0].legend(fontsize=7.5)

    tidy(axes[1])
    for half, colour in zip(measure.HALVES, (RISE, FALL)):
        falls = lag.turning_points(curves[half], 3.0, -1)
        punches = np.array([e.sec_on for e in events if e.half == half and e.name == "sforz_off"])
        offset = -lag.nearest_offsets(falls, punches, 300.0)
        entry = data["lead"][half]["change_points"]["fall_vs_sforz_off"]
        axes[1].hist(
            offset,
            bins=np.arange(-100, 260, 5),
            histtype="step",
            lw=1.4,
            color=colour,
            label=f"{half}  median {entry['median_ms']:.0f} ms  (n = {entry['n']})",
        )
    axes[1].axvline(0, color=MUTED, lw=0.8)
    axes[1].set_xlabel("collapse of the line, ms before the sforzando-off punch")
    axes[1].set_ylabel("count")
    axes[1].set_title("Same offset, measured event by event")
    axes[1].legend(fontsize=7.5)
    fig.tight_layout()
    fig.savefig(FIGURES / "lead.png", dpi=170)
    plt.close(fig)


def excerpt(curves, events, span=(180.0, 188.0)) -> None:
    colours = {
        "sforz_on": RISE,
        "sforz_off": FALL,
        "cresc_on": "#047857",
        "cresc_off": "#7c3aed",
        "mf_on": INK,
        "mf_off": MUTED,
    }
    fig, axes = plt.subplots(2, 1, figsize=(9.5, 5.0), sharex=True)
    for ax, half in zip(axes, measure.HALVES):
        tidy(ax)
        curve = curves[half]
        inside = (curve.seconds >= span[0]) & (curve.seconds <= span[1])
        ax.plot(curve.seconds[inside], curve.masked()[inside], color=INK, lw=1.2)
        for gridline in (0.0, 0.5, 1.0):
            ax.axhline(gridline, color=MUTED, lw=0.8, ls=(0, (4, 3)))
        for event in events:
            if event.half != half or event.name not in colours or not span[0] <= event.sec_on <= span[1]:
                continue
            ax.axvspan(event.sec_on, event.sec_off, color=colours[event.name], alpha=0.5, lw=0)
        ax.set_ylim(-0.06, 1.1)
        ax.set_ylabel(f"{half}\nposition on the scale")
    handles = [plt.Line2D([], [], color=c, lw=6, alpha=0.5, label=n.replace("_", " ")) for n, c in colours.items()]
    axes[0].legend(handles=handles, fontsize=7.5, ncol=6, loc="upper center", bbox_to_anchor=(0.5, 1.32))
    axes[-1].set_xlabel("seconds")
    fig.tight_layout()
    fig.savefig(FIGURES / "excerpt.png", dpi=170)
    plt.close(fig)


def main() -> None:
    FIGURES.mkdir(parents=True, exist_ok=True)
    data = json.loads((dataset.ROOT / "emulator" / "data" / "measurements.json").read_text())
    timing = dataset.load_timing()
    events = dataset.load_events(timing)
    curves = dataset.load_curves()

    event_triggered(data)
    phase_planes(data)
    fast_time_profiles(data)
    fast_by_state(data)
    mezzoforte(data, curves, events)
    rails(data, curves)
    lead_figure(data, curves, events)
    coupling_figure(data)
    row_origin_figure(data, curves)
    excerpt(curves, events)
    print(f"wrote figures to {FIGURES}")


if __name__ == "__main__":
    main()
