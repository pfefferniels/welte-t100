/**
 * "Constants across rolls" as one page.
 *
 *   node view/rolls-page.mjs docs/rolls-round1.json
 *        [--summary <json>] [--out <html>] [--spec src/model/pneumatic.ts]
 *
 * The six rolls were fitted separately so that the constants could be held
 * against one another afterwards. This page is that comparison and nothing else:
 * every number on it is in `docs/rolls-round1.md` beside it, written by the same
 * run of `src/cli/compare.ts`.
 *
 * Bounds and units come from the model source rather than from the comparison,
 * which does not carry them, and a fitted value resting on its own bound can only
 * be recognised against the bound it rests on.
 *
 * `--summary` supplies what no fit file knows: the Welte number, the performer
 * and a verdict per group of constants. It is optional, and the page is built
 * either way, because every figure comes from the comparison.
 *
 * The page is published through the Artifact tool, so it carries no document
 * wrapper: a title, one style block and the markup. No script and no external
 * resource; the plots are inline SVG and the heat maps are tables.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The fit files say `treble`; the page says discant, as the dissertation does. */
const HALVES = [
  { key: "bass", label: "bass", series: "bass" },
  { key: "treble", label: "discant", series: "discant" },
];

/**
 * Which constants would belong to the machine if the mechanism is one design,
 * which to how that instrument was regulated, and which to the apparatus that
 * drew the line on this sheet. The split is the question the page asks, so it is
 * stated here rather than derived from anything in the data.
 */
const GROUPS = [
  {
    name: "Mechanism",
    slug: "mechanism",
    verdictKeys: ["mechanism"],
    blurb:
      "Flow law, conductances, relay timing and the load on the supply. These describe the pneumatic that every T-100 shares, so agreement across rolls is what the model predicts and disagreement is what it has to answer for.",
    parameters: [
      "alpha",
      "crescendoRate",
      "releaseRate",
      "sforzandoRate",
      "sforzandoAssistRate",
      "sforzandoTarget",
      "tripThreshold",
      "membraneFillMs",
      "assistFillMs",
      "valveTailMs",
      "inertiaMs",
      "valveBand",
      "assistBand",
      "throughFlowLoad",
      "dragThreshold",
      "railGrip",
      "stopRestitution",
      "stopStiffness",
      "stopDamping",
      "assistYields",
      "assistLatches",
      "sforzandoLatches",
      "sforzandoSetsCrescendo",
      "regulatorGain",
      "supplyDroop",
    ],
  },
  {
    name: "Regulation",
    slug: "regulation",
    verdictKeys: ["regulation"],
    blurb:
      "The Mezzoforte pin and the two asymptotes the slow codes drive towards. A technician sets these, so they may differ between instruments and between one regulation and the next without the mechanism differing at all.",
    parameters: [
      "mezzoforte",
      "mfBarrier",
      "mfTwoSided",
      "mfThickness",
      "crescendoTarget",
      "releaseTarget",
      "windRateGain",
      "windTargetShift",
    ],
  },
  {
    name: "Drawing apparatus",
    slug: "drawing-apparatus",
    verdictKeys: ["drawingapparatus", "drawing", "registration"],
    blurb:
      "Where the pen sat on this sheet of paper: the two rails it rested against, how far ahead of the punches it ran, and how its travel maps onto the printed scale. Nothing here is expected to agree between rolls.",
    parameters: [
      "piano",
      "forte",
      "leadRows",
      "leadSforzandoOnRows",
      "leadCrescendoRows",
      "leadMezzoforteRows",
      "leadPerLevelRows",
      "leadDriftRows",
      "scaleWarp",
    ],
  },
];

const VARIANTS = ["as fitted", "re-registered"];

/** The summary's verdict on the travel times, which belongs to no parameter group. */
const TRAVEL_VERDICT_KEYS = ["traveltimes", "travel"];

/** Sequential blue, light to dark on the light ground and the other way on the dark one. */
const RAMP = {
  light: ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"],
  dark: ["#123055", "#17457f", "#1c5cab", "#2a78d6", "#5598e7", "#86b6ef", "#b7d3f6"],
};
/** Ink that clears 4:1 on each step, computed once and written into the tokens. */
const RAMP_INK = {
  light: ["#0b1220", "#0b1220", "#0b1220", "#0b1220", "#ffffff", "#ffffff", "#ffffff"],
  dark: ["#ffffff", "#ffffff", "#ffffff", "#ffffff", "#0b1220", "#0b1220", "#0b1220"],
};

const PANEL = {
  width: 328,
  height: 162,
  left: 50,
  right: 10,
  plotTop: 12,
  plotBottom: 106,
  tagBaseline: 122,
  stripTop: 136,
  stripHeight: 7,
  boundBaseline: 156,
};

// ------------------------------------------------------------------ command line

function option(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

function positional(fallback) {
  const given = process.argv.slice(2).find((argument, index, all) => {
    const previous = all[index - 1];
    return !argument.startsWith("--") && !(previous && previous.startsWith("--"));
  });
  return given ?? fallback;
}

// ----------------------------------------------------------------------- reading

/**
 * The parameter boxes, out of the model source. The comparison JSON carries the
 * fitted values but not the bounds they were searched inside, and the page has to
 * mark a value the bound is setting rather than the roll.
 */
const SPEC_ENTRY =
  /\{\s*name:\s*"([^"]+)",\s*lower:\s*(-?[\d.eE+-]+),\s*upper:\s*(-?[\d.eE+-]+),\s*unit:\s*"([^"]*)",\s*note:\s*"([^"]*)"\s*\}/g;

function readSpec(path) {
  const entries = [...readFileSync(path, "utf8").matchAll(SPEC_ENTRY)].map((found) => ({
    name: found[1],
    lower: Number(found[2]),
    upper: Number(found[3]),
    unit: found[4],
    note: found[5],
  }));
  if (entries.length === 0) throw new Error(`${path}: no parameter spec found`);
  return entries;
}

function firstOf(source, names) {
  return names.map((name) => source?.[name]).find((value) => value !== undefined);
}

function normalisedKey(text) {
  return String(text).toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * The summary is written by another tool, so it is read for the three things it
 * alone knows and nothing is required of it. Keys it does not use leave the slot
 * empty rather than failing the build.
 */
function readSummary(path) {
  if (!path) {
    return {
      headline: undefined,
      limitations: [],
      byDruid: new Map(),
      verdicts: new Map(),
      later: undefined,
      present: false,
    };
  }
  const file = JSON.parse(readFileSync(path, "utf8"));
  const rolls = firstOf(file, ["rolls", "byRoll", "rollSummaries"]) ?? [];
  const entries = Array.isArray(rolls)
    ? rolls.map((entry) => [entry.druid, entry])
    : Object.entries(rolls).map(([druid, entry]) => [druid, { druid, ...entry }]);
  const verdicts = firstOf(file, ["verdicts", "groups", "groupVerdicts"]) ?? {};
  const listed = Array.isArray(verdicts)
    ? Object.fromEntries(
        verdicts.map((entry) => [firstOf(entry, ["group", "name"]), firstOf(entry, ["verdict", "text", "summary"])]),
      )
    : verdicts;
  return {
    headline: firstOf(file, ["headline", "lede", "summary"]),
    limitations: firstOf(file, ["limitations", "caveats"]) ?? [],
    byDruid: new Map(entries),
    verdicts: verdictsFrom(listed),
    later: firstOf(file, ["roundTwo", "round2", "nextRound"]),
    present: true,
  };
}

/** The group names in the summary need not be the group names here. */
function verdictIn(verdicts, keys) {
  return keys.map((key) => verdicts.get(key)).find(Boolean);
}

function verdictsFrom(source) {
  return new Map(Object.entries(source ?? {}).map(([group, said]) => [normalisedKey(group), said]));
}

// -------------------------------------------------------------------- formatting

function trimmed(value, digits) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const rounded = Number(value.toPrecision(digits));
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function fixed(value, places) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(places) : "—";
}

/** Thin spaces rather than commas: this is a count of scan rows, not money. */
function grouped(value) {
  return value.toLocaleString("en-US").replaceAll(",", " ");
}

function percentage(part, whole) {
  return whole > 0 ? `${Math.round((part / whole) * 100)} %` : "—";
}

function escaped(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function finiteOr(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

// ------------------------------------------------------------------- the rolls

/**
 * The short label every chart uses. The Welte number is what these rolls are
 * called, so it is the tag wherever the summary gives one for each roll and no
 * two rolls share it; otherwise the druid's first four characters, which
 * separate any set of them.
 */
function taggedRolls(rolls) {
  const welten = rolls.map((roll) => roll.welte);
  const byWelte = welten.every((welte) => welte !== undefined) && new Set(welten).size === rolls.length;
  return rolls.map((roll) => ({ ...roll, tag: String(byWelte ? roll.welte : roll.druid.slice(0, 4)) }));
}

function rollsFrom(data, summary) {
  return taggedRolls(
    data.rolls.map((roll) => {
      const known = summary.byDruid.get(roll.druid) ?? {};
      return {
        ...roll,
        welte: firstOf(known, ["welte", "welteNumber", "welte_number", "number"]),
        performer: firstOf(known, ["performer", "artist", "pianist", "player"]),
        title: firstOf(known, ["title", "work"]),
        verdicts: verdictsFrom(firstOf(known, ["verdict", "verdicts"])),
      };
    }),
  );
}

// ------------------------------------------------------------------------- marks

function boundOf(spec, value) {
  const margin = (spec.upper - spec.lower) / 1000;
  if (value <= spec.lower + margin) return "lower";
  if (value >= spec.upper - margin) return "upper";
  return undefined;
}

function markOf(roll, half, spec) {
  const value = roll.fitted[half.key].params[spec.name];
  if (value === undefined) return undefined;
  const spread = finiteOr(roll.spread?.perParameter[half.key]?.[spec.name]);
  return {
    roll,
    half,
    value,
    spread,
    low: spread === undefined ? value : Math.max(spec.lower, value - spread),
    high: spread === undefined ? value : Math.min(spec.upper, value + spread),
    pinned: roll.constants[half.key][spec.name]?.pinned === true,
    bound: boundOf(spec, value),
  };
}

function marksOf(rolls, spec) {
  return rolls.flatMap((roll) => HALVES.map((half) => markOf(roll, half, spec)).filter(Boolean));
}

/** What the panel shows: the marks and their seed bars, padded, never outside the box. */
function domainOf(spec, marks) {
  const low = Math.min(...marks.map((mark) => mark.low));
  const high = Math.max(...marks.map((mark) => mark.high));
  const padding = high > low ? (high - low) * 0.12 : Math.max(Math.abs(high) * 0.05, 1e-9);
  return [Math.max(spec.lower, low - padding), Math.min(spec.upper, high + padding)];
}

function linearScale(domain, range) {
  const span = domain[1] - domain[0] || 1;
  return (value) => range[0] + ((value - domain[0]) / span) * (range[1] - range[0]);
}

// ---------------------------------------------------------------------- the plot

function slotCentre(index) {
  const width = (PANEL.width - PANEL.left - PANEL.right) / 6;
  return PANEL.left + (index + 0.5) * width;
}

function shapeAt(mark, x, y) {
  const series = `mark ${mark.half.series}`;
  if (mark.bound) {
    const direction = mark.bound === "upper" ? -1 : 1;
    const points = [`${x},${y + direction * 5}`, `${x - 4.6},${y - direction * 3}`, `${x + 4.6},${y - direction * 3}`];
    return `<polygon class="${series}" points="${points.join(" ")}" />`;
  }
  if (mark.pinned) {
    const points = [`${x},${y - 4.6}`, `${x + 4.6},${y}`, `${x},${y + 4.6}`, `${x - 4.6},${y}`];
    return `<polygon class="${series}" points="${points.join(" ")}" />`;
  }
  return `<circle class="${series}" cx="${x}" cy="${y}" r="3.6" />`;
}

function markTitle(mark) {
  const parts = [
    `${mark.roll.druid} · ${mark.half.label} · ${trimmed(mark.value, 4)}`,
    mark.pinned ? "measured on this roll, pinned in stage 1" : undefined,
    mark.bound ? `resting on its ${mark.bound} bound` : undefined,
    mark.spread === undefined ? undefined : `other seed within ${trimmed(mark.spread, 2)}`,
  ];
  return escaped(parts.filter(Boolean).join(" · "));
}

function drawnMark(mark, rolls, y) {
  const index = rolls.indexOf(mark.roll);
  const x = slotCentre(index) + (mark.half.key === "bass" ? -6 : 6);
  const bar =
    mark.spread === undefined
      ? ""
      : `<line class="bar ${mark.half.series}" x1="${x}" y1="${y(mark.low).toFixed(1)}" x2="${x}" y2="${y(
          mark.high,
        ).toFixed(1)}" />`;
  return `<g><title>${markTitle(mark)}</title>${bar}${shapeAt(mark, x, Number(y(mark.value).toFixed(1)))}</g>`;
}

/**
 * The box under the plot: the whole searched range as a track, the slice the plot
 * above is showing as a filled window in it. It says in one mark how far the six
 * rolls sit from the walls, which the zoomed plot cannot.
 */
function boxStrip(spec, domain) {
  const left = PANEL.left;
  const right = PANEL.width - PANEL.right;
  const across = linearScale([spec.lower, spec.upper], [left, right]);
  const start = across(domain[0]);
  const width = Math.max(across(domain[1]) - start, 1.5);
  return [
    `<rect class="strip-track" x="${left}" y="${PANEL.stripTop}" width="${right - left}" height="${
      PANEL.stripHeight
    }" rx="1.5" />`,
    `<rect class="strip-window" x="${start.toFixed(1)}" y="${PANEL.stripTop}" width="${width.toFixed(1)}" height="${
      PANEL.stripHeight
    }" rx="1.5" />`,
    `<text class="bound" x="${left}" y="${PANEL.boundBaseline}">${escaped(trimmed(spec.lower, 3))}</text>`,
    `<text class="bound end" x="${right}" y="${PANEL.boundBaseline}">${escaped(trimmed(spec.upper, 3))}</text>`,
  ].join("");
}

function dotPlot(spec, rolls, marks) {
  const domain = domainOf(spec, marks);
  const y = linearScale(domain, [PANEL.plotBottom, PANEL.plotTop]);
  const rules = [PANEL.plotTop, PANEL.plotBottom]
    .map(
      (at) =>
        `<line class="rule" x1="${PANEL.left}" y1="${at}" x2="${PANEL.width - PANEL.right}" y2="${at}" />`,
    )
    .join("");
  const ticks = [
    `<text class="tick" x="${PANEL.left - 6}" y="${PANEL.plotTop}" dy="0.32em">${escaped(
      trimmed(domain[1], 3),
    )}</text>`,
    `<text class="tick" x="${PANEL.left - 6}" y="${PANEL.plotBottom}" dy="0.32em">${escaped(
      trimmed(domain[0], 3),
    )}</text>`,
  ].join("");
  const tags = rolls
    .map(
      (roll, index) =>
        `<text class="tag" x="${slotCentre(index).toFixed(1)}" y="${PANEL.tagBaseline}">${escaped(roll.tag)}</text>`,
    )
    .join("");
  return `<svg class="plot" viewBox="0 0 ${PANEL.width} ${PANEL.height}" role="img" aria-label="${escaped(
    `${spec.name} on six rolls, bass and discant`,
  )}">${rules}${ticks}${tags}${marks
    .map((mark) => drawnMark(mark, rolls, y))
    .join("")}${boxStrip(spec, domain)}</svg>`;
}

function panel(spec, rolls, marks) {
  return `<figure class="panel">
  <figcaption><span class="param">${escaped(spec.name)}</span><span class="unit">${escaped(spec.unit)}</span></figcaption>
  ${dotPlot(spec, rolls, marks)}
  <p class="note">${escaped(spec.note)}</p>
</figure>`;
}

// ------------------------------------------------------------------ the sections

function specsIn(group, spec) {
  return group.parameters.map((name) => spec.find((entry) => entry.name === name)).filter(Boolean);
}

function constantCell(mark) {
  if (!mark) return "settled";
  const bound = mark.bound === "upper" ? " ↑" : mark.bound === "lower" ? " ↓" : "";
  const pinned = mark.pinned ? " †" : "";
  const spread = mark.spread === undefined ? "" : ` ±${trimmed(mark.spread, 2)}`;
  return `${trimmed(mark.value, 4)}${bound}${pinned}${spread}`;
}

function valueTable(specs, rolls, half) {
  const head = ["parameter", "unit", ...rolls.map((roll) => roll.tag)];
  const body = specs.map((spec) => {
    const cells = rolls.map((roll) => constantCell(markOf(roll, half, spec)));
    return [`<code>${escaped(spec.name)}</code>`, escaped(spec.unit), ...cells.map(escaped)];
  });
  return `<h4 class="table-head">${escaped(half.label)}</h4>
${htmlTable(head, body, { numericFrom: 2 })}`;
}

function htmlTable(head, body, { numericFrom = 1 } = {}) {
  const cellClass = (index) => (index >= numericFrom ? ' class="num"' : "");
  const headRow = head.map((cell, index) => `<th${cellClass(index)}>${cell}</th>`).join("");
  const rows = body
    .map((row) => `<tr>${row.map((cell, index) => `<td${cellClass(index)}>${cell}</td>`).join("")}</tr>`)
    .join("\n");
  return `<div class="scroll"><table><thead><tr>${headRow}</tr></thead><tbody>
${rows}
</tbody></table></div>`;
}

/** The summary's reading of one group, roll by roll, where it has one. */
function perRollVerdicts(group, rolls) {
  const said = rolls
    .map((roll) => ({ roll, verdict: verdictIn(roll.verdicts, group.verdictKeys) }))
    .filter((entry) => entry.verdict);
  if (said.length === 0) return "";
  return `<dl class="per-roll">${said
    .map((entry) => `<dt>${escaped(entry.roll.tag)}</dt><dd>${escaped(entry.verdict)}</dd>`)
    .join("")}</dl>`;
}

function groupSection(group, spec, rolls, summary) {
  const specs = specsIn(group, spec);
  const plotted = specs
    .map((entry) => ({ spec: entry, marks: marksOf(rolls, entry) }))
    .filter((entry) => entry.marks.length > 0);
  const settled = specs.filter((entry) => !plotted.some((shown) => shown.spec === entry));
  const verdict = verdictIn(summary.verdicts, group.verdictKeys);
  return `<section class="group" id="${group.slug}">
  <h3>${escaped(group.name)}</h3>
  <p class="blurb">${escaped(group.blurb)}</p>
  ${verdict ? `<p class="verdict">${escaped(verdict)}</p>` : ""}
  <div class="panels">
${plotted.map((entry) => panel(entry.spec, rolls, entry.marks)).join("\n")}
  </div>
  ${
    settled.length === 0
      ? ""
      : `<p class="settled">Settled before any fit and identical on all six rolls, so not plotted: ${settled
          .map((entry) => `<code>${escaped(entry.name)}</code>`)
          .join(", ")}. Their values are in <span class="file">docs/rolls-round1.md</span>.</p>`
  }
  <details>
    <summary>${escaped(group.name)} roll by roll, and as numbers</summary>
${perRollVerdicts(group, rolls)}
${HALVES.map((half) => valueTable(plotted.map((entry) => entry.spec), rolls, half)).join("\n")}
  </details>
</section>`;
}

// -------------------------------------------------------------------- heat maps

function transferIndex(cells) {
  return new Map(cells.map((cell) => [`${cell.from}|${cell.onto}|${cell.half}|${cell.variant}`, cell]));
}

function binOf(value, domain) {
  const share = (value - domain[0]) / (domain[1] - domain[0] || 1);
  return Math.min(RAMP.light.length - 1, Math.max(0, Math.floor(share * RAMP.light.length)));
}

function heatCellTitle(cell, from, onto) {
  const held = cell.heldOutRmse === undefined ? "" : `, held out ${fixed(cell.heldOutRmse, 4)}`;
  return escaped(
    `${from.druid} on ${onto.druid}: RMSE ${fixed(cell.rmse, 4)} over ${grouped(cell.rows)} rows, r ${fixed(
      cell.correlation,
      3,
    )}, bias ${fixed(cell.bias, 4)}${held}`,
  );
}

function heatMap(rolls, index, half, variant, domain) {
  const head = [
    '<th class="corner">constants of ↓ &nbsp;on →</th>',
    ...rolls.map((roll) => `<th>${escaped(roll.tag)}</th>`),
  ].join("");
  const rows = rolls
    .map((from) => {
      const cells = rolls
        .map((onto) => {
          const cell = index.get(`${from.druid}|${onto.druid}|${half.key}|${variant}`);
          if (!cell) return '<td class="num">—</td>';
          const diagonal = from === onto ? " diagonal" : "";
          return `<td class="num cell-${binOf(cell.rmse, domain)}${diagonal}" title="${heatCellTitle(
            cell,
            from,
            onto,
          )}">${fixed(cell.rmse, 3)}</td>`;
        })
        .join("");
      return `<tr><th scope="row">${escaped(from.tag)}</th>${cells}</tr>`;
    })
    .join("\n");
  return `<figure class="matrix">
  <figcaption>${escaped(`${variant}, ${half.label}`)}</figcaption>
  <div class="scroll"><table class="heat"><thead><tr>${head}</tr></thead><tbody>
${rows}
</tbody></table></div>
</figure>`;
}

function rampLegend(domain) {
  const steps = RAMP.light.map((_, bin) => `<span class="swatch cell-${bin}"></span>`).join("");
  return `<div class="ramp"><span class="ramp-head">RMSE</span><span class="edge">${escaped(
    fixed(domain[0], 3),
  )}</span><span class="steps">${steps}</span><span class="edge">${escaped(
    fixed(domain[1], 3),
  )}</span><span class="edge note-inline">equal steps over all four matrices</span></div>`;
}

function reading(rolls, index, variant) {
  const perHalf = HALVES.map((half) => {
    const rows = rolls.map((from) => {
      const cells = rolls.map((onto) => ({ onto, cell: index.get(`${from.druid}|${onto.druid}|${half.key}|${variant}`) }));
      const best = cells.reduce((lowest, entry) => (entry.cell.rmse < lowest.cell.rmse ? entry : lowest));
      return { from, best };
    });
    return { half, onDiagonal: rows.filter((row) => row.best.onto === row.from).length, total: rows.length };
  });
  const foreign = rolls
    .flatMap((from) =>
      rolls.flatMap((onto) =>
        from === onto
          ? []
          : HALVES.map((half) => ({
              from,
              onto,
              half,
              cell: index.get(`${from.druid}|${onto.druid}|${half.key}|${variant}`),
            })),
      ),
    )
    .reduce((lowest, entry) => (entry.cell.rmse < lowest.cell.rmse ? entry : lowest));
  const own = index.get(`${foreign.onto.druid}|${foreign.onto.druid}|${foreign.half.key}|${variant}`);
  const counts = perHalf.every((entry) => entry.onDiagonal === entry.total)
    ? "Every row's smallest value is on the diagonal, in both halves"
    : `The row minimum is on the diagonal in ${perHalf
        .map((entry) => `${entry.onDiagonal} of ${entry.total} rows in the ${entry.half.label}`)
        .join(" and ")}`;
  return `${counts}; the nearest a foreign set comes is ${foreign.from.druid} on ${foreign.onto.druid}, ${fixed(
    foreign.cell.rmse,
    4,
  )} in the ${foreign.half.label} against that roll's own ${fixed(own?.rmse, 4)}.`;
}

// ----------------------------------------------------------------- travel times

const NEVER = "never reached";
/** The integrator stops here, which means the target lies short of the destination. */
const INTEGRATOR_LIMIT = "30000";

function travelCell(value) {
  const reached = value !== NEVER && value !== INTEGRATOR_LIMIT && value !== "—";
  return reached
    ? `<td class="num">${escaped(grouped(Number(value)))}</td>`
    : `<td class="num absent">${NEVER}</td>`;
}

function travelTable(rolls, travels) {
  const spans = [...new Set(travels.map((travel) => travel.span))];
  const head = [
    '<th class="wrap">roll</th>',
    "<th>half</th>",
    ...spans.map((span) => `<th class="num wrap">${escaped(span)}</th>`),
  ].join("");
  const rows = rolls
    .flatMap((roll) =>
      HALVES.map((half) => {
        const cells = spans
          .map((span) =>
            travelCell(
              travels.find(
                (travel) => travel.druid === roll.druid && travel.half === half.key && travel.span === span,
              )?.ms ?? "—",
            ),
          )
          .join("");
        const opens = half === HALVES[0] && roll !== rolls[0] ? ' class="opens"' : "";
        return `<tr${opens}><th scope="row">${escaped(roll.tag)}</th><td>${escaped(half.label)}</td>${cells}</tr>`;
      }),
    )
    .join("\n");
  const schmitz = spans
    .map((span) => `<td class="num">${escaped(travels.find((travel) => travel.span === span)?.schmitz ?? "—")}</td>`)
    .join("");
  return `<div class="scroll"><table class="travel"><thead><tr>${head}</tr></thead><tbody>
${rows}
<tr class="reference"><th scope="row" colspan="2">Schmitz 1981, Bild 4</th>${schmitz}</tr>
</tbody></table></div>`;
}

// ----------------------------------------------------------------- a later round

/** The later round keys its numbers by whatever names the roll, so try each. */
function forRoll(source, roll) {
  if (!source) return undefined;
  return source[String(roll.welte)] ?? source[roll.druid] ?? source[roll.tag];
}

/**
 * Round 1 beside round 2, in the two quantities the block's own note allows to be
 * quoted from a comparison that has not been regenerated on its traces.
 */
function laterTable(later, rolls) {
  const rmse = firstOf(later, ["heldOutRmseRound2", "heldOutRmse", "rmse"]);
  const spread = firstOf(later, ["seedSpreadRound2", "seedSpread", "spread"]);
  const columns = [
    rmse && {
      head: "held-out RMSE, round 1",
      subs: HALVES.map((half) => half.label),
      cells: (roll) => HALVES.map((half) => fixed(roll.fitted[half.key].test.rmse, 4)),
    },
    rmse && {
      head: "held-out RMSE, round 2",
      subs: HALVES.map((half) => half.label),
      cells: (roll) => HALVES.map((half) => fixed(finiteOr(forRoll(rmse, roll)?.[half.key]), 4)),
    },
    spread && {
      head: "seed spread",
      subs: ["round 1", "round 2"],
      cells: (roll) => [fixed(roll.spread?.heldOutRmse, 4), fixed(finiteOr(forRoll(spread, roll)), 4)],
    },
  ].filter(Boolean);
  if (columns.length === 0) return "";

  const head = `<tr><th rowspan="2">roll</th>${columns
    .map((column) => `<th class="num" colspan="${column.subs.length}">${escaped(column.head)}</th>`)
    .join("")}</tr>`;
  const subHead = `<tr>${columns
    .flatMap((column) => column.subs.map((sub) => `<th class="num">${escaped(sub)}</th>`))
    .join("")}</tr>`;
  const rows = rolls
    .map(
      (roll) =>
        `<tr><th scope="row">${escaped(roll.tag)}</th>${columns
          .flatMap((column) => column.cells(roll))
          .map((cell) => `<td class="num">${escaped(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("\n");
  return `<div class="scroll"><table><thead>${head}${subHead}</thead><tbody>
${rows}
</tbody></table></div>`;
}

/** Where the later round's own files stand, in whichever of these the block carries. */
function laterProvenance(later) {
  const notes = [
    ["status", firstOf(later, ["status"])],
    ["files", firstOf(later, ["source", "files"])],
    ["verification", firstOf(later, ["verification", "crossChecks"])],
  ].filter(([, said]) => typeof said === "string");
  const command = firstOf(later, ["regenerate", "command"]);
  if (notes.length === 0 && !command) return "";
  return `<details>
      <summary>Where the round-2 comparison stands</summary>
      <dl class="per-roll">${notes
        .map(([label, said]) => `<dt>${escaped(label)}</dt><dd>${escaped(said)}</dd>`)
        .join("")}</dl>
      ${command ? `<pre class="command">${escaped(command)}</pre>` : ""}
    </details>`;
}

function laterSection(later, rolls) {
  if (!later) return "";
  const verdict = firstOf(later, ["verdict", "summary"]);
  const changed = firstOf(later, ["whatChanged", "changes"]);
  const why = firstOf(later, ["why", "caveat", "caveats"]);
  const readFrom = firstOf(later, ["tablesReadFrom"]) ?? 1;
  return `<section id="round-two">
    <h2>Round 2</h2>
    <p class="caption">Everything above is the round-${readFrom} comparison, the one every figure in the three
    sections above was computed from. A second fit was run on improved traces, and what it settles is carried
    here.</p>
    ${verdict ? `<p class="verdict">${escaped(verdict)}</p>` : ""}
    ${changed ? `<p class="caption">${escaped(changed)}</p>` : ""}
    ${laterTable(later, rolls)}
    ${why ? `<p class="caption">${escaped(why)}</p>` : ""}
    ${laterProvenance(later)}
  </section>`;
}

// ------------------------------------------------------------------- the roll list

function rollTable(rolls) {
  const spanned = ["rows observed", "held-out RMSE"]
    .map((head) => `<th class="num" colspan="2">${head}</th>`)
    .join("");
  const named = rolls.every((roll) => roll.tag === String(roll.welte)) ? "Welte" : "roll";
  const stacked = [named, "performer and title", "druid"]
    .map((head) => `<th rowspan="2">${head}</th>`)
    .join("");
  const head = `<tr>${stacked}${spanned}<th class="num" rowspan="2">seed spread</th></tr>`;
  const subHead = `<tr>${["rows observed", "held-out RMSE"]
    .flatMap(() => HALVES.map((half) => `<th class="num">${escaped(half.label)}</th>`))
    .join("")}</tr>`;
  const rows = rolls
    .map((roll) => {
      const cells = [
        `<td class="wrap">${roll.performer === undefined ? "" : escaped(roll.performer)}${
          roll.title === undefined ? "" : `<br /><span class="share">${escaped(roll.title)}</span>`
        }</td>`,
        `<td><code>${escaped(roll.druid)}</code></td>`,
        ...HALVES.map(
          (half) =>
            `<td class="num">${grouped(roll.measured[half.key].observedRows)} <span class="share">${percentage(
              roll.measured[half.key].observedRows,
              roll.rows,
            )}</span></td>`,
        ),
        ...HALVES.map((half) => `<td class="num">${fixed(roll.fitted[half.key].test.rmse, 4)}</td>`),
        `<td class="num">${
          roll.spread
            ? `${fixed(roll.spread.heldOutRmse, 4)} <span class="share">seeds ${escaped(
                roll.spread.seeds.join(", "),
              )}</span>`
            : "—"
        }</td>`,
      ].join("");
      return `<tr><th scope="row"><span class="tag-chip">${escaped(roll.tag)}</span></th>${cells}</tr>`;
    })
    .join("\n");
  return `<div class="scroll"><table class="rolls"><thead>${head}${subHead}</thead><tbody>
${rows}
</tbody></table></div>`;
}

// ------------------------------------------------------------------------- style

function tokens(mode) {
  const dark = mode === "dark";
  const ramp = RAMP[mode]
    .map((step, index) => `  --ramp-${index}: ${step};\n  --ramp-ink-${index}: ${RAMP_INK[mode][index]};`)
    .join("\n");
  return `  color-scheme: ${mode};
  --ground: ${dark ? "#0f1114" : "#ffffff"};
  --wash: ${dark ? "#171a1f" : "#f9fafb"};
  --wash-strong: ${dark ? "#1d2127" : "#f3f4f6"};
  --rule: ${dark ? "#2a2f36" : "#e5e7eb"};
  --rule-strong: ${dark ? "#3d444d" : "#d1d5db"};
  --ink: ${dark ? "#f3f4f6" : "#111827"};
  --ink-soft: ${dark ? "#d3d8de" : "#374151"};
  --ink-muted: ${dark ? "#9ba3ad" : "#6b7280"};
  --ink-faint: ${dark ? "#767e88" : "#9ca3af"};
  --bass: ${dark ? "#3987e5" : "#2a78d6"};
  --discant: ${dark ? "#d95926" : "#eb6834"};
${ramp}`;
}

function style() {
  const rampClasses = RAMP.light
    .map((_, index) => `.cell-${index} { background: var(--ramp-${index}); color: var(--ramp-ink-${index}); }`)
    .join("\n");
  return `<style>
:root {
${tokens("light")}
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  --sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${tokens("dark")}
  }
}
:root[data-theme="dark"] {
${tokens("dark")}
}

body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.55;
  -webkit-text-size-adjust: 100%;
}
main { max-width: 1120px; margin: 0 auto; padding: 56px 28px 96px; }
h1, h2, h3 { font-family: var(--serif); font-weight: 600; text-wrap: balance; margin: 0; }
h1 { font-size: 40px; line-height: 1.12; letter-spacing: -0.01em; }
h2 { font-size: 25px; }
h3 { font-size: 19px; }
p { margin: 0; }
code, .file { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; }
a { color: inherit; }

.lede { display: flex; flex-direction: column; gap: 18px; }
.eyebrow {
  font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-muted); font-weight: 600;
}
.headline { font-family: var(--serif); font-size: 18.5px; line-height: 1.5; color: var(--ink-soft); max-width: 66ch; }
.standfirst { color: var(--ink-muted); max-width: 68ch; }

section { margin-top: 64px; display: flex; flex-direction: column; gap: 18px; }
section > h2 { display: flex; align-items: baseline; gap: 12px; }
.ordinal { font-family: var(--sans); font-size: 12px; font-weight: 600; color: var(--ink-faint); letter-spacing: 0.08em; }
.blurb, .verdict, .caption { max-width: 72ch; }
.blurb { color: var(--ink-muted); font-size: 14px; }
.verdict {
  font-family: var(--serif); font-size: 17px; line-height: 1.5; color: var(--ink);
  border-left: 2px solid var(--rule-strong); padding-left: 14px;
}
.caption { color: var(--ink-muted); font-size: 13.5px; }
.settled { color: var(--ink-faint); font-size: 13px; max-width: 82ch; }

.scroll { overflow-x: auto; }
table { border-collapse: collapse; font-size: 13px; width: 100%; }
th, td { padding: 7px 10px; text-align: left; border-bottom: 1px solid var(--rule); white-space: nowrap; }
thead th { color: var(--ink-muted); font-weight: 600; font-size: 11.5px; letter-spacing: 0.03em; }
tbody th { font-weight: 600; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
tbody tr:last-child td, tbody tr:last-child th { border-bottom: none; }
.share { color: var(--ink-faint); font-size: 11.5px; }
.wrap { white-space: normal; max-width: 26ch; line-height: 1.35; }
thead th[colspan] { text-align: center; border-bottom: none; padding-bottom: 0; }
table.rolls tbody th { vertical-align: top; }
.tag-chip {
  display: inline-block; padding: 1px 7px; border-radius: 3px;
  background: var(--wash-strong); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px;
}

.group { gap: 14px; }
.panels { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 26px 22px; align-items: start; }
.panel { margin: 0; display: flex; flex-direction: column; gap: 4px; }
.panel figcaption { display: flex; align-items: baseline; gap: 8px; border-bottom: 1px solid var(--rule); padding-bottom: 4px; }
.param { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; font-weight: 600; }
.unit { color: var(--ink-faint); font-size: 11.5px; }
.plot { width: 100%; height: auto; display: block; }
.note { color: var(--ink-faint); font-size: 11.5px; line-height: 1.45; }

.rule { stroke: var(--rule); stroke-width: 1; }
.bar { stroke-width: 1.6; opacity: 0.45; }
.bar.bass, .mark.bass { stroke: var(--bass); }
.bar.discant, .mark.discant { stroke: var(--discant); }
.mark.bass { fill: var(--bass); }
.mark.discant { fill: var(--discant); }
.mark { stroke: var(--ground); stroke-width: 1.2; }
.tick, .tag, .bound { fill: var(--ink-faint); font-family: var(--sans); font-variant-numeric: tabular-nums; }
.tick { font-size: 9.5px; text-anchor: end; }
.tag { font-size: 9.5px; text-anchor: middle; }
.bound { font-size: 9px; }
.bound.end { text-anchor: end; }
.strip-track { fill: var(--wash-strong); stroke: var(--rule-strong); stroke-width: 1; }
.strip-window { fill: var(--ink-faint); }

.legend { display: flex; flex-wrap: wrap; gap: 8px 22px; align-items: center; font-size: 12.5px; color: var(--ink-muted); }
.legend .key { display: inline-flex; align-items: center; gap: 6px; }
.legend svg { display: block; overflow: visible; }

details {
  border-top: 1px solid var(--rule); padding-top: 10px; margin-top: 6px;
}
summary { cursor: pointer; font-size: 12.5px; color: var(--ink-muted); }
summary:focus-visible { outline: 2px solid var(--bass); outline-offset: 3px; }
.table-head { font-family: var(--sans); font-size: 11.5px; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--ink-faint); margin: 16px 0 4px; }
.per-roll { display: grid; grid-template-columns: max-content 1fr; gap: 7px 14px; margin: 14px 0 4px;
  font-size: 13px; line-height: 1.5; max-width: 88ch; }
.per-roll dt { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--ink-muted); }
.per-roll dd { margin: 0; color: var(--ink-soft); }

.matrices { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 26px 24px; }
.matrix { margin: 0; display: flex; flex-direction: column; gap: 8px; }
.matrix figcaption { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-muted); font-weight: 600; }
table.heat { font-size: 12px; }
table.heat th, table.heat td { border: none; padding: 6px 8px; }
table.heat thead th, table.heat tbody th {
  color: var(--ink-muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 500; font-size: 11px;
}
table.heat tbody th { text-align: right; }
table.heat .corner { text-align: left; font-family: var(--sans); }
table.heat td { text-align: right; font-variant-numeric: tabular-nums; }
.diagonal { outline: 2px solid var(--ink); outline-offset: -2px; }
${rampClasses}
.ramp { display: flex; flex-wrap: wrap; align-items: center; gap: 0 8px;
  font-size: 11px; color: var(--ink-muted); font-variant-numeric: tabular-nums; }
.ramp-head { letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; }
.ramp .steps { display: inline-flex; }
.swatch { display: inline-block; width: 30px; height: 11px; }
.ramp .steps .swatch:first-child { border-radius: 2px 0 0 2px; }
.ramp .steps .swatch:last-child { border-radius: 0 2px 2px 0; }
.note-inline { color: var(--ink-faint); }

.command { margin: 8px 0 0; padding: 10px 12px; background: var(--wash); border: 1px solid var(--rule);
  border-radius: 3px; overflow-x: auto; font-size: 11.5px; line-height: 1.6; color: var(--ink-soft);
  white-space: pre-wrap; word-break: break-word; }

.absent { color: var(--ink-faint); font-size: 11.5px; }
table.travel th.wrap { white-space: normal; max-width: 15ch; vertical-align: bottom; }
table.travel tbody th { white-space: nowrap; font-weight: 600; font-variant-numeric: tabular-nums; }
table.travel tr.opens th, table.travel tr.opens td { border-top: 1px solid var(--rule); }
table.travel tr.reference th, table.travel tr.reference td {
  border-top: 1px solid var(--rule-strong); border-bottom: none; color: var(--ink-muted); background: var(--wash);
}

.closing { margin-top: 64px; border-top: 1px solid var(--rule); padding-top: 20px; display: flex; flex-direction: column; gap: 12px; }
.closing p { color: var(--ink-muted); font-size: 13.5px; max-width: 74ch; }
.closing strong { color: var(--ink); font-weight: 600; }
.closing h3 { margin-top: 8px; }
.limitations { color: var(--ink-muted); font-size: 13.5px; max-width: 74ch; margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 5px; }
</style>`;
}

// -------------------------------------------------------------------- the legend

function legendMark(shape) {
  const marks = {
    circle: '<circle class="mark bass" cx="8" cy="8" r="3.6" /><circle class="mark discant" cx="20" cy="8" r="3.6" />',
    diamond:
      '<polygon class="mark bass" points="8,3.4 12.6,8 8,12.6 3.4,8" /><polygon class="mark discant" points="20,3.4 24.6,8 20,12.6 15.4,8" />',
    triangle: '<polygon class="mark bass" points="8,3 3.4,11 12.6,11" />',
    bar: '<line class="bar bass" x1="8" y1="1" x2="8" y2="15" /><circle class="mark bass" cx="8" cy="8" r="3.6" />',
  };
  const width = shape === "triangle" || shape === "bar" ? 16 : 28;
  return `<svg width="${width}" height="16" viewBox="0 0 ${width} 16" aria-hidden="true">${marks[shape]}</svg>`;
}

function legend() {
  const keys = [
    ["circle", "fitted, bass and discant"],
    ["diamond", "measured on this roll and pinned in the fit's first stage"],
    ["triangle", "resting on its own bound, so the bound is setting it"],
    ["bar", "how far the second seed run sat"],
  ];
  return `<div class="legend">${keys
    .map(([shape, text]) => `<span class="key">${legendMark(shape)}${escaped(text)}</span>`)
    .join("")}</div>`;
}

// ----------------------------------------------------------------------- the page

function page(data, spec, rolls, summary) {
  const index = transferIndex(data.transfer);
  const rmses = data.transfer.map((cell) => cell.rmse);
  const domain = [Math.min(...rmses), Math.max(...rmses)];
  const sources = [...new Set(data.rolls.map((roll) => roll.fit))];
  const travelVerdict = verdictIn(summary.verdicts, TRAVEL_VERDICT_KEYS);
  return `<title>Constants across rolls</title>
${style()}
<main>
  <header class="lede">
    <p class="eyebrow">Welte-Mignon T-100 · pneumatic emulator · round 1</p>
    <h1>Constants across rolls</h1>
    ${summary.headline ? `<p class="headline">${escaped(summary.headline)}</p>` : ""}
    <p class="standfirst">Six SUPRA rolls with a drawn Handnuancierung line, each fitted on its own with the
    <code>${escaped(data.model)}</code> model, two seeds per roll and half. The question is which of the fitted
    constants belong to the mechanism and which to the instrument or to the day the line was drawn. Every figure
    here comes from <span class="file">docs/rolls-round1.json</span>, written by <span class="file">src/cli/compare.ts</span>
    from ${sources.length} fit ${sources.length === 1 ? "file" : "files"}; the section numbers follow
    <span class="file">docs/rolls-round1.md</span>. The rows observed are what the round-1 trace witnessed, which is
    the trace these fits ran on; a later trace of the same roll may cover more of it.</p>
    ${rollTable(rolls)}
  </header>

  <section id="constants">
    <h2><span class="ordinal">1</span>Constants</h2>
    <p class="caption">One panel per parameter, six rolls across, bass and discant as two marks. Values on the
    printed scale of the roll unless the unit says otherwise: 0 is that half's P.P. gridline, 0.5 the Mezzoforte
    line, 1 the shared F.F. line. Each panel is zoomed to what the rolls occupy, so the strip under the plot shows
    the whole searched box as a track with the shown slice filled in.</p>
    ${legend()}
${GROUPS.map((group) => groupSection(group, spec, rolls, summary)).join("\n")}
  </section>

  <section id="transfer">
    <h2><span class="ordinal">2</span>Transfer</h2>
    <p class="caption">RMSE of the row roll's constants run on the column roll's punched code, against the column
    roll's drawn line, over every row that roll's tracer witnessed. The diagonal is therefore the whole roll rather
    than the held-out number the fit reports, which the table above carries; hovering a cell gives both.
    <em>As fitted</em> takes the row's parameters unchanged. <em>Re-registered</em> replaces <code>piano</code>,
    <code>forte</code> and <code>leadRows</code> with the column roll's own measured values wherever its trace
    settles them, those three being where the pen sat on that sheet rather than anything about the mechanism.
    One ramp over all four matrices, so they may be read against one another.</p>
    ${rampLegend(domain)}
${VARIANTS.map(
  (variant) => `    <div class="matrices">
${HALVES.map((half) => heatMap(rolls, index, half, variant, domain)).join("\n")}
    </div>
    <p class="caption">${escaped(reading(rolls, index, variant))}</p>`,
).join("\n")}
  </section>

  <section id="travel">
    <h2><span class="ordinal">3</span>Travel times</h2>
    <p class="caption">Milliseconds of free travel from <span class="file">src/model/timings.ts</span>: nothing is
    clamped, the Mezzoforte pin is ignored, and the integration runs in the model's own bellows travel, which
    <code>scaleWarp</code> bends onto the printed scale afterwards. The last row is Schmitz 1981, Bild 4, as
    <span class="file">docs/sources.md</span> digitises it, from other rolls and from a hand drawing. His decay is a
    time constant, so the column it belongs to is the e-folding time rather than a traversal. A span the target lies
    short of is marked as never reached, which includes the integrator's own 30&#8239;000&#8239;ms limit.</p>
    ${travelVerdict ? `<p class="verdict">${escaped(travelVerdict)}</p>` : ""}
    ${travelTable(rolls, data.travel)}
  </section>

${laterSection(summary.later, rolls)}

  <section class="closing">
    <h3>Reading the seed spread</h3>
    <p>The bar through each mark is <strong>the absolute difference between the two seed runs</strong> of that roll
    and half, laid off in both directions because the fit files record the size of the difference and not the side
    the other seed fell on. It is a spread between two runs, not a standard deviation and not a confidence interval:
    two runs say only that the search reached these two places, and a third seed could sit outside the bar. Where
    the bar would leave the parameter's box it is cut at the wall, the other seed having been searched inside the
    same box.</p>
    <p>What the bar is for: a difference between two rolls smaller than their bars is a difference between runs and
    carries nothing about the rolls. A parameter whose six marks scatter well beyond their bars is one the rolls
    genuinely disagree on, and only then is it worth asking whether the mechanism, the regulation or the drawing
    apparatus is the reason.</p>
    ${
      summary.limitations.length === 0
        ? ""
        : `<h3>What this round cannot settle</h3>
    <ul class="limitations">${summary.limitations
      .map((limitation) => `<li>${escaped(limitation)}</li>`)
      .join("")}</ul>`
    }
  </section>
</main>
`;
}

// ------------------------------------------------------------------------- main

function checkAssignments(spec) {
  const assigned = new Set(GROUPS.flatMap((group) => group.parameters));
  const missing = spec.filter((entry) => !assigned.has(entry.name)).map((entry) => entry.name);
  if (missing.length > 0) throw new Error(`no group for ${missing.join(", ")}; add them to GROUPS`);
  const unknown = [...assigned].filter((name) => !spec.some((entry) => entry.name === name));
  if (unknown.length > 0) throw new Error(`GROUPS names ${unknown.join(", ")}, which the model spec does not have`);
}

function reportUnusedVerdicts(summary) {
  const used = new Set([...GROUPS.flatMap((group) => group.verdictKeys), ...TRAVEL_VERDICT_KEYS]);
  const unused = [...summary.verdicts.keys()].filter((key) => !used.has(key));
  if (unused.length > 0) process.stderr.write(`summary verdicts with no group here: ${unused.join(", ")}\n`);
}

/** The summary is written by another tool and may not be there yet. */
function existsOrNothing(path) {
  try {
    readFileSync(path);
    return path;
  } catch {
    process.stderr.write(`no summary at ${path}; building without it\n`);
    return "";
  }
}

function main() {
  const dataPath = positional("docs/rolls-round1.json");
  const outPath = option("out", "docs/rolls.html");
  const specPath = option("spec", resolve(HERE, "..", "src", "model", "pneumatic.ts"));
  const summaryPath = option("summary", "");

  const data = JSON.parse(readFileSync(dataPath, "utf8"));
  const spec = readSpec(specPath);
  checkAssignments(spec);

  const summary = readSummary(summaryPath && existsOrNothing(summaryPath));
  reportUnusedVerdicts(summary);
  const rolls = rollsFrom(data, summary);

  writeFileSync(outPath, page(data, spec, rolls, summary));

  const built = readFileSync(outPath, "utf8");
  const named = (label, pattern) => {
    const found = [...new Set([...built.matchAll(pattern)].map((match) => match[0]))];
    process.stderr.write(`${label}: ${found.length === 0 ? "none" : found.join(", ")}\n`);
  };
  process.stderr.write(
    `wrote ${outPath}: ${(Buffer.byteLength(built) / 1024).toFixed(0)} kB, ${rolls.length} rolls, summary ${
      summary.present ? "read" : "absent"
    }\n`,
  );
  named("http(s) anywhere in the file", /https?:\/\/[^\s"'<>)]+/g);
  named("fetched by markup or css", /(?:\bsrc|\bhref)\s*=\s*["'][^"']*["']|url\(\s*[^)]*\)|@import[^;]*/gi);
  named("document wrapper", /<!doctype|<\/?html\b|<\/?head\b|<\/?body\b/gi);
}

main();
