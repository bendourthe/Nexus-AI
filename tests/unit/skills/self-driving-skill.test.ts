import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HELP } from "../../../bin/nexus.mjs";

const skillPath = join(process.cwd(), "modules", "coding", "skills", "catalog", "nexus", "SKILL.md");

function frontmatter(text: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  expect(match).toBeTruthy();
  const meta: Record<string, string> = {};
  for (const line of (match?.[1] ?? "").split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return meta;
}

describe("self-driving nexus skill", () => {
  const text = readFileSync(skillPath, "utf8");

  it("exists at the repo-local catalog path and declares a name", () => {
    expect(existsSync(skillPath)).toBe(true);
    expect(frontmatter(text).name).toBe("nexus");
  });

  it("links only to reference pages that exist", () => {
    const links = text.match(/docs\/reference\/cli\/[A-Za-z0-9._-]+\.md/g) ?? [];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(existsSync(join(process.cwd(), link))).toBe(true);
    }
  });

  it("quotes only real HELP commands in the worked round trip", () => {
    const section = text.split("## Worked round trip")[1] ?? "";
    expect(section.length).toBeGreaterThan(0);
    const commands = section.match(/nexus [a-z]+ [a-z]+/g) ?? [];
    expect(commands.length).toBeGreaterThanOrEqual(4);
    for (const command of commands) {
      expect(HELP).toContain(command);
    }
  });
});
