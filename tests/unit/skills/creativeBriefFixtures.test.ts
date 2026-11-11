import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

// v2.16.2 Phase 1 (T004/T005): rehearses the creative-brief workflow on the
// synthetic fixture set. The rules checked here are the ones the skill states:
// a request keeps the baseline and every confirmed literal, names exactly one
// change, carries each reference with its recorded SHA-256, and drafting stops
// when a reference is missing or changed or when the brief is incomplete.

const FIXTURES = path.resolve(__dirname, "../../fixtures/creative-brief");

interface BriefReference {
  readonly role: string;
  readonly path: string;
  readonly sha256: string;
}

interface Brief {
  readonly status: string;
  readonly exactText: readonly string[];
  readonly references: readonly BriefReference[];
  readonly baseline: string;
  readonly unconfirmed: boolean;
}

interface RequestDraft {
  readonly baseline: string;
  readonly delta: string;
  readonly fixed_text: readonly string[];
  readonly references: readonly BriefReference[];
  readonly limits: readonly string[];
}

function parseBrief(file: string): Brief {
  // A Windows checkout may convert the fixture to CRLF; compare by content.
  const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const status = /^Status: (\S+)/m.exec(text)?.[1] ?? "";
  const exactLine = /^- Exact text that must appear: (.*)$/m.exec(text)?.[1] ?? "";
  const exactText = [...exactLine.matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? "");
  const refSection = text.split("## References")[1]?.split("\n## ")[0] ?? "";
  const references = refSection
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| Role") && !line.startsWith("| ---"))
    .map((line) => {
      const [role = "", refPath = "", sha256 = ""] = line.split("|").slice(1, 4).map((c) => c.trim());
      return { role, path: refPath, sha256 };
    });
  const baseline = text.split("## Baseline prompt\n")[1]?.trim() ?? "";
  return { status, exactText, references, baseline, unconfirmed: text.includes("UNCONFIRMED") };
}

function sha256Of(file: string): string | null {
  try {
    return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  } catch {
    return null;
  }
}

/** The skill's step 2: every reference must exist and match its recorded hash. */
function referenceProblems(briefFile: string, brief: Brief): string[] {
  return brief.references.flatMap((ref) => {
    const actual = sha256Of(path.resolve(path.dirname(briefFile), ref.path));
    if (actual === null) return [`missing ${ref.path}`];
    return actual === ref.sha256 ? [] : [`changed ${ref.path}`];
  });
}

/** Drafting is allowed only from a confirmed, complete brief with intact references. */
function mayDraft(briefFile: string): { ok: boolean; reasons: string[] } {
  const brief = parseBrief(briefFile);
  const reasons = [
    ...(brief.status === "confirmed" && !brief.unconfirmed ? [] : ["brief incomplete"]),
    ...referenceProblems(briefFile, brief),
  ];
  return { ok: reasons.length === 0, reasons };
}

describe("creative-brief fixture rehearsal", () => {
  const briefFile = path.join(FIXTURES, "brief.md");
  const brief = parseBrief(briefFile);
  const requestFiles = fs
    .readdirSync(path.join(FIXTURES, "requests"))
    .filter((f) => f.endsWith(".json"))
    .sort();

  it("the confirmed brief is complete and its references are intact", () => {
    expect(brief.status).toBe("confirmed");
    expect(brief.exactText).toEqual(["LANTERN COFFEE"]);
    expect(brief.references).toHaveLength(1);
    expect(mayDraft(briefFile)).toEqual({ ok: true, reasons: [] });
  });

  it("drafts three requests that each keep the baseline, literals and reference identities", () => {
    expect(requestFiles).toHaveLength(3);
    const deltas = new Set<string>();
    for (const file of requestFiles) {
      const draft = JSON.parse(
        fs.readFileSync(path.join(FIXTURES, "requests", file), "utf8"),
      ) as RequestDraft;
      expect(draft.baseline, file).toBe(brief.baseline);
      for (const literal of brief.exactText) {
        expect(draft.fixed_text, file).toContain(literal);
        expect(draft.baseline, file).toContain(literal);
      }
      expect(draft.references, file).toEqual(brief.references);
      expect(draft.delta.trim().length, file).toBeGreaterThan(0);
      expect(draft.limits.length, file).toBeGreaterThan(0);
      deltas.add(draft.delta);
    }
    // One distinct change per output, never the same request three times.
    expect(deltas.size).toBe(requestFiles.length);
  });

  it("refuses to draft when a reference changed since the brief recorded it", () => {
    const result = mayDraft(path.join(FIXTURES, "changed-reference", "brief.md"));
    expect(result.ok).toBe(false);
    expect(result.reasons).toEqual(["changed ../assets/logo.png"]);
  });

  it("refuses to draft when a reference file is missing", () => {
    const tmp = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "brief-"));
    try {
      const copy = path.join(tmp, "brief.md");
      fs.copyFileSync(briefFile, copy);
      expect(mayDraft(copy)).toEqual({ ok: false, reasons: ["missing assets/logo.png"] });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("refuses to draft from an incomplete brief", () => {
    const result = mayDraft(path.join(FIXTURES, "incomplete", "brief.md"));
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("brief incomplete");
  });
});
