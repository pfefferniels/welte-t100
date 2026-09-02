/**
 * Inline the figures into the findings page.
 *
 *   node docs/embed-figures.mjs
 *
 * `docs/findings.html` is artifact source: no doctype, no head, and it refers to
 * its figures as `FIGURE:name.png`. Published artifacts cannot load images from
 * anywhere, so each reference is replaced by a data URI and the result written to
 * `docs/findings.built.html`, which is what gets published.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "docs/findings.html";
const BUILT = "docs/findings.built.html";
const FIGURES = "docs/figures";

const source = readFileSync(SOURCE, "utf8");
const used = new Set();

const built = source.replace(/FIGURE:([\w.-]+\.png)/g, (_, name) => {
  used.add(name);
  return `data:image/png;base64,${readFileSync(join(FIGURES, name)).toString("base64")}`;
});

writeFileSync(BUILT, built);

const kilobytes = (bytes) => `${Math.round(bytes / 1024)} kB`;
console.log(`${used.size} figures inlined: ${[...used].join(", ")}`);
console.log(`${BUILT}: ${kilobytes(Buffer.byteLength(built))}`);
