#!/bin/bash
# One fit per array task: 33 variants x 2 keyboard halves.
#
#   sbatch --array=0-65 cluster/ablation.sbatch
#
# Each task is a single-core, single-node job of a few tens of minutes. Results
# land one JSON per task in results/, which src/cli/collect.ts merges.
#SBATCH --job-name=nuance-ablation
#SBATCH --partition=cpu
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --time=02:00:00
#SBATCH --output=logs/ablation-%A_%a.out

set -euo pipefail
cd "$HOME/nuance/emulator"
mkdir -p results logs

NODE="$HOME/nuance/node/bin/node"
VARIANTS=$("$NODE" src/cli/experiments.ts --count)
INDEX=$(( SLURM_ARRAY_TASK_ID / 2 ))
HALF=$([ $(( SLURM_ARRAY_TASK_ID % 2 )) -eq 0 ] && echo bass || echo treble)

if [ "$INDEX" -ge "$VARIANTS" ]; then
  echo "task $SLURM_ARRAY_TASK_ID is past the $VARIANTS variants; nothing to do"
  exit 0
fi

echo "task $SLURM_ARRAY_TASK_ID -> variant $INDEX, $HALF, $(hostname)"
exec "$NODE" src/cli/experiments.ts \
  --generations "${GENERATIONS:-220}" \
  --index "$INDEX" \
  --half "$HALF" \
  --out "results/ablation-$INDEX-$HALF.json"
