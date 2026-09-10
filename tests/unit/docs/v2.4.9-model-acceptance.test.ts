/**
 * v2.4.9 Phase 1 -- the model and runtime acceptance bar must stay true
 * against the two files that actually decide what users get.
 *
 * docs/reference/model-acceptance.md organises the catalog as a job map and
 * claims two invariants: every job has exactly one holder, and every
 * catalog.json id is held exactly once or named in an open question. Those
 * are mechanical, so they are asserted here rather than trusted to review.
 * The document names the failure this guards: "A job that quietly acquires a
 * second holder is the specific failure this document exists to catch."
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "../../..");
const BAR = join(REPO_ROOT, "docs/reference/model-acceptance.md");
const CATALOG = join(REPO_ROOT, "core/registry/catalog.json");
const RECOMMENDED = join(REPO_ROOT, "core/registry/recommended.json");

interface JobRow {
  readonly job: string;
  readonly holders: readonly string[];
}

function readBar(): string {
  return readFileSync(BAR, "utf8");
}

function catalogIds(): string[] {
  const parsed = JSON.parse(readFileSync(CATALOG, "utf8")) as {
    models: { id: string }[];
  };
  return parsed.models.map((m) => m.id);
}

/** Job-map rows: `| <job> | \`<holder>\` | ... |`. Column 2 carries the holders. */
function jobRows(markdown: string): JobRow[] {
  const rows: JobRow[] = [];
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    if (cells.length < 2) continue;
    const first = cells[0] ?? "";
    if (first === "Job" || /^-+$/.test(first)) continue;
    const holders = [...(cells[1] ?? "").matchAll(/`([^`]+)`/g)].map(
      (m) => m[1] as string,
    );
    if (holders.length === 0) continue;
    rows.push({ job: first, holders });
  }
  return rows;
}

/** Backticked identifiers named in the open-questions section. */
function openQuestionIds(markdown: string): Set<string> {
  const afterHeading = markdown.split("## Open questions")[1] ?? "";
  const section = afterHeading.split("## The bar")[0] ?? "";
  return new Set([...section.matchAll(/`([^`]+)`/g)].map((m) => m[1] as string));
}

describe("v2.4.9 model and runtime acceptance bar", () => {
  it("exists and is reachable from the contributor entry points", () => {
    expect(existsSync(BAR)).toBe(true);
    const agents = readFileSync(join(REPO_ROOT, "AGENTS.md"), "utf8");
    const contributing = readFileSync(
      join(REPO_ROOT, "CONTRIBUTING.md"),
      "utf8",
    );
    expect(agents).toContain("docs/reference/model-acceptance.md");
    expect(contributing).toContain("docs/reference/model-acceptance.md");
  });

  it("gives every job exactly one holder", () => {
    const rows = jobRows(readBar());
    expect(rows.length).toBeGreaterThan(0);
    const multiple = rows.filter((r) => r.holders.length !== 1);
    expect(
      multiple.map((r) => `${r.job} -> ${r.holders.join(", ")}`),
    ).toStrictEqual([]);
  });

  it("holds every catalog.json id exactly once, or records it as an open question", () => {
    const bar = readBar();
    const rows = jobRows(bar);
    const openQuestions = openQuestionIds(bar);

    const heldBy = new Map<string, string[]>();
    for (const row of rows) {
      for (const holder of row.holders) {
        heldBy.set(holder, [...(heldBy.get(holder) ?? []), row.job]);
      }
    }

    const problems: string[] = [];
    for (const id of catalogIds()) {
      const jobs = heldBy.get(id) ?? [];
      if (jobs.length === 1) continue;
      if (jobs.length > 1) {
        problems.push(`${id} is held by ${jobs.length} jobs: ${jobs.join(", ")}`);
      } else if (!openQuestions.has(id)) {
        problems.push(`${id} has no job and no open question`);
      }
    }
    expect(problems).toStrictEqual([]);
  });

  it("names only real catalog ids and real runtimes as holders", () => {
    const ids = new Set(catalogIds());
    const problems: string[] = [];
    for (const row of jobRows(readBar())) {
      for (const holder of row.holders) {
        if (ids.has(holder)) continue;
        if (holder.startsWith("runtimes/")) {
          const req = join(REPO_ROOT, holder, "requirements.txt");
          if (!existsSync(req)) {
            problems.push(`${holder} has no requirements.txt`);
          }
          continue;
        }
        problems.push(`${holder} is neither a catalog id nor a runtime`);
      }
    }
    expect(problems).toStrictEqual([]);
  });

  it("assigns a default job to every id recommended.json pre-ticks", () => {
    const tiers = (
      JSON.parse(readFileSync(RECOMMENDED, "utf8")) as {
        tiers: Record<string, Record<string, string[]>>;
      }
    ).tiers;

    const preTicked = new Set<string>();
    for (const sections of Object.values(tiers)) {
      for (const ids of Object.values(sections)) {
        for (const id of ids) preTicked.add(id);
      }
    }

    const held = new Set(jobRows(readBar()).flatMap((r) => r.holders));
    const missing = [...preTicked].filter((id) => !held.has(id));
    expect(missing).toStrictEqual([]);
  });
});
