/**
 * Render every route of the built page in Node, with a DOM thin enough to be obvious.
 *
 * A single-file viewer has no build step to fail, so the only way a broken route shows up
 * is by opening it. This walks all of them instead: every statement, question, source and
 * entity, plus the home and search views.
 *
 *   python -m kg.build view && node --test kg/view/
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const page = join(here, "..", "out", "graph.html");
const styles = readFileSync(page, "utf8").match(/<style>([\s\S]*?)<\/style>/)[1];

function load() {
  const html = readFileSync(page, "utf8");
  const data = html.match(
    /<script id="graph-data" type="application\/json">([\s\S]*?)<\/script>/,
  )?.[1];
  const script = html.match(/<script>\n"use strict";([\s\S]*?)<\/script>/)?.[1];
  assert.ok(data, "the page carries no data block");
  assert.ok(script, "the page carries no application script");

  const created = [];
  const make = () => {
    const node = {
      children: [],
      style: {},
      textContent: "",
      innerHTML: "",
      attrs: {},
      classes: new Set(),
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return this.attrs[k] ?? null; },
      appendChild(child) { this.children.push(child); return child; },
      replaceChildren() { this.children = []; },
      addEventListener() {},
      classList: {
        add(...c) { node.classes.add(...c); },
        remove(...c) { c.forEach(x => node.classes.delete(x)); },
        toggle(c, on) { on ? node.classes.add(c) : node.classes.delete(c); },
        contains(c) { return node.classes.has(c); },
      },
    };
    created.push(node);
    return node;
  };

  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        ...make(),
        id,
        textContent: "",
        innerHTML: "",
        value: "",
        dataset: {},
        scrollTop: 0,
        listeners: {},
        addEventListener(type, handler) { this.listeners[type] = handler; },
        setAttribute() {},
        getAttribute: () => null,
        focus() {},
        blur() {},
        querySelectorAll: () => [],
      });
    }
    return elements.get(id);
  };

  const context = {}; Object.assign(context, {
    document: {
      getElementById: element,
      createElementNS: () => make(),
      documentElement: element("html"),
      querySelectorAll: () => [],
      activeElement: null,
    },
    requestAnimationFrame: () => 0,
    Math,
    location: { hash: "" },
    listeners: {},
    addEventListener(type, handler) { context.listeners[type] = handler; },
    matchMedia: () => ({ matches: false }),
    // The search box debounces; run the callback at once so a test can see the effect.
    setTimeout: callback => { callback(); return 0; },
    clearTimeout() {},
    console,
  });
  context.window = context;
  context.globalThis = context;

  // The data block is read through document.getElementById, so hand it back here.
  element("graph-data").textContent = data;

  vm.createContext(context);
  vm.runInContext(`"use strict";${script}`, context, { filename: "app.html" });
  return {
    context,
    created,
    detail: element("detail"),
    list: element("list"),
    search: element("search"),
  };
}

const { context, created, detail, list, search } = load();
const DATA = context.DATA ?? JSON.parse(context.document.getElementById("graph-data").textContent);

function render(hash) {
  context.location.hash = hash;
  context.draw();
  return detail.innerHTML;
}

test("the home view lists the contested questions", () => {
  const html = render("");
  assert.match(html, /Where the sources disagree/);
  assert.match(html, /statements/);
});

test("every statement renders and shows its locator and holder", () => {
  const ids = Object.keys(DATA.statements);
  assert.ok(ids.length > 100, `only ${ids.length} statements`);
  for (const id of ids) {
    const html = render(`#/statement/${id}`);
    const statement = DATA.statements[id];
    assert.doesNotMatch(html, /Not found/, id);
    assert.ok(html.includes(statement.locator.replace(/&/g, "&amp;")), `no locator in ${id}`);
    assert.ok(html.includes(statement.holderLabel.replace(/&/g, "&amp;")), `no holder in ${id}`);
  }
});

test("every question renders a row per answer", () => {
  for (const question of DATA.questions) {
    const html = render(`#/question/${question.id}`);
    assert.doesNotMatch(html, /Not found/, question.id);
    const rows = html.match(/<tr onclick/g) || [];
    assert.equal(rows.length, question.statements.length, question.id);
  }
});

test("every source and entity renders", () => {
  for (const source of DATA.sources) {
    assert.doesNotMatch(render(`#/source/${source.id}`), /Not found/, source.id);
  }
  for (const entity of DATA.entities) {
    assert.doesNotMatch(render(`#/entity/${entity.id}`), /Not found/, entity.id);
  }
});

test("an unknown id says so rather than throwing", () => {
  assert.match(render("#/statement/nowhere/at-all"), /Not found/);
  assert.match(render("#/entity/nowhere"), /Not found/);
});

test("the sforzando latch question is contested and carries several holders", () => {
  const question = DATA.questions.find(
    q => q.subject === "function-sforzando-on" && q.property === "latching-behaviour",
  );
  assert.ok(question, "the latch question is missing");
  assert.equal(question.contested, true);
  assert.ok(question.holders.length >= 4, question.holders.join(", "));
  assert.match(render(`#/question/${question.id}`), /contested/);
});

test("quotations survive into the page", () => {
  const html = render("#/statement/hagemann-2001/mf-hook-blocks-both-ways");
  assert.match(html, /versperrt dem Nuancierbalg/);
  assert.match(html, /How the passage was read/);
});

function typeSearch(text) {
  search.value = text;
  search.listeners.input();
}

test("searching narrows the sidebar and highlights the hits", () => {
  typeSearch("");
  const everything = list.innerHTML.length;
  typeSearch("mezzoforte");
  assert.ok(list.innerHTML.length < everything, "search did not narrow the list");
  assert.match(detail.innerHTML, /<mark>/, "no hit was highlighted");
  typeSearch("");
  assert.equal(list.innerHTML.length, everything);
});

test("a search term with regex characters does not break the highlighter", () => {
  typeSearch("mm WS (");
  assert.doesNotMatch(detail.innerHTML, /Not found/);
  typeSearch("");
});

test("a quotation cannot inject markup", () => {
  typeSearch("<script>");
  assert.doesNotMatch(detail.innerHTML, /<script>/);
  typeSearch("");
});


/* -- the mechanism ---------------------------------------------------------- */

const MECH = DATA.mechanism;
// `rails` and `step` are function declarations and so reach the sandbox global; the RAILS
// object the page keeps is a const and does not, so the tests build their own.
const RAILS = { bass: context.rails("bass"), treble: context.rails("treble") };

function drive(K, script, dt = 0.001) {
  // Play the machine by hand: `script` says which openings are held over which seconds.
  const state = context.newState(K);
  const out = [];
  for (let t = 0; t < script.seconds; t += dt) {
    const ports = { mfOn: 0, mfOff: 0, crescOn: 0, crescOff: 0, sfOn: 0, sfOff: 0 };
    for (const [name, from, to] of script.holds) {
      if (t >= from && t < to) ports[name] = 1;
    }
    out.push(context.step(state, K, ports, dt));
  }
  return out;
}

// One passage played by hand that puts all three functions through their paces: a sforzando
// and its cancel, then a crescendo latched, caught on the hook, and let go again. The tests
// that check the drawing against the running machine read this.
const PASSAGE = {
  seconds: 16,
  holds: [
    ["sfOn", 0.3, 0.7], ["sfOff", 1.0, 1.5],
    ["crescOn", 3.0, 3.1], ["mfOn", 7.0, 7.1], ["crescOff", 7.4, 7.5],
    ["mfOff", 12.0, 12.1], ["crescOn", 13.0, 13.1], ["crescOff", 15.0, 15.1],
  ],
};
const PLAYED = { bass: drive(RAILS.bass, PASSAGE), treble: drive(RAILS.treble, PASSAGE) };

test("every drawn link has both endpoints on the schematic", () => {
  const placed = new Set(MECH.nodes.map(n => n.id));
  for (const edge of MECH.edges) {
    assert.ok(placed.has(edge.from), `${edge.from} is not placed`);
    assert.ok(placed.has(edge.to), `${edge.to} is not placed`);
  }
  assert.equal(MECH.linksNotDrawn, 0, "some links are in the graph but nowhere on the drawing");
});

test("the simulation stays between the rails it was given", () => {
  for (const half of ["bass", "treble"]) {
    const frames = PLAYED[half], K = RAILS[half];
    assert.ok(frames.length > 1000, `${half}: only ${frames.length} frames`);
    for (const f of frames) {
      assert.ok(Number.isFinite(f.x), `${half}: the trajectory left the numbers at t=${f.t}`);
      assert.ok(f.x >= K.piano - 1e-9 && f.x <= K.forte + 1e-9,
        `${half}: ${f.x} is outside [${K.piano}, ${K.forte}] at t=${f.t}`);
    }
  }
});

test("the mezzoforte hook confines the bellows to the side it engaged on", () => {
  const frames = PLAYED.bass, K = RAILS.bass;
  const held = frames.filter(f => f.mf);
  assert.ok(held.length > 500, `only ${held.length} frames with the hook set`);
  const lower = K.mezzoforte - K.mfThickness / 2;
  const upper = K.mezzoforte + K.mfThickness / 2;
  for (const f of held) {
    if (f.trappedAbove) assert.ok(f.x >= lower - 1e-9, `fell through the pin to ${f.x}`);
    else assert.ok(f.x <= upper + 1e-9, `rose through the pin to ${f.x}`);
  }
  assert.ok(held.some(f => f.clamped), "the hook never actually bore any load");
});

test("a sforzando drives the line up and the cancel brings it down", () => {
  const frames = PLAYED.bass;
  const rises = frames.filter((f, i) => i > 0 && f.sfOpen > 0.5 && f.x > frames[i - 1].x).length;
  const falls = frames.filter((f, i) => i > 0 && f.assistOpen > 0.5 && f.x < frames[i - 1].x).length;
  assert.ok(rises > 50, `the sforzando path never raised the line (${rises})`);
  assert.ok(falls > 20, `the cancel path never lowered the line (${falls})`);
});

test("every simulation constant came from a statement in the graph", () => {
  for (const [name, entry] of Object.entries(MECH.constants)) {
    for (const half of ["bass", "treble"]) {
      if (entry[half] === undefined) continue;
      const key = entry.statements?.[half];
      assert.ok(key && DATA.statements[key], `${name} (${half}) has no statement behind it`);
    }
  }
});

test("neither mode's grid rule leaks onto the other", () => {
  // An unscoped `main { grid-template-columns: 320px 1fr }` once put the schematic inside
  // the graph mode's sidebar column and left the rest of the window blank.
  const unscoped = styles.match(/^\s*main\s*\{[^}]*grid-template-columns[^}]*\}/m);
  assert.equal(unscoped, null, `an unscoped main rule sets columns: ${unscoped?.[0]}`);
  assert.match(styles, /#graph-mode\s*\{[^}]*grid-template-columns/);
  assert.match(styles, /#mech-mode\s*\{[^}]*grid-template-columns/);
  const hidesEveryAside = styles.match(/@media[^{]*\{[^}]*[^#>\w-]aside\s*\{\s*display:\s*none/);
  assert.equal(hidesEveryAside, null, "a media query hides every aside, panel included");
});

test("the drawing fits inside the viewBox it is given", () => {
  const [vx, vy, vw, vh] = MECH.viewBox.split(/\s+/).map(Number);
  for (const node of MECH.nodes) {
    const [w, h] = MECH.shapes[node.shape] || [96, 30];
    assert.ok(node.x - w / 2 >= vx, `${node.id} runs off the left`);
    assert.ok(node.x + w / 2 <= vx + vw, `${node.id} runs off the right`);
    assert.ok(node.y - h / 2 >= vy, `${node.id} runs off the top`);
    assert.ok(node.y + h / 2 + 18 <= vy + vh, `${node.id}'s caption runs off the bottom`);
  }
  const slackRight = vx + vw - Math.max(...MECH.nodes.map(n =>
    n.x + (MECH.shapes[n.shape] || [96])[0] / 2));
  assert.ok(slackRight < 60, `${slackRight}px of empty viewBox on the right`);
});

test("no two parts overlap", () => {
  const box = n => {
    const [w, h] = MECH.shapes[n.shape] || [96, 30];
    return [n.x - w / 2, n.y - h / 2, n.x + w / 2, n.y + h / 2 + 16];
  };
  for (let i = 0; i < MECH.nodes.length; i++) {
    for (let j = i + 1; j < MECH.nodes.length; j++) {
      const a = box(MECH.nodes[i]), b = box(MECH.nodes[j]);
      const hit = a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
      assert.ok(!hit, `${MECH.nodes[i].id} overlaps ${MECH.nodes[j].id}`);
    }
  }
});


test("every part on the drawing is connected to something", () => {
  const degree = new Map(MECH.nodes.map(n => [n.id, 0]));
  for (const edge of MECH.edges) {
    degree.set(edge.from, degree.get(edge.from) + 1);
    degree.set(edge.to, degree.get(edge.to) + 1);
  }
  const stranded = [...degree].filter(([, d]) => d === 0).map(([id]) => id);
  assert.deepEqual(stranded, [],
    `parts drawn with nothing attached: ${stranded.join(", ")}`);
});

test("no link is drawn twice over the same pair of parts", () => {
  const pairs = MECH.edges.map(e => `${e.from}->${e.to}`);
  assert.equal(new Set(pairs).size, pairs.length, "a line is drawn on top of another");
  for (const edge of MECH.edges) {
    assert.ok(edge.statements.length >= 1, `${edge.from}->${edge.to} cites nothing`);
    for (const key of edge.statements) {
      assert.ok(DATA.statements[key], `${edge.from}->${edge.to} cites a missing ${key}`);
    }
  }
});

test("the relay chains run from a perforation through to the bellows", () => {
  const out = new Map();
  for (const e of MECH.edges) {
    if (!out.has(e.from)) out.set(e.from, []);
    out.get(e.from).push(e.to);
    if (!out.has(e.to)) out.set(e.to, []);
    out.get(e.to).push(e.from);   // the drawing is read either way round
  }
  const reaches = (start, goal) => {
    const seen = new Set([start]), queue = [start];
    while (queue.length) {
      const at = queue.shift();
      if (at === goal) return true;
      for (const next of out.get(at) || []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    return false;
  };
  for (const opening of ["gleitblock-opening-8", "gleitblock-opening-9", "gleitblock-opening-10",
                         "gleitblock-opening-11", "gleitblock-opening-12"]) {
    assert.ok(reaches(opening, "nuancierbalg-90"),
      `${opening} does not reach the Nuancierbalg through the drawing`);
  }
  assert.ok(reaches("nuancierbalg-90", "tonerzeugungsbalg-121"),
    "the bellows does not reach the note pneumatic");
});

test("following a statement link leaves the mechanism for the graph", () => {
  // The panel's links change the hash; without switching mode the page appeared inert.
  context.setMode("mech");
  assert.equal(context.document.getElementById("graph-mode").hidden, true);
  context.location.hash = "#/statement/hagemann-2001/piano-vacuum";
  context.listeners.hashchange();
  assert.equal(context.document.getElementById("graph-mode").hidden, false);
  assert.match(detail.innerHTML, /Ibach|vacuum/);
  context.location.hash = "";
});

test("no route runs through a part", () => {
  const box = id => {
    const n = MECH.nodes.find(n => n.id === id);
    const [w, h] = MECH.shapes[n.shape] || [96, 30];
    return { l: n.x - w / 2, r: n.x + w / 2, t: n.y - h / 2, b: n.y + h / 2 };
  };
  for (const edge of MECH.edges) {
    for (const node of MECH.nodes) {
      if (node.id === edge.from || node.id === edge.to) continue;
      const a = box(node.id);
      for (let i = 0; i < edge.points.length - 1; i++) {
        const [x1, y1] = edge.points[i], [x2, y2] = edge.points[i + 1];
        const hit = Math.min(x1, x2) <= a.r && a.l <= Math.max(x1, x2)
                 && Math.min(y1, y2) <= a.b && a.t <= Math.max(y1, y2);
        assert.ok(!hit, `${edge.from}→${edge.to} runs through ${node.id}`);
      }
    }
    assert.ok(edge.points.length >= 2, `${edge.from}→${edge.to} has no route`);
  }
});

test("every caption fits inside the box that holds it", () => {
  for (const node of MECH.nodes) {
    if (node.shape === "throttle") continue;
    const [w] = MECH.shapes[node.shape] || [96, 30];
    const width = node.caption.length * 6.1;   // 11px system sans, roughly
    assert.ok(width <= w - 8, `"${node.caption}" is too wide for its ${w}px box`);
  }
});

test("the glide block reads in the order the openings sit on it", () => {
  const ports = MECH.nodes
    .filter(n => n.shape === "port")
    .sort((a, b) => a.y - b.y)
    .map(n => Number(n.caption.split(" ")[0]));
  assert.deepEqual(ports, [7, 8, 9, 10, 11, 12],
    "the perforations are not drawn in glide-block order");
});

test("a part holds air exactly while its perforation is open", () => {
  const frames = PLAYED.bass;
  let sawOpen = false, sawShut = false;
  for (const f of frames) {
    const p = context.pressures(f);
    assert.equal(p.get("membrankammer-35"), f.ports.crescOn ? "air" : "vacuum");
    assert.equal(p.get("doppelventil-38"), f.cresc ? "vacuum" : "air");
    if (f.ports.crescOn) sawOpen = true; else sawShut = true;
  }
  assert.ok(sawOpen && sawShut, "the crescendo perforation never opened, or never closed");
});

test("air runs towards the blower on a suction line and inward on an air line", () => {
  const frames = PLAYED.bass;
  const find = (from, to) => MECH.edges.find(e => e.from === from && e.to === to);
  const suction = find("windkammer-15", "doppelventil-38");
  const inlet = find("windkammer-17", "doppelventil-38");
  assert.ok(suction && inlet, "valve 38 has lost one of its two supplies");
  const latched = frames.find(f => f.cresc);
  const loose = frames.find(f => !f.cresc);
  assert.equal(context.flowOn(suction, context.pressures(latched), latched), "vacuum");
  assert.equal(context.flowOn(inlet, context.pressures(latched), latched), null);
  assert.equal(context.flowOn(inlet, context.pressures(loose), loose), "air");
  assert.equal(context.flowOn(suction, context.pressures(loose), loose), null);
});

test("conduit 39 changes what it carries with the relay", () => {
  // The project's structural reading: 39 is always joined to the bellows and its far end is
  // switched between vacuum and atmosphere, so the same line empties and refills.
  const conduit = MECH.edges.find(e =>
    e.from === "doppelventil-38" && e.to === "nuancierbalg-90");
  assert.ok(conduit, "conduit 39 is missing from the drawing");
  assert.deepEqual([...conduit.carries].sort(), ["air", "vacuum"]);
  const frames = PLAYED.bass;
  const latched = frames.find(f => f.cresc);
  const loose = frames.find(f => !f.cresc);
  assert.equal(context.flowOn(conduit, context.pressures(latched), latched), "vacuum");
  assert.equal(context.flowOn(conduit, context.pressures(loose), loose), "air");
});

test("the mezzoforte conduit works in both directions", () => {
  // It used to be dead until the hook engaged, because only the emptying was in the graph.
  const conduit = MECH.edges.find(e =>
    e.from === "doppelventil-53" && e.to === "mezzofortebalg-93");
  assert.ok(conduit, "conduit 54 is missing");
  assert.deepEqual([...conduit.carries].sort(), ["air", "vacuum"]);
  const frames = PLAYED.bass;
  const lit = frames.filter(f => context.flowOn(conduit, context.pressures(f), f));
  assert.equal(lit.length, frames.length,
    "the mezzoforte conduit is dead for part of the passage");
});

test("a link the sources do not settle is marked as such", () => {
  const unsettled = MECH.edges.filter(e => e.holds && e.holds !== "TRUE");
  assert.ok(unsettled.length >= 1, "no link carries a belief value below TRUE");
  for (const edge of unsettled) {
    for (const key of edge.statements) {
      const s = DATA.statements[key];
      if (s.holds && s.holds !== "TRUE") return;
    }
  }
  assert.fail("an unsettled link cites nothing that is actually unsettled");
});

test("the slowest speed is slow enough to follow", () => {
  const speeds = [...styles.matchAll(/data-speed="([\d.]+)"/g)].map(m => Number(m[1]));
  const inMarkup = [...readFileSync(page, "utf8").matchAll(/data-speed="([\d.]+)"/g)]
    .map(m => Number(m[1]));
  assert.ok(Math.min(...inMarkup) <= 0.125,
    `the slowest speed offered is ${Math.min(...inMarkup)}×`);
});


test("a perforation lets air in rather than sending a signal", () => {
  const fromRoll = MECH.edges.filter(e => e.kind === "triggered-by-opening");
  assert.equal(fromRoll.length, 5, `${fromRoll.length} perforation links, expected five`);
  for (const edge of fromRoll) {
    assert.ok(edge.carries.includes("air"),
      `${edge.from}→${edge.to} is drawn as control, but a perforation admits atmosphere`);
  }
});

test("the bellows collapses as the music gets louder", () => {
  const K = RAILS.bass;
  const quiet = context.travel(K.piano, K);
  const middle = context.travel((K.piano + K.forte) / 2, K);
  const loud = context.travel(K.forte, K);
  assert.equal(quiet, 0, "fully open is not drawn as the full stroke");
  assert.equal(loud, 1, "fully closed is not drawn as no stroke left");
  assert.ok(quiet < middle && middle < loud, "the board does not travel monotonically");
  // The body drawn under the board is (1 - travel), so louder must mean smaller.
  assert.ok(1 - loud < 1 - quiet, "a louder passage draws a fuller bellows, which is backwards");
});

test("the sforzando cancel runs from its perforation through to the delivery side", () => {
  const frames = PLAYED.bass;
  const open = frames.find(f => f.ports.sfOff);
  assert.ok(open, "the sforzando-off perforation never opens in this passage");
  const p = context.pressures(open);
  const live = new Set(MECH.edges.filter(e => context.flowOn(e, p, open))
    .map(e => `${e.from}->${e.to}`));
  for (const link of ["gleitblock-opening-11->membrankammer-28",
                      "membrankammer-28->doppelventil-31",
                      "doppelventil-31->hilfsbalg-94",
                      "doppelventil-31->hilfsbalg-95"]) {
    assert.ok(live.has(link), `${link} is dead while the cancel perforation is open`);
  }
});


test("nothing in the relay is lit while it is idle", () => {
  const frames = PLAYED.bass;
  const hook = MECH.edges.find(e => e.kind === "arrests");
  const release = MECH.edges.find(e => e.kind === "releases-latch");
  const throttle = MECH.edges.find(e => e.kind === "opens-throttle");
  for (const f of frames) {
    const p = context.pressures(f);
    if (!f.clamped) {
      assert.equal(context.flowOn(hook, p, f), null,
        `the hook is shown bearing at t=${f.t} when nothing rests on it`);
    }
    if (!f.ports.crescOff) {
      assert.equal(context.flowOn(release, p, f), null,
        `the latch is shown releasing at t=${f.t} with no cancel perforation open`);
    }
    if (f.assistOpen <= 0.02) {
      assert.equal(context.flowOn(throttle, p, f), null,
        `a throttle is shown opening at t=${f.t} with its valve shut`);
    }
  }
});

/* -- playing it --------------------------------------------------------------- */

test("holding the crescendo open drives the bellows towards forte and it stays", () => {
  const K = RAILS.bass;
  const frames = drive(K, { seconds: 6, holds: [["crescOn", 0.2, 0.3]] });
  const atPunch = frames.find(f => f.t >= 0.3).x;
  const atEnd = frames[frames.length - 1].x;
  assert.ok(atEnd > atPunch + 0.2,
    `the crescendo did not go on working after its perforation: ${atPunch} → ${atEnd}`);
  // Frames are stamped at the end of their step, so the edge lands in the frame after 0.2.
  assert.ok(frames.filter(f => f.t > 0.25).every(f => f.cresc), "the latch did not hold");
});

test("cancelling the crescendo lets the bellows fall again", () => {
  const K = RAILS.bass;
  const frames = drive(K, {
    seconds: 8, holds: [["crescOn", 0.2, 0.3], ["crescOff", 4.0, 4.1]],
  });
  const before = frames.find(f => f.t >= 3.9).x;
  const after = frames[frames.length - 1].x;
  assert.ok(after < before - 0.2, `cancelling did nothing: ${before} → ${after}`);
});

test("the hook catches a bellows let down onto it", () => {
  const K = RAILS.bass;
  const frames = drive(K, {
    seconds: 10,
    holds: [["crescOn", 0.2, 0.3], ["mfOn", 3.0, 3.1], ["crescOff", 3.5, 3.6]],
  });
  const settled = frames.filter(f => f.t > 8);
  const face = K.mezzoforte - K.mfThickness / 2;
  assert.ok(settled.every(f => f.x >= face - 1e-6),
    "the bellows fell straight through the hook");
  assert.ok(Math.abs(settled[settled.length - 1].x - face) < 0.02,
    `it did not come to rest on the pin: ${settled[settled.length - 1].x} vs ${face}`);
});

test("a short tap of the sforzando moves the bellows less than a long one", () => {
  const K = RAILS.bass;
  const short = drive(K, { seconds: 2, holds: [["sfOn", 0.2, 0.26]] });
  const long = drive(K, { seconds: 2, holds: [["sfOn", 0.2, 0.5]] });
  const peak = fs => Math.max(...fs.map(f => f.x));
  assert.ok(peak(long) > peak(short) + 0.05,
    `length of the perforation made no difference: ${peak(short)} vs ${peak(long)}`);
});

test("every opening on the drawing is playable", () => {
  const ids = new Set(MECH.nodes.filter(n => n.shape === "port").map(n => n.id));
  const page = readFileSync(join(here, "app.html"), "utf8");
  const keyed = [...page.matchAll(/\["(gleitblock-opening-\d+)", "(\d)", "(\w+)"\]/g)];
  assert.equal(keyed.length, 6, `${keyed.length} openings are bound to keys`);
  for (const [, id] of keyed) assert.ok(ids.has(id), `${id} is keyed but not drawn`);
  assert.deepEqual(keyed.map(m => m[2]), ["1", "2", "3", "4", "5", "6"]);
  // Mezzoforte has to be cancellable, which needs opening 7 and not only opening 8.
  assert.ok(keyed.some(m => m[1] === "gleitblock-opening-7"), "no key cancels Mezzoforte");
});


test("air moves on the drawing while an opening is held", () => {
  context.setMode("mech");
  context.press("crescOn", true);
  const offsets = [];
  for (let frame = 0; frame < 5; frame++) {
    context.tick(frame * 120);            // 120 ms of wall clock per frame
    const moving = created
      .filter(node => (node.attrs.class || "").includes("link")
                   && (node.attrs.class || "").includes("on")
                   && node.style.strokeDashoffset !== undefined
                   && node.style.strokeDashoffset !== "0");
    offsets.push(moving.map(node => node.style.strokeDashoffset).join("|"));
  }
  context.press("crescOn", false);
  assert.ok(offsets[2].length > 0, "no line is carrying anything");
  assert.notEqual(offsets[2], offsets[4], "the dashes never move: the flow animation is frozen");
});

test("the trace draws what has just been played", () => {
  context.setMode("mech");
  context.startLive();
  context.press("crescOn", true);
  for (let frame = 0; frame < 8; frame++) context.tick(1000 + frame * 120);
  context.press("crescOn", false);
  const drawn = created.filter(node => node.attrs.class === "sim" && node.attrs.points);
  const line = drawn[drawn.length - 1];
  assert.ok(line, "the trace drew no line at all");
  const ys = line.attrs.points.split(" ").map(p => Number(p.split(",")[1]));
  assert.ok(ys.length > 2, `only ${ys.length} points on the trace`);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 1,
    "the trace is flat: the bellows did not move while the crescendo was held");
});

test("every opening on the drawing says which function it inputs", () => {
  // The captions used to name the functions from a table in the layout code while the graph
  // said only that some valve was triggered by some opening.
  const ports = MECH.nodes.filter(n => n.shape === "port");
  assert.equal(ports.length, 6, `${ports.length} openings drawn, expected 7 to 12`);
  for (const port of ports) {
    const named = Object.values(DATA.statements).some(s =>
      s.subject === port.id && s.property === "controls-function");
    assert.ok(named, `${port.id} is captioned "${port.caption}" but the graph never says so`);
  }
});

test("mezzoforte can be cancelled as well as set", () => {
  const K = RAILS.bass;
  const frames = drive(K, {
    seconds: 10,
    holds: [["crescOn", 0.2, 0.3], ["mfOn", 3.0, 3.1], ["crescOff", 3.5, 3.6],
            ["mfOff", 7.0, 7.1]],
  });
  const caught = frames.find(f => f.t > 6 && f.t < 6.5);
  const freed = frames[frames.length - 1];
  const face = K.mezzoforte - K.mfThickness / 2;
  assert.ok(Math.abs(caught.x - face) < 0.02, "the hook never caught it");
  assert.ok(freed.x < face - 0.1,
    `the hook was never withdrawn: still at ${freed.x.toFixed(3)}`);
});
