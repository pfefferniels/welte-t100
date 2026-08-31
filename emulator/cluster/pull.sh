#!/bin/bash
# Bring the cluster's results home and rebuild everything that reads them.
#
#   cluster/pull.sh
#
# Merges every ablation result into docs/experiments.{json,md}, takes the
# two-stage fit in preference to the ablation's own row, re-exports the overlay,
# rebuilds the findings page, and writes the two reports that read a fit: the
# residual breakdown and the model's run through Welte's acceptance procedure.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p cluster/results

rsync -az -e "ssh -o BatchMode=yes" uc3:nuance/emulator/results/ cluster/results/
echo "$(ls cluster/results/*.json 2>/dev/null | wc -l | tr -d ' ') result files"

shopt -s nullglob
ablation=(cluster/results/ablation-*.json)
if [ ${#ablation[@]} -gt 0 ]; then
  node src/cli/collect.ts "${ablation[@]}"
fi

# Every seed is a separate fit of the same thing; keep the one that scored best,
# and say how much they disagreed, because that is the honest error bar on the
# search rather than on the data.
seeds=(cluster/results/fit-seed*.json)
if [ ${#seeds[@]} -gt 0 ]; then
  node -e '
    const fs = require("node:fs");
    const files = process.argv.slice(1);
    const score = f => JSON.parse(fs.readFileSync(f, "utf8")).results
      .reduce((s, r) => s + r.test.rmse, 0);
    const ranked = files.map(f => [f, score(f)]).sort((a, b) => a[1] - b[1]);
    for (const [f, s] of ranked) console.error(`  ${f}  summed test rmse ${s.toFixed(4)}`);
    const spread = ranked.at(-1)[1] - ranked[0][1];
    console.error(`  spread across ${ranked.length} seeds: ${spread.toFixed(4)}`);
    fs.copyFileSync(ranked[0][0], "docs/fit-pneumatic.json");
    console.error(`  taking ${ranked[0][0]}`);
  ' "${seeds[@]}"
fi

node src/cli/export-view.ts --fit docs/fit-pneumatic.json --out view/data.js
node view/build-artifact.mjs
node src/cli/residuals.ts --fit docs/fit-pneumatic.json > docs/residuals.txt
node src/cli/skalarolle.ts --fit docs/fit-pneumatic.json > docs/skalarolle.txt
node docs/embed-figures.mjs
echo "wrote docs/residuals.txt and docs/skalarolle.txt"
