#!/usr/bin/env node
/**
 * Crash-class recurrence report (v2.4.9 Phase 4).
 *
 * Answers one question: which failure class recurs most, and on which build?
 * Read-only. It shells out to the authenticated `gh` CLI, posts nothing, and
 * talks to no third-party service. It uses the GitHub token an operator
 * already holds; it is not a new credential.
 *
 * HOW THE CLASSES WERE DERIVED, and why they are not data-derived.
 * The plan asked for at most five classes sampled from the 50 most recent
 * issues. That sample is EMPTY: `gh issue list --state all --limit 100`
 * returns zero issues for this repository. There is no issue text to cluster,
 * so clustering it would have produced five invented classes wearing the
 * authority of a sample.
 *
 * The classes below are instead taken from this repository's own recorded
 * field failures -- the v2.4.x known-gaps log and the defects those cycles
 * fixed, which is real evidence that simply is not issue-shaped yet. Each
 * class names the cycle that produced it. Treat them as a first pass to be
 * re-derived from real reports once the bug form has collected some; that
 * re-derivation is a known gap with a date-based exit condition.
 *
 * HONESTY ABOUT THE FIRST RUNS.
 * Every issue that exists today predates the bug form, so early runs put
 * essentially everything in the `unversioned` bucket. That is the correct
 * output, not a defect. Unversioned reports are counted and reported on their
 * own; they are NEVER folded into a version and never assumed to be current,
 * because a report from an obsolete build must not count against a build that
 * already fixed it.
 *
 * Usage:
 *   node scripts/crash-class-report.mjs [--since <ISO date>] [--version <v>]
 *                                       [--limit <n>] [--json]
 *
 * `--since` defaults to the latest release date, or to all time when the
 * repository has no releases.
 */

import { execFileSync } from "node:child_process";
import { argv, exit } from "node:process";

/**
 * Failure classes, most specific first. Order matters: an issue is assigned to
 * the FIRST class that matches, so a broad class must never precede a narrow
 * one. Per-class match counts are printed precisely so an over-broad class is
 * visible rather than silently swallowing everything.
 */
export const CRASH_CLASSES = [
  {
    id: "install-provision",
    label: "Installer or runtime provisioning",
    provenance: "v2.4.5-v2.4.8 installer cycles; the VS Code extension gate and venv provisioning",
    patterns: [
      /\binstall(er|ation)?\b/i,
      /\bprovision/i,
      /\bvenv\b/i,
      /\bvsix\b/i,
      /\bwinget\b|\bnsis\b|\bdmg\b/i,
      /extension .*(disabled|not (installed|supported))/i,
    ],
  },
  {
    id: "model-load",
    label: "Model cold start never completes",
    provenance: "v2.4.8 warm-accelerator work; the indefinite 'Loading model...' symptom",
    patterns: [
      /loading model/i,
      /\bcold start\b/i,
      /model (never|not) (load|start|respond)\w*/i,
      /\bollama\b.*\b(hang|stuck|timeout|not running)\b/i,
      /\bwarm(ing)? up\b/i,
    ],
  },
  {
    id: "gpu-handoff",
    label: "VRAM exhaustion or CPU offload",
    provenance: "v2.4.9 BG-17 and BG-18; the release_vram and eviction defects",
    patterns: [
      /\bvram\b/i,
      /out of memory|\boom\b|cuda error/i,
      /\boffload(ing|ed)?\b/i,
      /\bevict(ion|ed)?\b/i,
      /gpu .*(busy|shared|contention)/i,
    ],
  },
  {
    id: "generation-failure",
    label: "A generation fails or returns the wrong output",
    provenance: "v2.4.9 BG-5 through BG-9 and BG-13; capability caps and the unchanged-output guard",
    patterns: [
      /\b(image|video|generation|render)\w*\b[\s\S]{0,80}?\b(fail\w*|error\w*|blank|black|unchanged|wrong|broken)\b/i,
      /\bunchanged-output\b/i,
      /progress bar/i,
      /\bruntime[- ]not[- ]ready\b/i,
    ],
  },
  {
    id: "data-persistence",
    label: "Sessions, archives, or database state",
    provenance: "v2.4.x chat-archive and studio-session work; the v2.5.0 migration-durability plan",
    patterns: [
      /\bdatabase\b|\bsqlite\b|\bmigration\b/i,
      /\bsessions?\b[\s\S]{0,40}?\b(lost|missing|gone|empty|vanish\w*|disappear\w*)\b/i,
      /\barchive(s|d)?\b/i,
      /\bcorrupt(ed|ion)?\b/i,
    ],
  },
];

export const UNCLASSIFIED = "unclassified";
export const UNVERSIONED = "unversioned";

/**
 * Pull the Nexus version out of an issue body.
 *
 * The bug form (`.github/ISSUE_TEMPLATE/bug_report.yml`) renders each answer
 * under its label as a level-three heading, so the version arrives as:
 *
 *     ### Nexus version
 *
 *     2.4.8
 *
 * Returns null for anything that does not yield a plausible version, which is
 * what puts a report in the unversioned bucket. A commit SHA is accepted,
 * because the form invites one for source builds.
 */
export function parseVersion(body) {
  if (typeof body !== "string" || body.length === 0) return null;

  const section = /###\s*Nexus version\s*\n+([^\n#]+)/i.exec(body);
  const candidate = section ? section[1].trim() : null;
  if (!candidate) return null;

  const cleaned = candidate.replace(/^[`*_\s]+|[`*_\s.]+$/g, "");
  if (/^v?\d+\.\d+(\.\d+)?([-+][0-9A-Za-z.-]+)?$/.test(cleaned)) {
    return cleaned.replace(/^v/, "");
  }
  if (/^[0-9a-f]{7,40}$/i.test(cleaned)) return cleaned.toLowerCase();
  return null;
}

/**
 * The free-text the reporter actually wrote, excluding the form's own
 * structured answers.
 *
 * This matters more than it looks. The bug form asks "How did you install
 * it?" and most answers are the literal word "Installer", so classifying over
 * the whole body put EVERY form-filed issue into `install-provision`
 * regardless of content -- the over-broad classifier the plan warned about,
 * arriving through the form's boilerplate rather than through a loose regex.
 * The same trap sits in the GPU field, whose answers name hardware.
 *
 * So classification reads the title plus only the narrative sections. A body
 * with no recognisable form sections (a blank issue, or one filed through the
 * API) falls back to the whole body, because for those there is no
 * boilerplate to exclude.
 */
export function narrativeOf(issue) {
  const title = typeof issue?.title === "string" ? issue.title : "";
  const body = typeof issue?.body === "string" ? issue.body : "";

  const NARRATIVE_HEADINGS =
    /###\s*(What happened\?|What did you expect instead\?|Steps to reproduce)\s*\n([\s\S]*?)(?=\n###\s|\s*$)/gi;

  const sections = [];
  for (const match of body.matchAll(NARRATIVE_HEADINGS)) sections.push(match[2]);

  const narrative = sections.length > 0 ? sections.join("\n") : body;
  return `${title}\n${narrative}`;
}

/** First matching class, or UNCLASSIFIED. Order is significance, not preference. */
export function classify(issue) {
  const haystack = narrativeOf(issue);
  if (haystack.trim().length === 0) return UNCLASSIFIED;
  for (const cls of CRASH_CLASSES) {
    if (cls.patterns.some((p) => p.test(haystack))) return cls.id;
  }
  return UNCLASSIFIED;
}

/**
 * Bucket issues by class and by version. Pure: takes the issue array, returns
 * counts. Unversioned reports get their own bucket and are never merged into
 * a version.
 */
export function buildReport(issues, { version = null } = {}) {
  const selected = [];
  for (const issue of issues ?? []) {
    const parsed = parseVersion(issue?.body);
    if (version !== null && parsed !== version) continue;
    selected.push({ ...issue, version: parsed, class: classify(issue) });
  }

  const byClass = new Map(CRASH_CLASSES.map((c) => [c.id, 0]));
  byClass.set(UNCLASSIFIED, 0);
  const byVersion = new Map();
  let unversioned = 0;

  for (const issue of selected) {
    byClass.set(issue.class, (byClass.get(issue.class) ?? 0) + 1);
    if (issue.version === null) {
      unversioned += 1;
      continue;
    }
    if (!byVersion.has(issue.version)) byVersion.set(issue.version, new Map());
    const bucket = byVersion.get(issue.version);
    bucket.set(issue.class, (bucket.get(issue.class) ?? 0) + 1);
  }

  const classCounts = [...byClass.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

  const classified = selected.length - (byClass.get(UNCLASSIFIED) ?? 0);
  const topClass = classCounts.find((c) => c.id !== UNCLASSIFIED && c.count > 0) ?? null;

  return {
    total: selected.length,
    classified,
    unclassified: byClass.get(UNCLASSIFIED) ?? 0,
    unversioned,
    versioned: selected.length - unversioned,
    topClass,
    classCounts,
    byVersion: [...byVersion.entries()]
      .sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true }))
      .map(([v, counts]) => ({
        version: v,
        total: [...counts.values()].reduce((a, b) => a + b, 0),
        classes: [...counts.entries()]
          .map(([id, count]) => ({ id, count }))
          .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
      })),
  };
}

// --- CLI ------------------------------------------------------------------

function parseArgs(args) {
  const out = { since: null, version: null, limit: 200, json: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--since":
        out.since = args[++i];
        break;
      case "--version":
        out.version = args[++i];
        break;
      case "--limit":
        out.limit = Number.parseInt(args[++i], 10);
        break;
      case "--json":
        out.json = true;
        break;
      default:
        throw new Error(`unknown argument: ${args[i]}`);
    }
  }
  if (!Number.isInteger(out.limit) || out.limit < 1) {
    throw new Error("--limit must be a positive integer");
  }
  return out;
}

/** Run gh, failing loudly and naming the cause rather than returning nothing. */
function gh(args) {
  try {
    return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  } catch (err) {
    const stderr = String(err?.stderr ?? "");
    if (/gh auth login|not logged|authentication/i.test(stderr)) {
      throw new Error(
        "the `gh` CLI is not authenticated. Run `gh auth login`. Reporting zero issues here would read as 'no crashes', which is why this fails instead.",
      );
    }
    if (/rate limit|API rate/i.test(stderr)) {
      throw new Error(
        "the GitHub API rate limit is exhausted. Wait for the reset or use a token with a higher limit. Failing rather than reporting a partial count as if it were complete.",
      );
    }
    if (err?.code === "ENOENT") {
      throw new Error("the `gh` CLI is not installed or not on PATH.");
    }
    throw new Error(`gh ${args.join(" ")} failed: ${stderr.trim() || err?.message}`);
  }
}

function latestReleaseDate() {
  try {
    const raw = gh(["release", "view", "--json", "publishedAt"]);
    return JSON.parse(raw)?.publishedAt ?? null;
  } catch {
    return null; // No releases is a normal state, not an error.
  }
}

function main() {
  let opts;
  try {
    opts = parseArgs(argv.slice(2));
  } catch (err) {
    console.error(`crash-class-report: ${err.message}`);
    exit(2);
  }

  const since = opts.since ?? latestReleaseDate();

  let issues;
  try {
    const args = [
      "issue",
      "list",
      "--state",
      "all",
      "--limit",
      String(opts.limit),
      "--json",
      "number,title,body,createdAt,url",
    ];
    if (since) args.push("--search", `created:>=${String(since).slice(0, 10)}`);
    issues = JSON.parse(gh(args));
  } catch (err) {
    console.error(`crash-class-report: ${err.message}`);
    exit(1);
  }

  const report = buildReport(issues, { version: opts.version });

  if (opts.json) {
    console.log(JSON.stringify({ since, filterVersion: opts.version, ...report }, null, 2));
    exit(0);
  }

  console.log("Crash-class recurrence report");
  console.log(`  since          : ${since ?? "all time (no releases found)"}`);
  if (opts.version) console.log(`  version filter : ${opts.version}`);
  console.log(`  issues read    : ${report.total}`);
  console.log("");

  if (report.total === 0) {
    console.log("No issues in range. Nothing to classify.");
    console.log(
      "This is an honest empty result, not a clean bill of health: the repository may simply have no reports yet.",
    );
    exit(0);
  }

  console.log(`  versioned      : ${report.versioned}`);
  console.log(
    `  unversioned    : ${report.unversioned}  (own bucket; never counted against any build)`,
  );
  console.log("");
  console.log("Per-class match counts (an over-broad class is visible here):");
  for (const { id, count } of report.classCounts) {
    const label = CRASH_CLASSES.find((c) => c.id === id)?.label ?? "Unclassified";
    console.log(`  ${String(count).padStart(4)}  ${id.padEnd(20)} ${label}`);
  }
  console.log("");

  if (report.byVersion.length === 0) {
    console.log("No per-version trend yet: every report in range is unversioned.");
    console.log(
      "Expected while reports predate the bug form. The trend arrives once versioned reports accumulate.",
    );
  } else {
    console.log("Per version:");
    for (const v of report.byVersion) {
      const top = v.classes[0];
      console.log(`  ${v.version.padEnd(12)} ${String(v.total).padStart(4)} report(s)   top: ${top.id} (${top.count})`);
    }
  }

  console.log("");
  console.log(
    report.topClass
      ? `Top class overall: ${report.topClass.id} (${report.topClass.count} of ${report.total}).`
      : "No classified reports in range.",
  );
  exit(0);
}

const invokedDirectly = argv[1] && argv[1].endsWith("crash-class-report.mjs");
if (invokedDirectly) main();
