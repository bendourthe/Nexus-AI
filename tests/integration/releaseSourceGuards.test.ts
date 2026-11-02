import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";

interface WorkflowStep { id?: string; name?: string; run?: string }
const workflow = parse(readFileSync(".github/workflows/release.yml", "utf8")) as { jobs: Record<string, { steps: WorkflowStep[] }> };
function command(job: string, predicate: (step: WorkflowStep) => boolean): string {
  const script = workflow.jobs[job].steps.find(predicate)?.run;
  if (!script) throw new Error(`Missing release guard in ${job}`);
  return script;
}
const metadata = command("release-metadata", (step) => step.id === "metadata");
const revalidate = command("create-release", (step) => step.name === "Revalidate annotated tag immediately before publication");
const bash = process.platform === "win32" ? join(process.env.ProgramFiles ?? "C:/Program Files", "Git/bin/bash.exe") : "bash";
const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

function git(directory: string, args: string[], input?: string): string {
  const result = spawnSync("git", args, {
    cwd: directory,
    input,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Release Fixture",
      GIT_AUTHOR_EMAIL: "release-fixture@example.invalid",
      GIT_COMMITTER_NAME: "Release Fixture",
      GIT_COMMITTER_EMAIL: "release-fixture@example.invalid",
      GIT_AUTHOR_DATE: "2026-01-01T00:00:00Z",
      GIT_COMMITTER_DATE: "2026-01-01T00:00:00Z",
    },
    timeout: 15_000,
  });
  if (result.status !== 0) throw new Error(`Fixture git ${args[0]} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function fixture(kind: "annotated" | "lightweight" | "outside-main" = "annotated") {
  const directory = mkdtempSync(join(tmpdir(), "nexus release guards "));
  temporary.push(directory);
  const origin = join(directory, "origin.git");
  const work = join(directory, "source");
  git(directory, ["init", "--quiet", "--initial-branch=main", work]);
  const packageJson = JSON.stringify({ version: "2.16.1" });
  const blob = git(work, ["hash-object", "-w", "--stdin"], packageJson);
  const tree = git(work, ["mktree"], `100644 blob ${blob}\tpackage.json\n`);
  const main = git(work, ["commit-tree", tree, "-m", "Main fixture"]);
  const other = git(work, ["commit-tree", tree, "-p", main, "-m", "Unreviewed fixture"]);
  git(work, ["update-ref", "refs/heads/main", main]);
  git(work, ["update-ref", "refs/heads/other", other]);
  git(work, ["read-tree", main]);
  writeFileSync(join(work, "package.json"), packageJson);
  const head = kind === "outside-main" ? other : main;
  if (kind === "outside-main") git(work, ["checkout", "--quiet", "--detach", other]);
  const annotatedTag = (commit: string): string => git(work, ["mktag"], `object ${commit}\ntype commit\ntag v2.16.1\ntagger Release Fixture <release-fixture@example.invalid> 1767225600 +0000\n\nRelease fixture\n`);
  git(work, ["update-ref", "refs/tags/v2.16.1", kind === "lightweight" ? head : annotatedTag(head)]);
  const replacement = annotatedTag(other);
  git(work, ["update-ref", "refs/tags/replacement-fixture", replacement]);
  git(directory, ["clone", "--quiet", "--bare", "--no-hardlinks", work, origin]);
  git(work, ["remote", "add", "origin", origin]);
  return { work, origin, head, replacement };
}

function run(script: string, work: string, head: string) {
  if (process.platform === "win32" && !existsSync(bash)) throw new Error("Git Bash is required to exercise the actual release workflow commands on Windows");
  return spawnSync(bash, ["-c", script], {
    cwd: work,
    encoding: "utf8",
    env: { ...process.env, RELEASE_TAG: "v2.16.1", GITHUB_SHA: head, EXPECTED_SHA: head, GITHUB_OUTPUT: "release-metadata.txt" },
    timeout: 20_000,
  });
}

describe("actual release workflow Git guards", () => {
  it("accepts an annotated tag whose exact source is on main", () => {
    const { work, head } = fixture();
    const checked = run(metadata, work, head);
    expect(checked.status, checked.stderr).toBe(0);
    expect(readFileSync(join(work, "release-metadata.txt"), "utf8")).toContain("version=2.16.1");
    const final = run(revalidate, work, head);
    expect(final.status, final.stderr).toBe(0);
  }, 30_000);

  it("rejects a lightweight tag both before packaging and before publication", () => {
    const { work, head } = fixture("lightweight");
    const checked = run(metadata, work, head);
    expect(checked.status).not.toBe(0);
    expect(checked.stderr).toMatch(/must be annotated/);
    const final = run(revalidate, work, head);
    expect(final.status).not.toBe(0);
    expect(final.stderr).toMatch(/missing or has no peeled commit/);
  }, 30_000);

  it("rejects an otherwise matching annotated release outside reviewed main history", () => {
    const { work, head } = fixture("outside-main");
    const checked = run(metadata, work, head);
    expect(checked.status).not.toBe(0);
    expect(checked.stderr).toMatch(/not on the reviewed main history/);
  }, 30_000);

  it("rejects a remote tag moved after packaging", () => {
    const { work, origin, head, replacement } = fixture();
    const checked = run(metadata, work, head);
    expect(checked.status, checked.stderr).toBe(0);
    git(origin, ["update-ref", "refs/tags/v2.16.1", replacement]);
    const final = run(revalidate, work, head);
    expect(final.status).not.toBe(0);
    expect(final.stderr).toMatch(/moved during the workflow/);
  }, 30_000);
});
