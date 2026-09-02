/**
 * Putting the bundle inside the page, shared by the two builds.
 *
 * `nuance.html` loads its data through one marked script tag; both builds do
 * nothing to the page but replace that tag with the bundle itself.
 */

import { readFileSync } from "node:fs";

export const DATA_TAG = '<script src="data.js"></script>';

export function option(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
}

export function withBundle(page, dataPath) {
  if (!page.includes(DATA_TAG)) throw new Error(`no ${DATA_TAG} to replace`);
  // `</script` inside the bundle would close the tag early; the escape is the
  // same string to the JS parser, which only ever sees it inside a JSON string.
  const data = readFileSync(dataPath, "utf8").replaceAll("</script", "<\\/script");
  return page.replace(DATA_TAG, `<script>\n${data}</script>`);
}

export function megabytes(path) {
  return `${(readFileSync(path).byteLength / 1024 / 1024).toFixed(2)} MB`;
}
