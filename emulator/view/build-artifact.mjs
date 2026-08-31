/**
 * The viewer as a Claude artifact.
 *
 *   node view/build-artifact.mjs [--page P] [--data D] [--out O]
 *
 * An artifact is wrapped in its own `<!doctype html> … <head> … <body>` when it
 * is published, so the file must carry none of that itself: title, styles,
 * markup and scripts only. The wrapper's head is a charset and viewport meta
 * plus a small reset — zero body margin, a 14px system font on an off-white
 * ground — so the page has to state its own background, size and family, which
 * `nuance.html` already does from its own tokens.
 *
 * Nothing else is changed. The page loads no external resource, and offers no
 * download, which the artifact sandbox would block in any case.
 */

import { readFileSync, writeFileSync } from "node:fs";

import { megabytes, option, withBundle } from "./inline.mjs";

const pagePath = option("page", "view/nuance.html");
const outPath = option("out", "view/nuance.artifact.html");

const page = readFileSync(pagePath, "utf8");
const part = (name, what) => {
  const found = page.match(new RegExp(`<${name}[^>]*>[\\s\\S]*?</${name}>`, "i"));
  if (!found) throw new Error(`${pagePath}: no <${name}> to keep as the ${what}`);
  return found[0];
};

const body = page.match(/<body[^>]*>([\s\S]*)<\/body>/i);
if (!body) throw new Error(`${pagePath}: no <body> to lift the content out of`);

// Checked before the bundle goes in: a `<body` inside a JSON string would be
// harmless to the parser but would make this refuse a page that is in fact fine.
const shell = `${part("title", "artifact name")}\n${part("style", "palette")}\n${body[1].trim()}\n`;
const stray = shell.match(/<!doctype|<\/?html\b|<\/?head\b|<\/?body\b/gi);
if (stray) throw new Error(`${outPath}: document wrapper survived: ${[...new Set(stray)].join(", ")}`);

writeFileSync(outPath, withBundle(shell, option("data", "view/data.js")));

const artifact = readFileSync(outPath, "utf8");
const named = (label, pattern) => {
  const found = [...new Set([...artifact.matchAll(pattern)].map((match) => match[0]))];
  console.error(`${label}: ${found.length === 0 ? "none" : found.join(", ")}`);
};
console.error(`wrote ${outPath}: ${megabytes(outPath)}`);
named("http(s) anywhere in the file", /https?:\/\/[^\s"'<>)]+/g);
named("fetched by markup or css", /(?:\bsrc|\bhref)\s*=\s*["'][^"']*["']|url\(\s*[^)]*\)|@import[^;]*/gi);
named("downloads offered", /\bdownload\b[^,;)]{0,40}/gi);
