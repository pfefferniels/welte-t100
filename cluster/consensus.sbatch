#!/bin/bash
# The pooled fit of one instrument over the six rolls, one task per (half, seed).
#
#   FITS=results-pinned3 sbatch --array=0-3 cluster/consensus.sbatch
#
# `FITS` holds the per-roll fits whose registration each roll keeps, with a
# `<druid>.json` per roll beside the seed runs. Six rolls per evaluation makes
# this six times a single-roll fit, which is why the halves and seeds are
# separate tasks.
#SBATCH --job-name=nuance-consensus
#SBATCH --partition=cpu
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=12G
#SBATCH --time=08:00:00
#SBATCH --output=logs/consensus-%A_%a.out

set -euo pipefail
cd "$HOME/nuance-rolls/emulator"
RESULTS="${RESULTS:-results-consensus}"
mkdir -p "$RESULTS" logs
half=$([ $(( SLURM_ARRAY_TASK_ID % 2 )) -eq 0 ] && echo bass || echo treble)
seed=$(( SLURM_ARRAY_TASK_ID / 2 + 1 ))
rolls=$(awk '{print $1}' cluster/rolls.txt | sort -u | paste -sd, -)
echo "task $SLURM_ARRAY_TASK_ID: $half seed $seed over $rolls from ${FITS:-results}, $(date -Is)"
exec "$HOME/nuance/node/bin/node" src/cli/consensus.ts \
  --rolls "$rolls" --fits "${FITS:-results}" --half "$half" --seed "$seed" \
  --generations "${GENERATIONS:-200}" --huber 0.06 \
  --out "$RESULTS/consensus-$half-seed$seed.json"
