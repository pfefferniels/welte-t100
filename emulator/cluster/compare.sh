#!/bin/bash
# Bring home the four configurations of the transit terms and set them side by side.
#
#   cluster/compare.sh
#
# Each directory holds the same model and budget with a different set pinned, so
# the differences between them are what the terms are worth. Two seeds apiece;
# the spread between seeds is the error bar on the search, not on the data.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p cluster/compare

for pair in "nuance:control" "nuance4:pair" "nuance3:pair+assistBand" "nuance2:all four"; do
  dir="${pair%%:*}"
  rsync -az -e "ssh -o BatchMode=yes" "uc3:$dir/emulator/results/" "cluster/compare/$dir/" 2>/dev/null || true
done

node - "$@" <<'NODE'
const fs = require("node:fs");
const LABEL = { nuance: "control, all pinned", nuance4: "valve band + through-flow",
  nuance3: "  + assist band", nuance2: "  + drag threshold" };
const rows = [];
for (const dir of Object.keys(LABEL)) {
  const at = `cluster/compare/${dir}`;
  if (!fs.existsSync(at)) continue;
  const files = fs.readdirSync(at).filter((f) => f.startsWith("fit-seed"));
  if (!files.length) continue;
  const seeds = files.map((f) => JSON.parse(fs.readFileSync(`${at}/${f}`, "utf8")));
  for (const half of ["bass", "treble"]) {
    const scores = seeds.map((s) => s.results.find((r) => r.half === half))
      .filter(Boolean).map((r) => r.test.rmse).sort((a, b) => a - b);
    if (!scores.length) continue;
    rows.push({ variant: LABEL[dir], half, best: scores[0], spread: scores.at(-1) - scores[0], seeds: scores.length });
  }
}
if (!rows.length) { console.log("no results yet"); process.exit(0); }
for (const half of ["bass", "treble"]) {
  const here = rows.filter((r) => r.half === half);
  if (!here.length) continue;
  const control = here.find((r) => r.variant.startsWith("control"))?.best;
  console.log(`\n=== ${half} ===   held-out rmse, best of the seeds`);
  for (const r of here) {
    const delta = control === undefined ? "" :
      `   ${r.best <= control ? "-" : "+"}${Math.abs(control - r.best).toFixed(4)} against the control`;
    console.log(`  ${r.variant.padEnd(28)} ${r.best.toFixed(4)}  (spread across ${r.seeds} seeds ${r.spread.toFixed(4)})${delta}`);
  }
}
NODE
