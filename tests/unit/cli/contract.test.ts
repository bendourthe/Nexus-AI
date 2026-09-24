import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { HELP } from "../../../bin/nexus.mjs";

/** Subcommands advertised in HELP. A new line that names a command is in this list. */
export function subcommandsFromHelp(help: string): { command: string; subcommand: string | null }[] {
  const seen = new Set<string>();
  const out: { command: string; subcommand: string | null }[] = [];
  for (const line of help.split("\n")) {
    const match = /^\s+nexus ([a-z]+)(?:\s+([a-z]+))?/.exec(line);
    if (!match) continue;
    const command = match[1] ?? "";
    const subcommand = match[2] ?? null;
    const key = `${command} ${subcommand ?? ""}`.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ command, subcommand });
  }
  return out;
}

/** stdout under --json is empty, one JSON value (pretty or compact), or JSON Lines. Prose fails. */
export function stdoutObeysJsonContract(stdout: string): boolean {
  if (stdout.trim().length === 0) return true;
  try {
    JSON.parse(stdout);
    return true;
  } catch {
    // Fall through to JSON Lines.
  }
  const lines = stdout.split(/\r?\n/).filter((line) => line.length > 0);
  return lines.length > 0 && lines.every((line) => {
    try {
      const value = JSON.parse(line) as unknown;
      return value !== null && typeof value === "object";
    } catch {
      return false;
    }
  });
}

function runNexus(args: string[]) {
  return spawnSync(process.execPath, ["bin/nexus.mjs", ...args], {
    encoding: "utf8",
    timeout: 60000,
    cwd: process.cwd(),
    env: { ...process.env, NEXUS_SERVING_TOKEN: "" },
  });
}

describe("nexus CLI output contract", () => {
  const commands = subcommandsFromHelp(HELP);

  it("enumerates every HELP command group", () => {
    const names = commands.map((c) => `${c.command}${c.subcommand ? " " + c.subcommand : ""}`);
    expect(names).toContain("skills list");
    expect(names).toContain("skills sync");
    expect(names).toContain("memory audit");
    expect(names).toContain("session list");
    expect(names).toContain("image");
    expect(names).toContain("video");
    expect(names).toContain("check");
    expect(names.length).toBeGreaterThanOrEqual(20);
  });

  it("rejects prose on stdout under --json", () => {
    expect(stdoutObeysJsonContract("null\n")).toBe(true);
    expect(stdoutObeysJsonContract('{"ok":true}\n{"ok":false}\n')).toBe(true);
    expect(stdoutObeysJsonContract("")).toBe(true);
    expect(stdoutObeysJsonContract("nexus skills list: catalog not yet synced\n")).toBe(false);
  });

  it.each(commands)("$command $subcommand accepts --json with a documented exit and JSON stdout", ({ command, subcommand }) => {
    const args = [command];
    if (subcommand) args.push(subcommand);
    args.push("--json");
    // An invalid tag fails closed before any fetch. A valid tag would clone upstream.
    if (command === "skills" && subcommand === "sync") {
      args.push("--tag", "bad tag");
    }
    const result = runNexus(args);
    expect(result.error, result.error?.message).toBeUndefined();
    expect([0, 1, 2]).toContain(result.status);
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    expect(stdoutObeysJsonContract(stdout)).toBe(true);
    if ((result.status ?? 1) !== 0) {
      expect(stderr.length > 0 || stdout.length > 0).toBe(true);
    }
  });
});
