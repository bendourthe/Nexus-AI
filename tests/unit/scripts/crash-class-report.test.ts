/**
 * v2.4.9 Phase 4 (T023) -- unit tests for the crash-class recurrence report.
 *
 * Acceptance here is fixture-based on purpose. Every issue that exists today
 * predates the bug form, so asserting a non-empty per-version distribution
 * against the live repository would be asserting something that is not true
 * yet and would only become true by accident. These fixtures are issue bodies
 * in exactly the shape GitHub renders the form into.
 *
 * The load-bearing property: an unversioned report is counted in its own
 * bucket and NEVER folded into a version. Counting old reports against a build
 * that already fixed them would overstate recurrence and make a release gate
 * read as failing when it is not.
 */

import { describe, expect, it } from "vitest";

import {
  CRASH_CLASSES,
  UNCLASSIFIED,
  buildReport,
  classify,
  parseVersion,
} from "../../../scripts/crash-class-report.mjs";

/** An issue body in the shape GitHub renders `bug_report.yml` into. */
function formBody({
  version,
  what = "It broke.",
  os = "Windows 11",
  gpu = "RTX 4070 12GB",
}: {
  version?: string;
  what?: string;
  os?: string;
  gpu?: string;
}) {
  const parts = [];
  if (version !== undefined) parts.push(`### Nexus version\n\n${version}\n`);
  parts.push(`### How did you install it?\n\nInstaller\n`);
  parts.push(`### Operating system and version\n\n${os}\n`);
  parts.push(`### GPU, or "CPU only"\n\n${gpu}\n`);
  parts.push(`### What happened?\n\n${what}\n`);
  return parts.join("\n");
}

const issue = (n: number, title: string, body: string) => ({
  number: n,
  title,
  body,
  url: `https://example.invalid/${n}`,
});

describe("parseVersion", () => {
  it("reads the version the form writes", () => {
    expect(parseVersion(formBody({ version: "2.4.8" }))).toBe("2.4.8");
  });

  it("strips a leading v and surrounding markup", () => {
    expect(parseVersion(formBody({ version: "v2.4.8" }))).toBe("2.4.8");
    expect(parseVersion(formBody({ version: "`2.4.8`" }))).toBe("2.4.8");
    expect(parseVersion(formBody({ version: "**2.4.8**." }))).toBe("2.4.8");
  });

  it("accepts a commit SHA, which the form invites for source builds", () => {
    expect(parseVersion(formBody({ version: "f36afd9c" }))).toBe("f36afd9c");
  });

  it("returns null rather than guessing", () => {
    expect(parseVersion(formBody({ version: "latest" }))).toBeNull();
    expect(parseVersion(formBody({ version: "I don't know" }))).toBeNull();
    expect(parseVersion(formBody({}))).toBeNull(); // field absent entirely
    expect(parseVersion("")).toBeNull();
    expect(parseVersion(undefined)).toBeNull();
    expect(parseVersion(null)).toBeNull();
  });

  it("does not mistake another numeric answer for the version", () => {
    // The OS field also contains digits; only the labelled section counts.
    expect(parseVersion(formBody({ version: "2.4.8", os: "Windows 11 26200" }))).toBe("2.4.8");
  });
});

describe("classify", () => {
  it("assigns each documented failure surface to its class", () => {
    expect(classify({ title: "Installer disables the extension checkbox", body: "" })).toBe(
      "install-provision",
    );
    expect(classify({ title: "Stuck on Loading model forever", body: "" })).toBe("model-load");
    expect(classify({ title: "CUDA error", body: "ran out of VRAM mid-render" })).toBe(
      "gpu-handoff",
    );
    expect(classify({ title: "Video generation fails after ten minutes", body: "" })).toBe(
      "generation-failure",
    );
    expect(classify({ title: "All my sessions are missing", body: "" })).toBe("data-persistence");
  });

  it("falls back to unclassified rather than forcing a match", () => {
    expect(classify({ title: "The icon is the wrong shade of blue", body: "" })).toBe(UNCLASSIFIED);
  });

  it("survives a malformed or empty issue without throwing", () => {
    expect(classify({})).toBe(UNCLASSIFIED);
    expect(classify({ title: null, body: null })).toBe(UNCLASSIFIED);
    expect(classify(undefined)).toBe(UNCLASSIFIED);
  });

  it("declares at most five classes, as the plan bounds it", () => {
    expect(CRASH_CLASSES.length).toBeLessThanOrEqual(5);
    expect(new Set(CRASH_CLASSES.map((c) => c.id)).size).toBe(CRASH_CLASSES.length);
  });

  it("gives every class a recorded provenance", () => {
    for (const cls of CRASH_CLASSES) {
      expect(cls.provenance).toBeTruthy();
    }
  });
});

describe("buildReport", () => {
  const ISSUES = [
    issue(1, "Loading model never finishes", formBody({ version: "2.4.8", what: "Stuck on Loading model." })),
    issue(2, "Out of VRAM on a video job", formBody({ version: "2.4.8", what: "CUDA error, out of memory." })),
    issue(3, "Installer will not provision the venv", formBody({ version: "2.4.7", what: "Installer fails." })),
    issue(4, "Sessions vanished", formBody({ what: "My sessions are missing." })), // no version
    issue(5, "Icon colour is odd", formBody({ version: "2.4.8", what: "Cosmetic only." })),
  ];

  it("buckets a versioned report to its own version", () => {
    const r = buildReport(ISSUES);
    const v248 = r.byVersion.find((v: { version: string }) => v.version === "2.4.8");
    const v247 = r.byVersion.find((v: { version: string }) => v.version === "2.4.7");
    expect(v248?.total).toBe(3);
    expect(v247?.total).toBe(1);
  });

  it("puts an unversioned report in its own bucket and in NO version", () => {
    const r = buildReport(ISSUES);
    expect(r.unversioned).toBe(1);
    expect(r.versioned).toBe(4);
    const everyVersionTotal = r.byVersion.reduce(
      (sum: number, v: { total: number }) => sum + v.total,
      0,
    );
    // The unversioned report is counted once overall and zero times per version.
    expect(everyVersionTotal).toBe(4);
    expect(everyVersionTotal + r.unversioned).toBe(r.total);
  });

  it("never counts an unversioned report against the newest build", () => {
    const onlyUnversioned = [issue(9, "Crash", formBody({ what: "VRAM ran out." }))];
    const r = buildReport(onlyUnversioned);
    expect(r.unversioned).toBe(1);
    expect(r.byVersion).toStrictEqual([]);
    expect(r.topClass?.id).toBe("gpu-handoff"); // still classified, just not dated
  });

  it("emits a per-class match count for every class, including zeros", () => {
    const r = buildReport(ISSUES);
    const ids = r.classCounts.map((c: { id: string }) => c.id).sort();
    const expected = [...CRASH_CLASSES.map((c) => c.id), UNCLASSIFIED].sort();
    expect(ids).toStrictEqual(expected);
    const byId = Object.fromEntries(
      r.classCounts.map((c: { id: string; count: number }) => [c.id, c.count]),
    );
    expect(byId["model-load"]).toBe(1);
    expect(byId["gpu-handoff"]).toBe(1);
    expect(byId["install-provision"]).toBe(1);
    expect(byId["data-persistence"]).toBe(1);
    expect(byId[UNCLASSIFIED]).toBe(1);
  });

  it("reports a top class that is never the unclassified bucket", () => {
    const mostlyNoise = [
      issue(1, "Blue is wrong", formBody({ version: "2.4.8", what: "Cosmetic." })),
      issue(2, "Font is wrong", formBody({ version: "2.4.8", what: "Cosmetic." })),
      issue(3, "Out of VRAM", formBody({ version: "2.4.8", what: "VRAM exhausted." })),
    ];
    const r = buildReport(mostlyNoise);
    expect(r.unclassified).toBe(2);
    expect(r.topClass?.id).toBe("gpu-handoff");
  });

  it("filters to one version without folding unversioned reports into it", () => {
    const r = buildReport(ISSUES, { version: "2.4.8" });
    expect(r.total).toBe(3);
    expect(r.unversioned).toBe(0);
    expect(r.byVersion.map((v: { version: string }) => v.version)).toStrictEqual(["2.4.8"]);
  });

  it("does not crash on malformed, empty, or missing input", () => {
    expect(buildReport([]).total).toBe(0);
    expect(buildReport(undefined).total).toBe(0);
    const r = buildReport([
      issue(1, "", ""),
      { number: 2 } as unknown as { number: number },
      issue(3, "VRAM", formBody({ version: "2.4.8", what: "oom" })),
    ]);
    expect(r.total).toBe(3);
    expect(r.unversioned).toBe(2);
    expect(r.unclassified).toBe(2);
  });

  it("reports an honest empty result rather than a clean bill of health", () => {
    const r = buildReport([]);
    expect(r.topClass).toBeNull();
    expect(r.byVersion).toStrictEqual([]);
    expect(r.unversioned).toBe(0);
  });
});
