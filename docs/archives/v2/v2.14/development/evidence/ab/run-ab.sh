#!/usr/bin/env bash
# v2.14.0 T014 -- paired golden-task A/B: LFM2.5-24B-A2B (QAD-Q4_0) vs the
# 16 GB holder nemotron-lightning:30b-a3b-offload (nemotron-3.5-lightning:30b).
#
# Runs alternate between arms (lfm 1, nemotron 1, lfm 2, ...) so drift on the
# host affects both equally. Every run writes its own metrics file and result
# lines here. The frozen budget (gates.md: 10 hours) is enforced: a run that
# would start after the deadline is skipped and recorded, which makes the
# verdict HOLD. Local evidence tool; needs both models in Ollama and a GPU.
# Usage (repo root): bash docs/releases/v2/v2.14/development/evidence/ab/run-ab.sh [runs-per-arm]
set -euo pipefail

readonly HERE="docs/releases/v2/v2.14/development/evidence/ab"
readonly RUNS="${1:-3}"
readonly BUDGET_SECONDS=$((10 * 3600))
readonly LFM_MODEL="hf.co/LiquidAI/LFM2.5-24B-A2B-GGUF:QAD-Q4_0"
readonly HOLDER_MODEL="nemotron-3.5-lightning:30b"

start=$(date +%s)
deadline=$((start + BUDGET_SECONDS))
log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$HERE/run-ab.log" >&2; }

log "start runs=$RUNS budget=${BUDGET_SECONDS}s"
for run in $(seq 1 "$RUNS"); do
  for arm in lfm nemotron; do
    if [ "$(date +%s)" -ge "$deadline" ]; then
      log "skip arm=$arm run=$run reason=budget-exhausted"
      continue
    fi
    if [ "$arm" = lfm ]; then model="$LFM_MODEL"; codec="lfm-pythonic"; else model="$HOLDER_MODEL"; codec="qwen-json"; fi
    log "begin arm=$arm run=$run"
    t0=$(date +%s)
    node bin/nexus.mjs golden run --mode live --json \
      --model "$model" --tool-format "$codec" \
      --options "$HERE/sampler-$arm.json" \
      --metrics "$HERE/metrics-$arm-run$run.json" \
      > "$HERE/results-$arm-run$run.jsonl" 2>> "$HERE/run-ab.log" || true
    log "end arm=$arm run=$run seconds=$(( $(date +%s) - t0 )) passed=$(grep -c '"passed":true' "$HERE/results-$arm-run$run.jsonl" || true)"
  done
done
log "done elapsed=$(( $(date +%s) - start ))s"
