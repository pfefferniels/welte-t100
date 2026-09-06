#!/bin/bash
# One two-stage fit per (roll, seed) on bwUniCluster; the array index picks a
# line of cluster/rolls.txt, "druid seed".
#
#   sbatch --array=0-11 cluster/fit-rolls.sbatch
#
# `SETTLE` pins further parameters through `--settle`, `TIE` makes one follow
# another through `--tie`, and `RESULTS` names the directory, so a simplified
# variant is the same job with those set:
#
#   RESULTS=results-lean SETTLE=assistLatches=0,membraneFillMs=0 TIE=releaseTarget=piano \
#     sbatch --array=0-11 cluster/fit-rolls.sbatch
#
# The traces in ../out are whichever round was synced last; check before comparing.
#SBATCH --job-name=nuance-rolls
#SBATCH --partition=cpu
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=8G
#SBATCH --time=08:00:00
#SBATCH --output=logs/rolls-%A_%a.out

set -euo pipefail
cd "$HOME/nuance-rolls/emulator"
RESULTS="${RESULTS:-results}"
mkdir -p "$RESULTS" logs
line=$(sed -n "$((SLURM_ARRAY_TASK_ID + 1))p" cluster/rolls.txt)
druid=${line%% *}
seed=${line##* }
echo "task $SLURM_ARRAY_TASK_ID: $druid seed $seed into $RESULTS, settle '${SETTLE:-}', tie '${TIE:-}', $(date -Is)"
exec "$HOME/nuance/node/bin/node" src/cli/fit.ts pneumatic \
  --druid "$druid" --generations "${GENERATIONS:-320}" --seed "$seed" --huber 0.06 \
  ${SETTLE:+--settle "$SETTLE"} ${TIE:+--tie "$TIE"} \
  --out "$RESULTS/$druid-seed$seed.json"
