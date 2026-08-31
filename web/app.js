const TILE_PX = 512;
const CURVE_PAD = 4000;
const HALVES = ["bass", "treble"];
const COLOUR = {
  bass: "#00a8cc",
  treble: "#d4409b",
  warn: "#ea8a1f",
  drawn: "#16a34a",
  lacuna: "rgba(120, 113, 108, 0.30)",
  faded: "rgba(234, 179, 8, 0.22)",
};
const REGION_TOOLS = { lacuna: "lacuna", faded: "faded" };
const HINTS = {
  anchor: "Click a point the curve must pass through. The stretch is traced again with it in force.",
  draw: "Drag along the curve. The stroke replaces the trace over the rows it covers.",
  lacuna: "Drag over the rows where no line can be seen. They are bridged by a straight line and marked as a lacuna.",
  faded: "Drag over the rows where the line is faded but still legible. The trace stands; only the reading of the source is recorded.",
  erase: "Click a correction to remove it.",
};

const scroll = document.getElementById("scroll");
const content = document.getElementById("content");
const overlay = document.getElementById("overlay");
const minimap = document.getElementById("minimap");

const app = {
  info: null,
  zoom: 1,
  half: "bass",
  tool: "anchor",
  curve: null,
  wanted: null,
  outline: null,
  stroke: null,
  band: null,
  tiles: new Map(),
};

const rowToY = (row) => (row - app.info.span[0]) / app.zoom;
const yToRow = (y) => app.info.span[0] + y * app.zoom;
const totalRows = () => app.info.span[1] - app.info.span[0];

async function post(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || response.statusText);
  return payload;
}

// --- scan tiles, straight from IIIF -----------------------------------------

function tileUrl(index) {
  const { iiif, band, span } = app.info;
  const rowsPerTile = TILE_PX * app.zoom;
  const top = span[0] + index * rowsPerTile;
  const rows = Math.min(rowsPerTile, span[1] - top);
  const height = Math.max(1, Math.round(rows / app.zoom));
  return {
    url: `${iiif}/${band.x},${top},${band.width},${rows}/${band.width},${height}/0/default.jpg`,
    height,
  };
}

function layoutTiles() {
  const rowsPerTile = TILE_PX * app.zoom;
  const count = Math.ceil(totalRows() / rowsPerTile);
  const first = Math.max(0, Math.floor(scroll.scrollTop / TILE_PX) - 1);
  const last = Math.min(count - 1, Math.ceil((scroll.scrollTop + scroll.clientHeight) / TILE_PX) + 1);

  for (const [index, image] of app.tiles) {
    if (index < first - 2 || index > last + 2) {
      image.remove();
      app.tiles.delete(index);
    }
  }
  for (let index = first; index <= last; index += 1) {
    if (app.tiles.has(index)) continue;
    const { url, height } = tileUrl(index);
    const image = new Image();
    image.src = url;
    image.style.top = `${index * TILE_PX}px`;
    image.style.width = `${app.info.band.width}px`;
    image.style.height = `${height}px`;
    image.decoding = "async";
    content.appendChild(image);
    app.tiles.set(index, image);
  }
}

function resetTiles() {
  for (const image of app.tiles.values()) image.remove();
  app.tiles.clear();
  content.style.width = `${app.info.band.width}px`;
  content.style.height = `${Math.ceil(totalRows() / app.zoom)}px`;
  layoutTiles();
}

// --- traced curve ------------------------------------------------------------

async function ensureCurve(from, to) {
  const covered = app.curve && app.curve.start <= from && app.curve.stop >= to;
  if (covered || (app.wanted && app.wanted.start <= from && app.wanted.stop >= to)) return;
  const start = Math.max(app.info.span[0], Math.round(from) - CURVE_PAD);
  const stop = Math.min(app.info.span[1], Math.round(to) + CURVE_PAD);
  app.wanted = { start, stop };
  const data = await fetch(`/api/curve?start=${start}&stop=${stop}&step=1`).then((r) => r.json());
  if (app.wanted && app.wanted.start === start) {
    app.curve = data;
    app.wanted = null;
    draw();
  }
}

async function loadOutline() {
  const step = Math.max(1, Math.ceil(totalRows() / 1600));
  app.outline = await fetch(
    `/api/curve?start=${app.info.span[0]}&stop=${app.info.span[1]}&step=${step}`
  ).then((r) => r.json());
  drawMinimap();
}

// --- overlay -----------------------------------------------------------------

function fitCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

function segmentColour(half, flag, source) {
  if (source === "drawn") return COLOUR.drawn;
  if (flag === "gap" || flag === "rule") return COLOUR.warn;
  return COLOUR[half];
}

function drawCurves(context, top, height) {
  const { band } = app.info;
  const data = app.curve;
  if (!data) return;
  const firstRow = yToRow(top);
  const lastRow = yToRow(top + height);
  const stride = Math.max(1, Math.round(app.zoom));

  for (const half of HALVES) {
    const series = data[half];
    let previous = null;
    for (let i = 0; i < data.y.length; i += stride) {
      const row = data.y[i];
      if (row < firstRow - 8 || row > lastRow + 8) {
        previous = null;
        continue;
      }
      const point = {
        x: series.x[i] - band.x,
        y: rowToY(row) - top,
        colour: segmentColour(half, series.flag[i], series.source[i]),
      };
      if (previous) {
        context.beginPath();
        context.strokeStyle = point.colour;
        context.lineWidth = point.colour === COLOUR.warn ? 2.5 : 1.5;
        context.moveTo(previous.x, previous.y);
        context.lineTo(point.x, point.y);
        context.stroke();
      }
      previous = point;
    }
  }
}

function drawRegion(context, top, height, half, from, to, state) {
  const { band, halves } = app.info;
  const left = halves[half].low - band.x;
  const y = rowToY(from) - top;
  const span = Math.max(2, rowToY(to) - rowToY(from));
  if (y + span < 0 || y > height) return;
  context.fillStyle = COLOUR[state];
  context.fillRect(left, y, halves[half].high - halves[half].low, span);
  context.strokeStyle = state === "lacuna" ? "#78716c" : "#ca8a04";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(left, Math.round(y) + 0.5);
  context.lineTo(left + (halves[half].high - halves[half].low), Math.round(y) + 0.5);
  context.moveTo(left, Math.round(y + span) + 0.5);
  context.lineTo(left + (halves[half].high - halves[half].low), Math.round(y + span) + 0.5);
  context.stroke();
}

function drawEdits(context, top, height) {
  const { band } = app.info;
  const firstRow = yToRow(top - 20);
  const lastRow = yToRow(top + height + 20);
  for (const record of app.info.edits) {
    if (record.kind === "region") {
      drawRegion(context, top, height, record.half, record.start, record.stop, record.state);
    }
  }
  if (app.band) {
    const { half, state, from, to } = app.band;
    drawRegion(context, top, height, half, Math.min(from, to), Math.max(from, to), state);
  }
  for (const record of app.info.edits) {
    if (record.kind === "region") continue;
    context.strokeStyle = COLOUR[record.half];
    context.fillStyle = "#ffffff";
    context.lineWidth = 2;
    if (record.kind === "anchor") {
      if (record.y < firstRow || record.y > lastRow) continue;
      context.beginPath();
      context.arc(record.x - band.x, rowToY(record.y) - top, 4.5, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    } else {
      context.strokeStyle = COLOUR.drawn;
      context.beginPath();
      record.points.forEach(([y, x], index) => {
        const at = [x - band.x, rowToY(y) - top];
        index ? context.lineTo(...at) : context.moveTo(...at);
      });
      context.stroke();
    }
  }
  if (app.stroke && app.stroke.length > 1) {
    context.strokeStyle = COLOUR.drawn;
    context.lineWidth = 2;
    context.beginPath();
    app.stroke.forEach(({ x, y }, index) => {
      const at = [x - band.x, rowToY(y) - top];
      index ? context.lineTo(...at) : context.moveTo(...at);
    });
    context.stroke();
  }
}

function draw() {
  const { context, width, height } = fitCanvas(overlay);
  context.clearRect(0, 0, width, height);
  const top = scroll.scrollTop;

  context.save();
  context.translate(-scroll.scrollLeft, 0);
  context.strokeStyle = "rgba(234, 179, 8, 0.55)";
  context.lineWidth = 1;
  context.setLineDash([2, 6]);
  for (const gridline of app.info.gridlines) {
    const x = Math.round(gridline - app.info.band.x) + 0.5;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  context.setLineDash([]);
  drawCurves(context, top, height);
  drawEdits(context, top, height);
  context.restore();
}

function drawMinimap() {
  const { context, width, height } = fitCanvas(minimap);
  context.clearRect(0, 0, width, height);
  if (!app.outline) return;
  const { band } = app.info;
  const scale = height / totalRows();
  for (const half of HALVES) {
    context.strokeStyle = COLOUR[half];
    context.lineWidth = 1;
    context.beginPath();
    app.outline[half].x.forEach((x, index) => {
      const at = [((x - band.x) / band.width) * width, (app.outline.y[index] - app.info.span[0]) * scale];
      index ? context.lineTo(...at) : context.moveTo(...at);
    });
    context.stroke();
  }
  const top = yToRow(scroll.scrollTop) - app.info.span[0];
  const rows = yToRow(scroll.clientHeight) - app.info.span[0];
  context.strokeStyle = "#111827";
  context.lineWidth = 1;
  context.strokeRect(0.5, Math.round(top * scale) + 0.5, width - 1, Math.max(2, Math.round(rows * scale)));
}

// --- panel -------------------------------------------------------------------

function renderSuspects() {
  const list = document.getElementById("suspects");
  const spots = app.info.suspects;
  list.innerHTML = "";
  if (!spots.length) {
    list.innerHTML = '<li class="empty">none above 40 rows</li>';
    return;
  }
  spots.slice(0, 60).forEach((spot, index) => {
    const item = document.createElement("li");
    item.innerHTML =
      `<i class="swatch ${spot.half}"></i>${spot.rows} rows` +
      `<span class="where">${spot.seconds}s</span>`;
    item.onclick = () => {
      app.suspectIndex = index;
      goTo(spot.start - 300, spot.half);
    };
    list.appendChild(item);
  });
}

function renderEdits() {
  const list = document.getElementById("edits");
  list.innerHTML = "";
  if (!app.info.edits.length) {
    list.innerHTML = '<li class="empty">none yet</li>';
    return;
  }
  for (const record of app.info.edits) {
    const row = record.kind === "anchor" ? record.y : (record.points ? record.points[0][0] : record.start);
    const label = record.kind === "region" ? `${record.state} · ${record.stop - record.start} rows` : record.kind;
    const item = document.createElement("li");
    item.innerHTML =
      `<i class="swatch ${record.half}"></i>${label}` +
      `<span class="where">${row}</span>`;
    item.onclick = () => goTo(row - 300, record.half);
    const remove = document.createElement("button");
    remove.textContent = "✕";
    remove.title = "remove";
    remove.onclick = async (event) => {
      event.stopPropagation();
      await applyEdit("/api/edits/delete", { id: record.id });
    };
    item.appendChild(remove);
    list.appendChild(item);
  }
}

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

function reportPosition() {
  const row = Math.round(yToRow(scroll.scrollTop + scroll.clientHeight / 2));
  const data = app.curve;
  let readout = "";
  if (data) {
    const index = row - data.start;
    if (index >= 0 && index < data.y.length) {
      readout = HALVES.map(
        (half) => `${half} ${data[half].value[index].toFixed(3)} (${data[half].flag[index]})`
      ).join("   ");
    }
  }
  setStatus(`row ${row}   ${readout}`);
}

// --- interaction --------------------------------------------------------------

function goTo(row, half) {
  if (half) selectHalf(half);
  const target = Math.max(0, rowToY(row));
  scroll.scrollTop = target;
  refresh();
}

function selectHalf(half) {
  app.half = half;
  for (const button of document.querySelectorAll("#halves button")) {
    button.classList.toggle("on", button.dataset.half === half);
  }
}

function selectTool(tool) {
  app.tool = tool;
  for (const button of document.querySelectorAll("#tools button")) {
    button.classList.toggle("on", button.dataset.tool === tool);
  }
  document.getElementById("hint").textContent = HINTS[tool];
  scroll.style.cursor = tool === "anchor" || tool === "erase" ? "default" : "crosshair";
}

function setZoom(zoom) {
  const centre = yToRow(scroll.scrollTop);
  app.zoom = zoom;
  for (const button of document.querySelectorAll("#zooms button")) {
    button.classList.toggle("on", Number(button.dataset.zoom) === zoom);
  }
  resetTiles();
  scroll.scrollTop = rowToY(centre);
  refresh();
}

function pointAt(event) {
  const box = scroll.getBoundingClientRect();
  return {
    x: event.clientX - box.left + scroll.scrollLeft + app.info.band.x,
    y: Math.round(yToRow(event.clientY - box.top + scroll.scrollTop)),
  };
}

async function applyEdit(path, body) {
  setStatus("re-tracing…");
  try {
    const result = await post(path, body);
    app.info.edits = result.edits;
    app.info.suspects = result.suspects;
    app.curve = null;
    app.wanted = null;
    renderEdits();
    renderSuspects();
    await refresh();
    await loadOutline();
    document.getElementById("save").disabled = false;
    document.getElementById("saved").textContent = "unsaved changes";
  } catch (problem) {
    setStatus(`could not apply: ${problem.message}`);
  }
}

function nearestEdit(point) {
  let best = null;
  for (const record of app.info.edits) {
    if (record.kind === "region") {
      const { low, high } = app.info.halves[record.half];
      if (point.y >= record.start && point.y < record.stop && point.x >= low && point.x < high) {
        return record;
      }
      continue;
    }
    const rows = record.kind === "anchor" ? [[record.y, record.x]] : record.points;
    for (const [y, x] of rows) {
      const distance = Math.hypot(x - point.x, (y - point.y) / app.zoom);
      if (distance < 14 && (!best || distance < best.distance)) best = { record, distance };
    }
  }
  return best && best.record;
}

function bindPointer() {
  scroll.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const point = pointAt(event);
    if (app.tool === "erase") {
      const found = nearestEdit(point);
      if (found) applyEdit("/api/edits/delete", { id: found.id });
      return;
    }
    if (app.tool === "anchor") {
      applyEdit("/api/edits", { kind: "anchor", half: app.half, x: point.x, y: point.y });
      return;
    }
    if (REGION_TOOLS[app.tool]) {
      app.band = { half: app.half, state: REGION_TOOLS[app.tool], from: point.y, to: point.y };
    } else {
      app.stroke = [point];
    }
    scroll.setPointerCapture(event.pointerId);
  });

  scroll.addEventListener("pointermove", (event) => {
    const point = pointAt(event);
    if (app.band) {
      app.band.to = point.y;
      draw();
      return;
    }
    if (!app.stroke) return;
    const last = app.stroke[app.stroke.length - 1];
    if (Math.abs(point.y - last.y) >= app.zoom) app.stroke.push(point);
    draw();
  });

  scroll.addEventListener("pointerup", () => {
    if (app.band) {
      const { half, state, from, to } = app.band;
      app.band = null;
      const start = Math.min(from, to);
      const stop = Math.max(from, to) + 1;
      if (stop - start < 4) {
        draw();
        return;
      }
      applyEdit("/api/edits", { kind: "region", half, state, start, stop });
      return;
    }
    const drawn = app.stroke;
    app.stroke = null;
    if (!drawn || drawn.length < 2) {
      draw();
      return;
    }
    const points = [...drawn].sort((a, b) => a.y - b.y);
    const unique = points.filter((point, index) => index === 0 || point.y > points[index - 1].y);
    if (unique.length < 2) {
      draw();
      return;
    }
    applyEdit("/api/edits", {
      kind: "stroke",
      half: app.half,
      points: unique.map(({ y, x }) => [y, x]),
    });
  });
}

function bindKeys() {
  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey) return;
    const zooms = [1, 2, 4, 8];
    const actions = {
      "1": () => selectHalf("bass"),
      "2": () => selectHalf("treble"),
      a: () => selectTool("anchor"),
      d: () => selectTool("draw"),
      v: () => selectTool("lacuna"),
      f: () => selectTool("faded"),
      e: () => selectTool("erase"),
      z: () => setZoom(zooms[(zooms.indexOf(app.zoom) + 1) % zooms.length]),
      n: () => step(1),
      p: () => step(-1),
    };
    const action = actions[event.key];
    if (action) {
      event.preventDefault();
      action();
    }
  });
}

function step(direction) {
  const spots = app.info.suspects;
  if (!spots.length) return;
  const next = ((app.suspectIndex ?? -1) + direction + spots.length) % spots.length;
  app.suspectIndex = next;
  goTo(spots[next].start - 300, spots[next].half);
}

// --- loop ---------------------------------------------------------------------

async function refresh() {
  layoutTiles();
  draw();
  drawMinimap();
  reportPosition();
  await ensureCurve(yToRow(scroll.scrollTop), yToRow(scroll.scrollTop + scroll.clientHeight));
  reportPosition();
}

async function boot() {
  app.info = await fetch("/api/state").then((r) => r.json());
  document.getElementById("title").textContent = `${app.info.druid} · rows ${app.info.span[0]}–${app.info.span[1]}`;

  for (const button of document.querySelectorAll("#halves button")) {
    button.onclick = () => selectHalf(button.dataset.half);
  }
  for (const button of document.querySelectorAll("#tools button")) {
    button.onclick = () => selectTool(button.dataset.tool);
  }
  for (const button of document.querySelectorAll("#zooms button")) {
    button.onclick = () => setZoom(Number(button.dataset.zoom));
  }
  document.getElementById("save").disabled = true;
  document.getElementById("save").onclick = async () => {
    const where = await post("/api/save");
    document.getElementById("saved").textContent = `saved to ${where.edits.split("/").slice(-2).join("/")}`;
    document.getElementById("save").disabled = true;
  };
  minimap.onclick = (event) => {
    const box = minimap.getBoundingClientRect();
    const row = app.info.span[0] + ((event.clientY - box.top) / box.height) * totalRows();
    goTo(row - (scroll.clientHeight / 2) * app.zoom);
  };

  scroll.addEventListener("scroll", () => refresh());
  window.addEventListener("resize", () => refresh());
  bindPointer();
  bindKeys();

  resetTiles();
  renderSuspects();
  renderEdits();
  selectTool("anchor");
  await refresh();
  await loadOutline();
  if (app.info.suspects.length) step(1);
}

boot();
