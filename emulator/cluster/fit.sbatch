#!/bin/bash
# The headline fit, two-stage, one task per keyboard half.
#
#   sbatch --array=0-1 cluster/fit.sbatch
#
# `src/cli/fit.ts` fits both halves itself, so each task runs it for one half by
# way of a seed that differs, and the two JSONs are merged locally. Kept separate
# from the ablation because it is the fit the viewer and the residual report read.
#SBATCH --job-name=nuance-fit
#SBATCH --partition=cpu
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=4G
#SBATCH --time=04:00:00
#SBATCH --output=logs/fit-%A_%a.out

set -euo pipefail
cd "$HOME/nuance/emulator"
mkdir -p results logs
exec "$HOME/nuance/node/bin/node" src/cli/fit.ts pneumatic \
  --generations "${GENERATIONS:-320}" \
  --seed "$(( SLURM_ARRAY_TASK_ID + 1 ))" \
  --out "results/fit-seed$(( SLURM_ARRAY_TASK_ID + 1 )).json"
