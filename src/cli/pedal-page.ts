/**
 * Build the pedal-travel page for one roll, as artifact source.
 *
 *   node src/cli/pedal-page.ts [--druid D | --raw FILE.mid] [--piece NAME]
 *                              [--out docs/pedal-page.html] [--lift-ms N] ...
 *
 * The counterpart of `docs/embed-figures.mjs` for the pedal work: it runs the
 * model and writes a self-contained page showing both pedal travels against the
 * latch the punches set, which is all the prior art transmits. Everything
 * roll-specific — the windows the detail panels show, and every number in the
 * captions — is computed here, so the page rebuilds for any red Welte scan
 * rather than only for the one it was first written for.
 *
 * The prose about the mechanism is not computed. It is the same for every roll,
 * and `docs/sources.md` §7 is where it is argued.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";

import { loadRoll } from "../roll/load.ts";
import { readRollFile, rollPorts } from "../roll/ports.ts";
import { halfPedalling, pedalDefaults, pedalSpans, runPedals, tiedToRise } from "../model/pedal.ts";
import { DAMPER_CC, SOFT_CC } from "../midi/pedal.ts";
import type { PedalInput, PedalSpan, PedalTravel } from "../model/pedal.ts";
import type { Perforation } from "../roll/expression.ts";
import type { Grid } from "../roll/grid.ts";
import type { Roll } from "../roll/timing.ts";
import type { Parameters } from "../model/types.ts";

/** A travel counts as arrived once it is within this of its rail. */
const SETTLED_MARGIN = 0.03;

const HEAD = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  :root {
    --ground: #ffffff;
    --surface: #f7f7f8;
    --sunken: #f1f2f3;
    --line: #e5e7eb;
    --line-strong: #cfd2d6;
    --ink: #16181c;
    --ink-soft: #4b5058;
    --ink-faint: #868c96;
    --damper: #a3242c;
    --damper-fill: rgba(163, 36, 44, 0.10);
    --rail: #2f4a68;
    --rail-fill: rgba(47, 74, 104, 0.10);
    --commanded: #8b919b;
    --paper: #eceef0;
    --focus: #a3242c;
    color-scheme: light;
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #0f1013;
      --surface: #17181c;
      --sunken: #1c1e23;
      --line: #2a2d33;
      --line-strong: #3b3f47;
      --ink: #e9eaec;
      --ink-soft: #adb2bb;
      --ink-faint: #757b85;
      --damper: #e8656b;
      --damper-fill: rgba(232, 101, 107, 0.14);
      --rail: #7fa8d4;
      --rail-fill: rgba(127, 168, 212, 0.14);
      --commanded: #6e747e;
      --paper: #23262b;
      --focus: #e8656b;
      color-scheme: dark;
    }
  }

  :root[data-theme="dark"] {
    --ground: #0f1013;
    --surface: #17181c;
    --sunken: #1c1e23;
    --line: #2a2d33;
    --line-strong: #3b3f47;
    --ink: #e9eaec;
    --ink-soft: #adb2bb;
    --ink-faint: #757b85;
    --damper: #e8656b;
    --damper-fill: rgba(232, 101, 107, 0.14);
    --rail: #7fa8d4;
    --rail-fill: rgba(127, 168, 212, 0.14);
    --commanded: #6e747e;
    --paper: #23262b;
    --focus: #e8656b;
    color-scheme: dark;
  }

  * { box-sizing: border-box; }

  body {
    background: var(--ground);
    color: var(--ink);
    font-family: Spectral, Georgia, "Times New Roman", serif;
    font-size: 17px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  .page {
    max-width: 1080px;
    margin: 0 auto;
    padding: 56px 28px 96px;
    display: flex;
    flex-direction: column;
    gap: 56px;
  }

  .prose { max-width: 65ch; display: flex; flex-direction: column; gap: 1em; }
  .prose p { margin: 0; }
  .prose p + p { text-indent: 0; }

  h1, h2, h3 { margin: 0; text-wrap: balance; font-weight: 600; letter-spacing: -0.012em; }
  h1 { font-size: clamp(2rem, 5vw, 2.9rem); line-height: 1.12; }
  h2 { font-size: 1.42rem; line-height: 1.25; }
  h3 { font-size: 1.02rem; line-height: 1.3; }

  .mono, .eyebrow, .stat-value, .axis text, .readout, th, td.num, .legend, .tag {
    font-family: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace;
  }

  .eyebrow {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--ink-faint);
    font-weight: 500;
  }

  header { display: flex; flex-direction: column; gap: 18px; }
  header .lede { font-size: 1.16rem; color: var(--ink-soft); max-width: 60ch; margin: 0; }

  .rule { height: 1px; background: var(--line); border: 0; margin: 0; }

  /* ---- source card ---- */
  .source {
    background: var(--surface);
    border: 1px solid var(--line);
    padding: 18px 20px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px 28px;
  }
  .source dl { margin: 0; display: flex; flex-direction: column; gap: 3px; }
  .source dt { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--ink-faint); font-family: "IBM Plex Mono", monospace; }
  .source dd { margin: 0; font-size: 0.92rem; font-family: "IBM Plex Mono", monospace; color: var(--ink); }

  /* ---- figure ---- */
  figure { margin: 0; display: flex; flex-direction: column; gap: 12px; }
  .figure-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 10px 20px; }
  .figure-head h2 { flex: 1 1 auto; }
  figcaption { font-size: 0.92rem; color: var(--ink-soft); max-width: 68ch; margin: 0; }

  .plot-frame {
    border: 1px solid var(--line);
    background: var(--surface);
    overflow-x: auto;
    position: relative;
  }
  .plot-frame svg { display: block; width: 100%; height: auto; }

  .legend { display: flex; flex-wrap: wrap; gap: 6px 20px; font-size: 0.74rem; color: var(--ink-soft); align-items: center; }
  .legend span { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
  .swatch { width: 16px; height: 0; border-top-width: 2px; border-top-style: solid; flex: none; }
  .swatch.damper { border-top-color: var(--damper); }
  .swatch.rail { border-top-color: var(--rail); }
  .swatch.commanded { border-top-color: var(--commanded); border-top-style: dashed; }
  .swatch.punch { height: 9px; width: 5px; border: 0; background: var(--ink-soft); border-radius: 1px; }

  .readout {
    position: absolute; top: 8px; right: 10px;
    font-size: 0.72rem; color: var(--ink-soft);
    background: var(--ground); border: 1px solid var(--line);
    padding: 3px 8px; pointer-events: none; opacity: 0; transition: opacity 120ms;
  }
  .readout.on { opacity: 1; }

  /* ---- details grid ---- */
  .details { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 28px; }

  /* ---- stats ---- */
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); }
  .stat { background: var(--ground); padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
  .stat-value { font-size: 1.55rem; line-height: 1; font-weight: 500; font-variant-numeric: tabular-nums; }
  .stat-label { font-size: 0.78rem; color: var(--ink-soft); line-height: 1.35; }

  table { border-collapse: collapse; width: 100%; font-size: 0.88rem; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--line); }
  th, td { padding: 9px 14px; text-align: left; border-bottom: 1px solid var(--line); white-space: nowrap; }
  th:last-child, td:last-child { white-space: normal; min-width: 22ch; }
  th { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.11em; color: var(--ink-faint); font-weight: 500; background: var(--surface); }
  td { font-family: Spectral, Georgia, serif; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; font-size: 0.86rem; }
  tbody tr:last-child td { border-bottom: 0; }
  tbody tr.mark td { color: var(--damper); }

  .note {
    border-left: 2px solid var(--line-strong);
    padding-left: 18px;
    font-size: 0.95rem;
    color: var(--ink-soft);
    max-width: 62ch;
    display: flex; flex-direction: column; gap: 0.8em;
  }
  .note p { margin: 0; }
  .note strong { color: var(--ink); font-weight: 600; }

  code { font-family: "IBM Plex Mono", monospace; font-size: 0.86em; background: var(--sunken); padding: 1px 5px; border: 1px solid var(--line); }

  footer { font-size: 0.85rem; color: var(--ink-faint); max-width: 65ch; display: flex; flex-direction: column; gap: 0.8em; }
  footer a { color: var(--ink-soft); }

  :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
</style>`;

const VIEWER = `const NS = "http://www.w3.org/2000/svg";
const grouped = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const el = (name, attrs) => {
  const node = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
};

/** Value of a run-length encoded series at time t, in milliseconds. */
function valueAt(points, t) {
  let low = 0;
  let high = points.length - 1;
  if (t < points[0][0]) return points[0][1];
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (points[mid][0] <= t) low = mid; else high = mid - 1;
  }
  return points[low][1];
}

/** The run-length points inside [from, to], with the value carried in at each edge. */
function windowOf(points, from, to) {
  const inside = points.filter(([t]) => t >= from && t <= to);
  return [[from, valueAt(points, from)], ...inside, [to, valueAt(points, to)]];
}

function polyline(points, x, y) {
  return points.map(([t, v], i) => (i === 0 ? "M" : "L") + x(t).toFixed(2) + " " + y(v).toFixed(2)).join(" ");
}

function stepline(points, x, y) {
  return points.reduce((path, [t, v], i) => {
    if (i === 0) return "M" + x(t).toFixed(2) + " " + y(v).toFixed(2);
    return path + " L" + x(t).toFixed(2) + " " + y(points[i - 1][1]).toFixed(2) +
                  " L" + x(t).toFixed(2) + " " + y(v).toFixed(2);
  }, "");
}

const clock = (ms) => {
  const total = Math.round(ms / 1000);
  return Math.floor(total / 60) + ":" + String(total % 60).padStart(2, "0");
};

/**
 * One time-versus-travel panel. The series are run-length encoded traces;
 * punchKind picks which perforations get a paper band beneath.
 */
function plot(mount, { from, to, series, punchKind, width = 1000, height = 200, ticks = 6, band = true }) {
  const pad = { top: 14, right: 14, bottom: band ? 52 : 26, left: 38 };
  const plotHeight = height - pad.top - pad.bottom;
  const x = (t) => pad.left + ((t - from) / (to - from)) * (width - pad.left - pad.right);
  const y = (v) => pad.top + (1 - v / 127) * plotHeight;

  const svg = el("svg", { viewBox: "0 0 " + width + " " + height, role: "img" });

  // horizontal grid at rest, half and full travel
  [0, 63.5, 127].forEach((v) => {
    svg.appendChild(el("line", {
      x1: pad.left, x2: width - pad.right, y1: y(v), y2: y(v),
      stroke: "var(--line)", "stroke-width": 1,
    }));
    const label = el("text", { x: pad.left - 7, y: y(v) + 3.5, "text-anchor": "end",
      "font-size": 9, fill: "var(--ink-faint)" });
    label.textContent = v === 0 ? "down" : v === 127 ? "up" : "half";
    label.setAttribute("class", "axis");
    svg.appendChild(label);
  });

  // time axis
  const axis = el("g", { class: "axis" });
  Array.from({ length: ticks + 1 }, (_, i) => from + ((to - from) * i) / ticks).forEach((t) => {
    axis.appendChild(el("line", { x1: x(t), x2: x(t), y1: pad.top, y2: pad.top + plotHeight,
      stroke: "var(--line)", "stroke-width": 1, "stroke-dasharray": "2 4" }));
    const label = el("text", { x: x(t), y: height - (band ? 32 : 8), "text-anchor": "middle",
      "font-size": 9, fill: "var(--ink-faint)" });
    label.textContent = to - from > 20000 ? clock(t) : (t / 1000).toFixed(1) + "s";
    axis.appendChild(label);
  });
  svg.appendChild(axis);

  series.forEach((trace) => {
    const points = windowOf(trace.points, from, to);
    const d = trace.step ? stepline(points, x, y) : polyline(points, x, y);
    if (trace.fill) {
      svg.appendChild(el("path", {
        d: d + " L" + x(to).toFixed(2) + " " + y(0).toFixed(2) + " L" + x(from).toFixed(2) + " " + y(0).toFixed(2) + " Z",
        fill: trace.fill, stroke: "none",
      }));
    }
    svg.appendChild(el("path", {
      d, fill: "none", stroke: trace.stroke, "stroke-width": trace.width ?? 1.6,
      "stroke-dasharray": trace.dash ?? "none",
      "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke",
    }));
  });

  if (band) {
    const bandTop = height - 11;
    svg.appendChild(el("rect", { x: pad.left, y: bandTop - 9, width: width - pad.left - pad.right,
      height: 18, fill: "var(--paper)" }));
    svg.appendChild(el("line", { x1: pad.left, x2: width - pad.right, y1: bandTop, y2: bandTop,
      stroke: "var(--line-strong)", "stroke-width": 1 }));
    DATA.punches
      .filter((p) => p.c === punchKind && p.t + p.d >= from && p.t <= to)
      .forEach((p) => {
        const w = Math.max(((p.d / (to - from)) * (width - pad.left - pad.right)), 1.6);
        svg.appendChild(el("rect", {
          x: x(p.t), y: p.a ? bandTop - 8 : bandTop + 1, width: w, height: 7,
          fill: p.a ? "var(--ink-soft)" : "var(--ink-faint)", rx: 0.8,
        }));
      });
  }

  mount.appendChild(svg);
  return { svg, x, y, from, to, width, pad, plotHeight };
}

// ---- main plot ---------------------------------------------------------
const END = Math.round(DATA.meta.seconds * 1000);
const main = plot(document.getElementById("main-frame"), {
  from: 0, to: END, height: 260, ticks: 8, punchKind: "d",
  series: [
    { points: DATA.latch, stroke: "var(--commanded)", dash: "5 3", width: 1.4, step: true },
    { points: DATA.damper, stroke: "var(--damper)", fill: "var(--damper-fill)", width: 1.5 },
  ],
});

// hover readout on the main plot
const readout = document.getElementById("readout");
main.svg.addEventListener("pointermove", (event) => {
  const box = main.svg.getBoundingClientRect();
  const fraction = (event.clientX - box.left) / box.width;
  const px = fraction * main.width;
  if (px < main.pad.left || px > main.width - main.pad.right) { readout.classList.remove("on"); return; }
  const t = main.from + ((px - main.pad.left) / (main.width - main.pad.left - main.pad.right)) * (main.to - main.from);
  const v = valueAt(DATA.damper, t);
  readout.textContent = clock(t) + "." + String(Math.floor((t % 1000) / 100)) + "  ·  CC 64 = " + v +
    "  ·  dampers " + Math.round((v / 127) * 100) + "% up";
  readout.classList.add("on");
});
main.svg.addEventListener("pointerleave", () => readout.classList.remove("on"));

// ---- detail panels -----------------------------------------------------
plot(document.getElementById("detail-press"), {
  from: DATA.windows.press[0], to: DATA.windows.press[1], width: 520, height: 210, ticks: 4, punchKind: "d",
  series: [
    { points: DATA.latch, stroke: "var(--commanded)", dash: "5 3", width: 1.4, step: true },
    { points: DATA.damper, stroke: "var(--damper)", fill: "var(--damper-fill)", width: 2 },
  ],
});

plot(document.getElementById("detail-notable"), {
  from: DATA.windows.notable[0], to: DATA.windows.notable[1], width: 520, height: 210, ticks: 4, punchKind: "d",
  series: [
    { points: DATA.latch, stroke: "var(--commanded)", dash: "5 3", width: 1.4, step: true },
    { points: DATA.damper, stroke: "var(--damper)", fill: "var(--damper-fill)", width: 2 },
  ],
});

const railMount = document.getElementById("detail-rail");
if (railMount) plot(railMount, {
  from: DATA.windows.rail[0], to: DATA.windows.rail[1], height: 220, ticks: 7, punchKind: "h",
  series: [
    { points: DATA.railLatch, stroke: "var(--commanded)", dash: "5 3", width: 1.4, step: true },
    { points: DATA.rail, stroke: "var(--rail)", fill: "var(--rail-fill)", width: 1.8 },
  ],
});`;

function option(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

const flag = (name: string): boolean => process.argv.includes(`--${name}`);

function parameters(): Parameters {
  const dashed = (name: string): string => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  const given = Object.fromEntries(
    Object.entries(pedalDefaults).map(([name, value]) => [name, Number(option(dashed(name), String(value)))]),
  );
  return flag("tied") ? tiedToRise(given) : given;
}

type Source = {
  readonly name: string;
  readonly roll: Roll;
  readonly grid: Grid;
  readonly input: PedalInput;
  readonly punches: readonly Perforation[];
};

/** Either the tracer's own roll, or any red Welte scan the image parser has been over. */
function source(): Source {
  const raw = option("raw", "");
  if (raw !== "") {
    const parsed = rollPorts(readRollFile(raw, basename(raw)));
    const name = basename(raw).replace(/(_parser)?[-_]?raw\.mid$/i, "");
    return { name, roll: parsed.roll, grid: parsed.grid, input: parsed, punches: parsed.perforations };
  }
  const druid = option("druid", "jq774vx6544");
  const loaded = loadRoll(druid);
  return {
    name: druid,
    roll: loaded.roll,
    grid: loaded.grid,
    input: loaded.inputFor("treble", "aperture"),
    punches: loaded.perforations,
  };
}

/** The series at controller resolution, run-length encoded as [ms, 0..127]. */
function encoded(series: Float64Array, grid: Grid): [number, number][] {
  const points: [number, number][] = [];
  let last = -1;
  series.forEach((value, index) => {
    const level = Math.round(value * 127);
    if (level !== last) {
      points.push([Math.round(grid.seconds[index]! * 1000), level]);
      last = level;
    }
  });
  return points;
}

/** How long a travel spends off both of its rails, over a window of the roll. */
function transit(series: Float64Array, grid: Grid, from = -Infinity, to = Infinity): { seconds: number; share: number } {
  let moving = 0;
  let total = 0;
  series.forEach((value, index) => {
    const at = grid.seconds[index]!;
    if (at < from || at > to) return;
    total += grid.dt[index]!;
    if (value > SETTLED_MARGIN && value < 1 - SETTLED_MARGIN) moving += grid.dt[index]!;
  });
  return { seconds: moving, share: total > 0 ? moving / total : 0 };
}

/** How far short of its rail a span ended. */
const shortfall = (span: PedalSpan): number => (span.down ? 1 - span.to : span.to);

const clock = (ms: number): string => {
  const whole = Math.floor(ms / 1000);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

const grouped = (value: number): string => String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const precise = (ms: number): string => `${clock(ms)}.${Math.floor((ms % 1000) / 100)}`;

/** A window around one span, with room either side to see it settle. */
function windowAround(span: PedalSpan, grid: Grid, pad = 800): [number, number] {
  const start = span.seconds * 1000;
  const end = Math.min(grid.seconds.at(-1)! * 1000, start + span.milliseconds + pad);
  return [Math.max(0, start - pad), end];
}

function perforationMarks(punches: readonly Perforation[]): { c: string; a: number; t: number; d: number }[] {
  return punches
    .filter((punch) => punch.control === "sustainPedal" || punch.control === "hammerRail")
    .map((punch) => ({
      c: punch.control === "sustainPedal" ? "d" : "h",
      a: punch.action === "on" ? 1 : 0,
      t: Math.round(punch.secondsOn * 1000),
      d: Math.round((punch.secondsOff - punch.secondsOn) * 1000),
    }));
}

function page(from: Source, travel: PedalTravel, params: Parameters, piece: string, label: string): string {
  const { roll, grid } = from;
  const name = label;
  const spans = pedalSpans(travel, grid);
  const summary = halfPedalling(spans);
  const presses = spans.filter((span) => span.down);
  const lifts = spans.filter((span) => !span.down);
  const byLength = (a: PedalSpan, b: PedalSpan): number => a.milliseconds - b.milliseconds;
  const median = (of: readonly PedalSpan[]): number =>
    of.length === 0 ? 0 : of.toSorted(byLength)[Math.floor(of.length / 2)]!.milliseconds;

  const damper = encoded(travel.damper, grid);
  const rail = encoded(travel.hammerRail, grid);
  const railLatch = encoded(Float64Array.from(travel.hammerRailLatch), grid);
  const railEdges = railLatch.map(([at]) => at).slice(1);
  const seconds = grid.seconds.at(-1)!;

  const shortestPress = presses.toSorted(byLength)[0];
  const cutShort = spans
    .filter((span) => shortfall(span) > SETTLED_MARGIN)
    .toSorted((a, b) => shortfall(b) - shortfall(a))[0];
  const notable = cutShort ?? lifts.toSorted(byLength)[0];

  const railWindow: [number, number] =
    railEdges.length > 1
      ? [Math.max(0, railEdges[0]! - 6000), Math.min(seconds * 1000, railEdges.at(-1)! + 6000)]
      : [0, Math.round(seconds * 1000)];

  const data = {
    meta: {
      rollType: roll.metadata.get("ROLL_TYPE") ?? "welte-red",
      trackerHoles: roll.metadata.get("TRACKER_HOLES") ?? "100",
      dpi: roll.metadata.get("LENGTH_DPI") ?? "",
      rows: grid.length,
      seconds,
      ccMessages: damper.length + rail.length,
      damperCc: DAMPER_CC,
      softCc: SOFT_CC,
    },
    damper,
    rail,
    latch: encoded(Float64Array.from(travel.damperLatch), grid),
    railLatch,
    punches: perforationMarks(from.punches),
    windows: {
      press: shortestPress ? windowAround(shortestPress, grid) : [0, 2000],
      notable: notable ? windowAround(notable, grid, 700) : [0, 2000],
      rail: railWindow,
    },
  };

  const railPunches = data.punches.filter((mark) => mark.c === "h").length;
  const whole = transit(travel.damper, grid);
  const railTransit = transit(travel.hammerRail, grid, railWindow[0] / 1000, railWindow[1] / 1000);
  const railGaps = railEdges.slice(1).map((at, index) => at - railEdges[index]!);
  const changes = presses.length + lifts.length;
  const unfinished = summary.unfinishedLifts + summary.unfinishedPresses;

  const cutShortNote = cutShort
    ? `<p>
      ${unfinished === 1 ? "Only once does a change fail to finish." : `${unfinished} changes do not finish.`}
      The furthest short is at ${precise(cutShort.seconds * 1000)}, where the roll
      ${cutShort.down ? "asks for the pedal and cancels it" : "cancels the pedal and takes it again"}
      ${Math.round(cutShort.milliseconds)}&nbsp;ms later. The dampers get
      ${Math.round((cutShort.down ? cutShort.to : 1 - cutShort.to) * 100)}&nbsp;per&nbsp;cent of the way
      ${cutShort.down ? "up" : "back down"} before the next command reverses them. That is where this
      mechanism holds a position of its own, and it is what Hagmann guessed at &mdash; half-pedal
      effects &ldquo;durch Ueberlagerung der verschiedenen vom Notenband ausgehenden Befehle&rdquo;.
    </p>`
    : `<p>
      Every change on this roll finishes before the next arrives, so the dampers are between their
      two ends only while travelling. Hagmann&rsquo;s conjecture that half-pedal effects might be had
      &ldquo;durch Ueberlagerung der verschiedenen vom Notenband ausgehenden Befehle&rdquo; finds
      nothing to work on here.
    </p>`;

  const railFigure =
    railEdges.length > 1
      ? `<figure>
    <div class="figure-head">
      <h2>The hammer rail, ${clock(railWindow[0])} to ${clock(railWindow[1])}</h2>
      <div class="legend">
        <span><i class="swatch rail"></i> bellows 19, modelled</span>
        <span><i class="swatch commanded"></i> commanded</span>
        <span><i class="swatch punch"></i> perforation</span>
      </div>
    </div>
    <div class="plot-frame" id="detail-rail"></div>
    <figcaption>
      Lines 7 and 8 in the bass: ${railPunches} perforations, making ${railEdges.length} changes of state.
      The quickest the roll
      asks for a change after the last is ${Math.round(Math.min(...railGaps))}&nbsp;ms. Bellows&nbsp;19
      hangs directly on conduit&nbsp;9 with the single throttle&nbsp;20 governing air and suction
      alike, so it has one speed in both directions; across this passage the rail is somewhere
      between its two ends for ${(railTransit.share * 100).toFixed(0)}&nbsp;per&nbsp;cent of the time.
    </figcaption>
  </figure>`
      : "";

  return `<title>${piece} Pedal Trace</title>
${HEAD}
<div class="page">

  <header>
    <p class="eyebrow">Welte-Mignon T-100 &middot; roll ${name} &middot; emulated pedal action</p>
    <h1>${piece}, pedalled by a bellows</h1>
    <p class="lede">
      A red Welte roll does not tell the piano to hold the dampers up. It fires a valve, and a
      bellows then takes about a fifth of a second to lift them. This is that travel, derived from
      the punched code and written out as continuous MIDI instead of the on and off the usual
      converters emit.
    </p>
  </header>

  <div class="source">
    <dl><dt>Roll</dt><dd>${name}</dd></dl>
    <dl><dt>Format</dt><dd>${data.meta.rollType} &middot; ${data.meta.trackerHoles} holes</dd></dl>
    <dl><dt>Scan</dt><dd>${data.meta.dpi} &middot; ${grouped(grid.length)} rows</dd></dl>
    <dl><dt>Playing time</dt><dd>${clock(seconds * 1000)}</dd></dl>
    <dl><dt>Controller messages</dt><dd>${grouped(data.meta.ccMessages)} on CC ${DAMPER_CC} / ${SOFT_CC}</dd></dl>
  </div>

  <figure>
    <div class="figure-head">
      <h2>The damper pedal over the whole roll</h2>
      <div class="legend">
        <span><i class="swatch damper"></i> bellows 18, modelled</span>
        <span><i class="swatch commanded"></i> what the valve was told</span>
        <span><i class="swatch punch"></i> perforation</span>
      </div>
    </div>
    <div class="plot-frame" id="main-frame">
      <div class="readout" id="readout"></div>
    </div>
    <figcaption>
      The dashed line is the latch: the state the Vorpneumatik relay was put into by a punch, which
      is all midi2exp and pianolatron transmit. The solid line is where the dampers actually were.
      Every difference between them is the bellows filling or emptying. The band beneath the axis is
      the paper: each mark is one perforation, above the line for <span class="mono">Pedal an</span>
      (line&nbsp;93), below for <span class="mono">Pedal ab</span> (line&nbsp;94).
    </figcaption>
  </figure>

  <section class="prose">
    <h2>What the continuous reading changes</h2>
    <p>
      The pedal is pressed ${presses.length} times and lifted ${lifts.length}, the median press
      lasting ${(median(presses) / 1000).toFixed(2)}&nbsp;s and the median lift
      ${(median(lifts) / 1000).toFixed(2)}&nbsp;s. Read as a switch that is ${changes} instants;
      read as a bellows it is ${changes} traversals.
    </p>
    <p>
      Over the whole roll the dampers are somewhere between the strings and their full lift for
      ${whole.seconds.toFixed(1)} of the ${seconds.toFixed(0)} seconds &mdash;
      ${(whole.share * 100).toFixed(1)}&nbsp;per&nbsp;cent of it, or
      ${Math.round((whole.seconds / changes) * 1000)}&nbsp;ms of travel at every one of the
      ${changes} changes. A converter that transmits the latch puts all of it at a single instant.
    </p>
    ${cutShortNote}
  </section>

  <div class="stats">
    <div class="stat"><div class="stat-value">${changes}</div><div class="stat-label">pedal changes the roll asks for, each a ramp rather than a step</div></div>
    <div class="stat"><div class="stat-value">${whole.seconds.toFixed(1)} s</div><div class="stat-label">the dampers are in transit, neither down nor fully up &mdash; ${(whole.share * 100).toFixed(0)}&nbsp;% of the roll</div></div>
    <div class="stat"><div class="stat-value">${(median(presses) / 1000).toFixed(2)} s</div><div class="stat-label">median time the pedal is held down</div></div>
    <div class="stat"><div class="stat-value">${(median(lifts) / 1000).toFixed(2)} s</div><div class="stat-label">median time it is up</div></div>
    <div class="stat"><div class="stat-value">${unfinished}</div><div class="stat-label">${unfinished === 1 ? "travel the mechanism cannot finish before the next command" : "travels the mechanism cannot finish before the next command"}</div></div>
  </div>

  <div class="details">
    <figure>
      <div class="figure-head"><h2>The shortest press, close up</h2></div>
      <div class="plot-frame" id="detail-press"></div>
      <figcaption>
        The shortest press on the roll, ${Math.round(shortestPress?.milliseconds ?? 0)}&nbsp;ms at
        ${precise((shortestPress?.seconds ?? 0) * 1000)}, and the lift either side of it. Each punch
        is momentary and the latch flips at its leading edge. The dampers then move on their own
        schedule: about ${Math.round(Number(params.relayLagMs))}&nbsp;ms of nothing while
        throttle&nbsp;11 fills chamber&nbsp;12, then the travel of bellows&nbsp;18.
      </figcaption>
    </figure>

    <figure>
      <div class="figure-head"><h2>${notable ? precise(notable.seconds * 1000) : "0:00"}, the fastest change</h2></div>
      <div class="plot-frame" id="detail-notable"></div>
      <figcaption>
        ${Math.round(notable?.milliseconds ?? 0)}&nbsp;milliseconds between one punch and the next.
        ${cutShort
          ? "The dampers do not reach the end of their travel before the roll reverses them, which is the only way this mechanism ever holds a position between its two ends."
          : "Even here the bellows completes its travel, though with little to spare."}
      </figcaption>
    </figure>
  </div>

  ${railFigure}

  <section class="prose">
    <h2>Where the numbers come from</h2>
    <p>
      The mechanism is Hagmann&rsquo;s, from Anhang&nbsp;16 and pp.&nbsp;106&ndash;107 of his 1984
      dissertation. A momentary punch on line&nbsp;93 sets a latching relay; its output reaches
      membrane chamber&nbsp;12 through throttle&nbsp;11, which is what delays the start; the double
      valve&nbsp;14 then seals the atmospheric bore&nbsp;15 and opens conduit&nbsp;16, and blower
      vacuum closes bellows&nbsp;18. Releasing it runs the same delay and then bleeds air back
      through throttle&nbsp;17. Welte&rsquo;s own scale-roll instructions send the technician to
      exactly those two adjusters: control&nbsp;9c to <span class="mono">11</span> if the dampers
      rise too slowly, control&nbsp;9b to <span class="mono">17</span> if they fall too slowly.
    </p>
    <p>
      The travel follows the same flow law the emulator fits to the Nuancierb&auml;lge, since it is
      the same kind of device &mdash; a bellows filling through a conduit, moving at a speed that
      depends on how far it still has to go.
    </p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Parameter</th><th>Part</th><th class="num">Value</th><th>Where it comes from</th></tr>
        </thead>
        <tbody>
          <tr><td>flow-law exponent</td><td class="mono">&mdash;</td><td class="num">${Number(params.alpha).toFixed(2)}</td><td>mean of the two fitted Nuancierbalg exponents</td></tr>
          <tr><td>relay delay</td><td class="mono">11, 12</td><td class="num">${params.relayLagMs} ms</td><td>a third of the travel budget</td></tr>
          <tr><td>dampers rising</td><td class="mono">16, 18</td><td class="num">${params.liftMs} ms</td><td>the rest of it</td></tr>
          <tr><td>dampers falling</td><td class="mono">15, 17</td><td class="num">${params.fallMs} ms</td><td>equal to the rise, Hagmann p. 107</td></tr>
          <tr><td>hammer rail</td><td class="mono">19, 20</td><td class="num">${params.shiftMs} ms</td><td>no constraint in any source</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="prose">
    <h2>What this does not show</h2>
    <div class="note">
      <p>
        <strong>None of the travel times is measured.</strong> Hagmann gives none, and the pedals
        leave no drawn line on any roll, so there is nothing to fit them against. They are argued
        from the adjusters and bounded by the shortest change the roll asks for. A real T-100 in
        playing order would settle them in an afternoon.
      </p>
      <p>
        <strong>The shape of the ramp is far better supported than its length.</strong> That a
        bellows takes time and arrives gradually follows from the mechanism. How long is a guess
        within a factor of two, and every percentage on this page moves with it.
      </p>
      <p>
        <strong>Hagmann is explicit that there is no depth control</strong> &mdash; &ldquo;die
        D&auml;mpfer werden stets in derselben Geschwindigkeit und immer vollst&auml;ndig von den
        Saiten abgehoben&rdquo; (p.&nbsp;112). Every intermediate position here is one the mechanism
        is passing through, never one it was told to hold.
      </p>
      <p>
        <strong>This is the apparatus, not the performance.</strong> What the recording pianist&rsquo;s
        foot did, and how faithfully the punching represents it, is a separate question that nothing
        here bears on.
      </p>
      <p>
        <strong>CC 64 is a switch at 64 in General MIDI.</strong> Renderers that model a real damper
        read the whole range; many samplers do not, and will collapse all of this back to on and off.
      </p>
    </div>
  </section>

  <hr class="rule">

  <footer>
    <p>
      Peter Hagmann, <em>Das Welte-Mignon-Klavier, die Welte-Philharmonie-Orgel und die Anf&auml;nge
      der Reproduktion von Musik</em>, Diss. Freiburg i.&nbsp;Ue. 1984 &mdash; Anhang&nbsp;10
      (p.&nbsp;178), Anhang&nbsp;12 (pp.&nbsp;180&ndash;185), Anhang&nbsp;16 (p.&nbsp;189), and
      pp.&nbsp;103&ndash;107, 112. Anhang&nbsp;16 is captioned &ldquo;Nach Welte 2&rdquo;, which is
      the T-98 <em>Betriebsanleitung</em>; Hagmann notes that the two systems differ only in the
      Vorpneumatik.
    </p>
    <p>
      Hole data from the Stanford <span class="mono">roll-image-parser</span>. Built by
      <span class="mono">src/cli/pedal-page.ts</span>; the mechanism and its sources are set out in
      <span class="mono">docs/sources.md</span>, §7.
    </p>
  </footer>
</div>

<script>
const DATA = ${JSON.stringify(data)};

${VIEWER}
</script>
`;
}

function main(): void {
  const from = source();
  const params = parameters();
  const travel = runPedals(from.input, params);
  const outPath = option("out", "docs/pedal-page.html");

  const html = page(from, travel, params, option("piece", from.name), option("roll", from.name));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
  console.log(`${(html.length / 1024).toFixed(0)} KB -> ${outPath}`);
}

// Only when run as a command. These modules hold constants other code imports,
// and several of them start a fit or an ablation, so an import that ran them
// would quietly spend an hour of a machine.
if (import.meta.main) main();
