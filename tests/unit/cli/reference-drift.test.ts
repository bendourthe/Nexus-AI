import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { commandsFromHelp, diffReference } from "../../../lib/checks/cli-reference-drift.mjs";
import { HELP } from "../../../bin/nexus.mjs";

const cliDir = join(process.cwd(), "docs", "reference", "cli");

function livePages() {
  const pages = new Map<string, string>();
  for (const name of readdirSync(cliDir)) {
    if (!name.endsWith(".md")) continue;
    pages.set(name, readFileSync(join(cliDir, name), "utf8"));
  }
  return pages;
}

describe("cli reference drift", () => {
  const parsed = commandsFromHelp(HELP);

  it("parses HELP and the live tree has no drift", () => {
    expect(parsed.ok).toBe(true);
    expect(diffReference(parsed.commands, livePages())).toEqual([]);
  });

  it("fails when a command page is missing", () => {
    const pages = livePages();
    pages.delete("session.md");
    const messages = diffReference(parsed.commands, pages);
    expect(messages.some((message) => message.includes("missing page") && message.includes("session"))).toBe(true);
  });

  it("fails when a page documents a group HELP does not list", () => {
    const pages = livePages();
    pages.set("screenshot.md", "# screenshot\n\nnexus screenshot now\n");
    const messages = diffReference(parsed.commands, pages);
    expect(messages.some((message) => message.includes("orphaned page") && message.includes("screenshot.md"))).toBe(true);
  });

  it("fails closed when HELP cannot be parsed", () => {
    const empty = commandsFromHelp("");
    expect(empty.ok).toBe(false);
    expect(empty.error).toMatch(/HELP parse failure/);
    const prose = commandsFromHelp("this is not a usage string");
    expect(prose.ok).toBe(false);
    expect(prose.error).toMatch(/HELP parse failure/);
  });

  it("resolves every relative link under docs/reference/cli", () => {
    for (const name of readdirSync(cliDir)) {
      if (!name.endsWith(".md")) continue;
      const text = readFileSync(join(cliDir, name), "utf8");
      for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const target = match[1] ?? "";
        if (target.startsWith("http") || target.startsWith("#")) continue;
        const path = join(cliDir, target.split("#")[0] ?? "");
        expect(readFileSync(path, "utf8").length).toBeGreaterThan(0);
      }
    }
  });
});
