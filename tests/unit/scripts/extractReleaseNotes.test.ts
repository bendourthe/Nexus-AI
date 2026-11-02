import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { extractReleaseNotes } from "../../../scripts/extract-release-notes.mjs";

const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

describe("exact-version release notes", () => {
  it("extracts H2 notes and stops at a following H2 release without dropping subsections", () => {
    const text = "# Changelog\n\n## [2.16.1] - 2026-11-01\n\nFirst change.\n\n### Fixed\n\nSecond change.\n\n## [2.15.1] - 2026-10-23\n\nOlder release.\n";
    expect(extractReleaseNotes(text, "2.16.1")).toBe("First change.\n\n### Fixed\n\nSecond change.\n");
  });

  it("handles linked H1 history, mixed heading levels, CRLF and a v-prefixed heading", () => {
    const text = "# [v2.16.1](https://example.test/compare) (2026-11-01)\r\n\r\nNew notes.\r\n\r\n## Added\r\n\r\nDetails.\r\n\r\n## [2.15.1](https://example.test/older)\r\nOlder.\r\n";
    expect(extractReleaseNotes(text, "v2.16.1")).toBe("New notes.\n\n## Added\n\nDetails.\n");
  });

  it("supports a plain version heading and distinguishes an adjacent patch", () => {
    const text = "## 2.16.10 - 2026-11-02\nOther patch.\n## 2.16.1 - 2026-11-01\nExact patch.\n";
    expect(extractReleaseNotes(text, "2.16.1")).toBe("Exact patch.\n");
  });

  it("keeps apparent release headings inside fenced examples", () => {
    const text = "## [2.16.1]\nExample:\n```markdown\n## [2.15.1]\nnot a section\n```\n~~~text\n## [2.14.1]\n~~~\nDone.\n## [2.15.1]\nOlder.\n";
    expect(extractReleaseNotes(text, "2.16.1")).toContain("## [2.15.1]\nnot a section");
    expect(extractReleaseNotes(text, "2.16.1")).toContain("## [2.14.1]");
    expect(extractReleaseNotes(text, "2.16.1")).not.toContain("Older.");
  });

  it("preserves notes after a release-looking heading in an HTML comment", () => {
    const body = "First change.\n<!-- archived example:\n## [2.15.9]\n-->\nSecond change.\n";
    expect(extractReleaseNotes(`## [2.16.1]\n${body}## [2.15.1]\nOlder.\n`, "2.16.1")).toBe(body);
  });

  it("ignores hidden duplicate releases and fences without hiding real sections", () => {
    const text = "<!--\n## [2.16.1]\n```\n-->\n## [2.16.1] <!-- release date -->\nCurrent.\n## [2.15.1]\nOlder.\n";
    expect(extractReleaseNotes(text, "2.16.1")).toBe("Current.\n");
  });

  it("keeps HTML-comment examples inside fences literal", () => {
    const body = "```html\n<!--\n```\nCurrent.\n";
    expect(extractReleaseNotes(`## [2.16.1]\n${body}## [2.15.1]\nOlder.\n`, "2.16.1")).toBe(body);
  });

  it.each(["`<!--`", "`` `<!--` ``", "`<!--\nliteral`", "`first\nhere <!--\nlast`"])("keeps the literal comment marker %s in inline code", (example) => {
    const body = `Use ${example} to demonstrate the marker.\nSecond.\n`;
    expect(extractReleaseNotes(`## [2.16.1]\n${body}## [2.15.1]\nOlder.\n`, "2.16.1")).toBe(body);
  });

  it("does not match inline backticks across a real release heading", () => {
    const text = "## [2.16.1]\nUnmatched ` opener.\n## [2.15.1]\nOlder ` closer.\n";
    expect(extractReleaseNotes(text, "2.16.1")).toBe("Unmatched ` opener.\n");
  });

  it.each(["\n\n", "\n## Details\n"])("keeps a comment after a paragraph boundary %j separate from inline code", (boundary) => {
    const body = `Unmatched \` opener.${boundary}<!--\n## [2.15.9]\n-->\nSecond \` closer.\n`;
    expect(extractReleaseNotes(`## [2.16.1]\n${body}## [2.15.1]\nOlder.\n`, "2.16.1")).toBe(body);
  });

  it("rejects unfinished HTML comments that could swallow older release notes", () => {
    expect(() => extractReleaseNotes("## [2.16.1]\nCurrent.\n<!--\n## [2.15.1]\nOlder.\n", "2.16.1")).toThrow(/unclosed.*comment/i);
  });

  it("does not treat prose containing a bracketed version as a release heading", () => {
    expect(() => extractReleaseNotes("## Changes for [2.16.1]\nNot a version section.\n", "2.16.1")).toThrow(/missing/i);
  });

  it.each(["```markdown", "~~~text"])("rejects an unfinished %s block that could swallow older notes", (fence) => {
    const text = `## [2.16.1]\nNotes.\n${fence}\nExample.\n## [2.15.1]\nOlder notes.\n`;
    expect(() => extractReleaseNotes(text, "2.16.1")).toThrow(/unclosed.*fenc/i);
  });

  it.each(["", "2.16", "02.16.1", "2.16.1-01", "2.16.1; echo unsafe", "v2.16.1\nanything"])("rejects malformed version %j", (version) => {
    expect(() => extractReleaseNotes("## [2.16.1]\nNotes.\n", version)).toThrow(/version/i);
  });

  it("accepts valid prerelease and build identifiers without matching the stable release", () => {
    const text = "## [2.16.1-rc.1+build.01]\nPreview.\n## [2.16.1]\nStable.\n";
    expect(extractReleaseNotes(text, "v2.16.1-rc.1+build.01")).toBe("Preview.\n");
  });

  it("rejects missing, empty and duplicate release sections", () => {
    expect(() => extractReleaseNotes("## [2.15.1]\nOlder.\n", "2.16.1")).toThrow(/missing/i);
    expect(() => extractReleaseNotes("## [2.16.1]\n\n## [2.15.1]\nOlder.\n", "2.16.1")).toThrow(/empty/i);
    expect(() => extractReleaseNotes("# [2.16.1]\nFirst.\n## [v2.16.1]\nDuplicate.\n", "2.16.1")).toThrow(/duplicate/i);
  });

  it("extracts only the actual current release from the repository changelog", () => {
    const notes = extractReleaseNotes(readFileSync(resolve("CHANGELOG.md"), "utf8"), "2.15.1");
    expect(notes.trim().length).toBeGreaterThan(0);
    expect(notes).not.toMatch(/^#{1,2} \[v?2\.15\.0\]/m);
  });

  it("writes multiline notes through the actual CLI and fails before overwriting on invalid input", () => {
    const directory = mkdtempSync(join(tmpdir(), "nexus-release-notes-"));
    temporary.push(directory);
    const changelog = join(directory, "CHANGELOG.md");
    const output = join(directory, "notes.md");
    writeFileSync(changelog, "## [2.16.1]\nLine one.\nEOF\nLine three.\n## [2.15.1]\nOlder.\n");
    const script = resolve("scripts/extract-release-notes.mjs");
    const valid = spawnSync(process.execPath, [script, "2.16.1", changelog, output], { encoding: "utf8" });
    expect(valid.status, valid.stderr).toBe(0);
    expect(readFileSync(output, "utf8")).toBe("Line one.\nEOF\nLine three.\n");
    const invalid = spawnSync(process.execPath, [script, "2.16.2", changelog, output], { encoding: "utf8" });
    expect(invalid.status).not.toBe(0);
    expect(invalid.stderr).toMatch(/missing/i);
    expect(readFileSync(output, "utf8")).toBe("Line one.\nEOF\nLine three.\n");
  });
});
