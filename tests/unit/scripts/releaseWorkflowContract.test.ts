import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const read = (path: string): string => readFileSync(path, "utf8");
interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  env?: Record<string, string>;
  with?: Record<string, unknown>;
}
interface Workflow {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  jobs: Record<string, { steps: WorkflowStep[]; needs?: string[] }>;
}
const preview = parse(read(".github/workflows/semantic-release.yml")) as Workflow;
const release = parse(read(".github/workflows/release.yml")) as Workflow;

describe("reviewed release preparation", () => {
  it("does not automatically create main commits, tags or releases", () => {
    expect(Object.keys(preview.on)).toEqual(["workflow_dispatch"]);
    expect(preview.permissions).toEqual({ contents: "read" });
    const steps = Object.values(preview.jobs).flatMap((job) => job.steps);
    expect(steps.some((step) => step.uses?.startsWith("softprops/action-gh-release@"))).toBe(false);
    const commands = steps.map((step) => step.run ?? "").join("\n");
    expect(commands).not.toMatch(/semantic-release|git\s+(?:commit|push|tag)|gh\s+release/);
    expect(commands).toContain("scripts/extract-release-notes.mjs");
    expect(steps.filter((step) => step.uses?.startsWith("actions/checkout@")).every((step) => step.with?.["persist-credentials"] === false)).toBe(true);
  });

  it("keeps the optional semantic-release configuration read-only by default", () => {
    const config = JSON.parse(read(".releaserc.json"));
    expect(config.dryRun).toBe(true);
    expect(config.plugins).toEqual(["@semantic-release/commit-analyzer", "@semantic-release/release-notes-generator"]);
  });
});

describe("exact-tag artifact publication", () => {
  const job = release.jobs["create-release"];
  const steps = job.steps;

  it("consumes the exact checked-out notes as a file, preserving arbitrary multiline content", () => {
    const extractor = steps.find((step) => step.name === "Extract release notes from CHANGELOG");
    expect(extractor?.run).toContain("scripts/extract-release-notes.mjs");
    expect(extractor?.run).not.toContain("$GITHUB_OUTPUT");
    expect(extractor?.env?.RELEASE_VERSION).toBe("${{ needs.release-metadata.outputs.version }}");
    const publish = steps.find((step) => step.uses?.startsWith("softprops/action-gh-release@"));
    expect(publish?.with?.body_path).toBe("release-notes.md");
    expect(publish?.with?.body).toBeUndefined();
  });

  it("retains source validation, both packaging gates and tag revalidation before publication", () => {
    expect(job.needs).toEqual(expect.arrayContaining(["release-metadata", "release-verification", "build-vsix", "build-installer-windows"]));
    const verify = steps.findIndex((step) => step.name === "Revalidate annotated tag immediately before publication");
    const publish = steps.findIndex((step) => step.uses?.startsWith("softprops/action-gh-release@"));
    expect(verify).toBeGreaterThan(-1);
    expect(publish).toBeGreaterThan(verify);
    expect(steps[verify].run).toContain('"$TAG_SHA" != "$EXPECTED_SHA"');
    expect(steps[publish].with?.target_commitish).toBe("${{ github.sha }}");
    expect(steps[publish].with?.files).toContain("artifacts/nexus-coding-*.vsix");
    expect(steps[publish].with?.files).toContain("artifacts/NexusSetup.exe");
    expect(steps[publish].with?.files).toContain("artifacts/SHA256SUMS.txt");
  });
});


describe("frozen Windows installer acceptance", () => {
  it("requires real installation before publishing the installer and retains its receipt", () => {
    for (const [workflow, jobName] of [[release, "build-installer-windows"], [parse(read(".github/workflows/installer-build.yml")) as Workflow, "build-windows-installer"]] as const) {
      const steps = workflow.jobs[jobName].steps;
      const smoke = steps.findIndex((step) => step.run?.includes("smoke-windows-exe.ps1"));
      expect(smoke).toBeGreaterThan(-1);
      expect(steps[smoke].run).toContain("-InstallDesktop");
      const binary = steps.findIndex((step) => step.uses?.startsWith("actions/upload-artifact@") && step.with?.path === "dist/NexusSetup.exe");
      expect(binary).toBeGreaterThan(smoke);
      expect(steps.some((step) => step.uses?.startsWith("actions/upload-artifact@") && String(step.with?.path).includes("packaged-install-"))).toBe(true);
    }
  });
});
