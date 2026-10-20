// v2.14.0 T014 -- judge the paired A/B against the frozen model gates
// (docs/releases/v2/v2.14/development/gates.md, "Model gates"). Reads the
// per-run metrics written by run-ab.sh and writes lfm-ab-results.json.
// Usage (repo root): node docs/releases/v2/v2.14/development/evidence/ab/judge-ab.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HERE = "docs/releases/v2/v2.14/development/evidence/ab";
const OUT = "docs/releases/v2/v2.14/development/lfm-ab-results.json";
const MIN_RUNS = 3;

function percentile(values, p) {
  const xs = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (xs.length === 0) return null;
  return xs[Math.min(Math.max(Math.ceil((p / 100) * xs.length), 1), xs.length) - 1];
}

function arm(name) {
  const runs = [];
  for (let run = 1; existsSync(join(HERE, `metrics-${name}-run${run}.json`)); run++) {
    const m = JSON.parse(readFileSync(join(HERE, `metrics-${name}-run${run}.json`), "utf8"));
    runs.push({
      run,
      model: m.model,
      toolFormat: m.toolFormat,
      options: m.options,
      total: m.total,
      completed: m.tasks.filter((t) => t.passed).length,
      complete: m.tasks.length === m.total,
      turnMs: m.tasks.flatMap((t) => t.turns.map((x) => x.turnMs)),
      firstToolCallMs: m.tasks.map((t) => t.firstToolCallMs).filter((v) => v !== null),
      codecParseFailures: m.tasks.reduce((s, t) => s + t.codecParseFailures, 0),
      offloaded: m.tasks.some((t) => t.memory.status === "measured" && t.memory.offloaded),
      memoryMeasured: m.tasks.filter((t) => t.memory.status === "measured").length,
      peakVramBytes: Math.max(0, ...m.tasks.map((t) => t.memory.peakVramBytes ?? 0)),
      peakRamBytes: Math.max(0, ...m.tasks.map((t) => t.memory.peakRamBytes ?? 0)),
    });
  }
  const completed = runs.map((r) => r.completed);
  const turnMs = runs.flatMap((r) => r.turnMs);
  return {
    runs: runs.map(({ turnMs: _t, firstToolCallMs: _f, ...rest }) => rest),
    completeRuns: runs.filter((r) => r.complete).length,
    completedPerRun: completed,
    meanCompleted: completed.length ? completed.reduce((a, b) => a + b, 0) / completed.length : null,
    spread: completed.length ? [Math.min(...completed), Math.max(...completed)] : null,
    turnMsP50: percentile(turnMs, 50),
    turnMsP95: percentile(turnMs, 95),
    firstToolCallMsP50: percentile(runs.flatMap((r) => r.firstToolCallMs), 50),
    codecParseFailures: runs.reduce((s, r) => s + r.codecParseFailures, 0),
    offloaded: runs.some((r) => r.offloaded),
  };
}

const lfm = arm("lfm");
const holder = arm("nemotron");
const log = readFileSync(join(HERE, "run-ab.log"), "utf8");
const budgetExhausted = /reason=budget-exhausted/.test(log);
const enoughRuns = lfm.completeRuns >= MIN_RUNS && holder.completeRuns >= MIN_RUNS;

// M-1: the candidate ran with no CPU spill (T002 fit, re-checked during the A/B).
const m1 = !enoughRuns || budgetExhausted ? "HOLD" : lfm.offloaded ? "FAIL" : "PASS";
// M-2: zero codec parse failures for the candidate across every run.
const m2 = !enoughRuns || budgetExhausted ? "HOLD" : lfm.codecParseFailures === 0 ? "PASS" : "FAIL";
// M-3: win rule. A completion difference inside the run-to-run spread is not a difference.
let m3;
let m3Reason;
if (!enoughRuns || budgetExhausted) {
  m3 = "HOLD";
  m3Reason = "fewer than three complete runs per arm or budget exhausted";
} else {
  const lfmLow = lfm.spread[0];
  const lfmHigh = lfm.spread[1];
  const holderLow = holder.spread[0];
  const holderHigh = holder.spread[1];
  const separatedAbove = lfmLow > holderHigh;
  const separatedBelow = lfmHigh < holderLow;
  const p95NoWorse = lfm.turnMsP95 <= holder.turnMsP95;
  const p95Better25 = lfm.turnMsP95 <= 0.75 * holder.turnMsP95;
  if (separatedAbove && p95NoWorse) {
    m3 = "PASS";
    m3Reason = "(a) higher completion, separated from run-to-run spread, at no worse p95 turn time";
  } else if (separatedBelow) {
    m3 = "FAIL";
    m3Reason = "lower completion, separated from run-to-run spread";
  } else if (!separatedAbove && !separatedBelow) {
    // Completion is equal within spread: rule (b) decides.
    m3 = p95Better25 ? "PASS" : "HOLD";
    m3Reason = p95Better25
      ? "(b) completion equal within spread and p95 turn time at least 25% better"
      : "completion equal within spread and p95 turn time not at least 25% better (tie)";
  } else {
    m3 = "FAIL";
    m3Reason = "higher completion but worse p95 turn time";
  }
}
const admitted = m1 === "PASS" && m2 === "PASS" && m3 === "PASS";
const report = {
  schemaVersion: 1,
  gates: "docs/releases/v2/v2.14/development/gates.md",
  budgetSeconds: 36000,
  elapsedSeconds: Number(/done elapsed=(\d+)s/.exec(log)?.[1] ?? NaN),
  budgetExhausted,
  arms: { candidate: lfm, holder },
  verdicts: { "M-1": m1, "M-2": m2, "M-3": m3, "M-3 reason": m3Reason },
  // gates.md says both "HOLD when a completion difference falls within the
  // run-to-run spread" and "(b) equal completion with p95 at least 25% better".
  // On 2026-10-17 the owner chose the reading this script applies: completion
  // whose ranges overlap counts as equal, so rule (b) decides.
  interpretation: {
    rule: "overlapping completion ranges count as equal completion for M-3 (b)",
    decidedBy: "owner",
    date: "2026-10-17",
    alternative: "a literal reading of the HOLD sentence would have declined",
  },
  decision: admitted ? "ADMIT" : "DECLINE",
};
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ verdicts: report.verdicts, decision: report.decision, lfm: { completed: lfm.completedPerRun, p95: lfm.turnMsP95, p50: lfm.turnMsP50, parse: lfm.codecParseFailures, offloaded: lfm.offloaded }, holder: { completed: holder.completedPerRun, p95: holder.turnMsP95, p50: holder.turnMsP50, offloaded: holder.offloaded } }, null, 1));
