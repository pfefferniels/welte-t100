/**
 * The viewer as one file, for handing the page to someone without the bundle
 * beside it. A whole HTML document, opened straight from disk.
 *
 *   node view/build-single.mjs [--page P] [--data D] [--out O]
 */

import { readFileSync, writeFileSync } from "node:fs";

import { megabytes, option, withBundle } from "./inline.mjs";

const pagePath = option("page", "view/nuance.html");
const outPath = option("out", "view/nuance-single.html");

writeFileSync(outPath, withBundle(readFileSync(pagePath, "utf8"), option("data", "view/data.js")));
console.error(`wrote ${outPath}: ${megabytes(outPath)}`);
