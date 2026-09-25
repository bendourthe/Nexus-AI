import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("jsx-a11y flat config", () => {
  it("reports the click-handler fixture, so an unloaded plugin cannot pass", () => {
    const eslintBin = path.resolve(desktopRoot, "..", "node_modules", "eslint", "bin", "eslint.js");
    const result = spawnSync(
      process.execPath,
      [eslintBin, "tests/fixtures/a11y-violation.tsx", "--no-ignore", "--format", "json"],
      {
        cwd: desktopRoot,
        encoding: "utf8",
        env: { ...process.env, ESLINT_USE_FLAT_CONFIG: "true" },
      },
    );
    const parsed = JSON.parse(result.stdout || "[]") as { messages: { ruleId: string | null }[] }[];
    const ruleIds = (parsed[0]?.messages ?? []).map((message) => message.ruleId);
    expect(ruleIds, result.stderr).toContain("jsx-a11y/click-events-have-key-events");
  });
});
