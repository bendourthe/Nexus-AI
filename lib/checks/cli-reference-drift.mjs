/**
 * Rule: cli-reference-drift
 *
 * Every command group advertised in bin/nexus.mjs HELP must have a page at
 * docs/reference/cli/<group>.md, and that page must name each subcommand.
 * A page for a group HELP does not list is an orphan. README.md and
 * contract.md are reserved and are not command pages.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { finding } from "./helpers.mjs";

export const id = "cli-reference-drift";
export const severity = "error";

const RESERVED_PAGES = new Set(["README.md", "contract.md"]);

export function appliesTo(filePath) {
  return filePath.replace(/\\/g, "/").endsWith("/bin/nexus.mjs");
}

export function commandsFromHelp(help) {
  if (typeof help !== "string" || help.trim().length === 0) {
    return { ok: false, error: "HELP parse failure: empty HELP string", commands: [] };
  }
  const commands = [];
  for (const line of help.split(/\r?\n/)) {
    const match = /^\s+nexus ([a-z]+)(?:\s+([a-z]+))?/.exec(line);
    if (!match) continue;
    commands.push({ group: match[1], sub: match[2] ?? null });
  }
  if (commands.length === 0) {
    return { ok: false, error: "HELP parse failure: no nexus subcommands", commands: [] };
  }
  return { ok: true, commands };
}

/** @param {{ group: string, sub: string | null }[]} commands @param {Map<string, string>} pages */
export function diffReference(commands, pages) {
  const messages = [];
  const groups = new Set(commands.map((command) => command.group));
  for (const group of groups) {
    if (!pages.has(`${group}.md`)) {
      messages.push(`missing page for command group "${group}" (expected docs/reference/cli/${group}.md)`);
    }
  }
  for (const command of commands) {
    const page = pages.get(`${command.group}.md`);
    if (!page) continue;
    const needle = command.sub ? `nexus ${command.group} ${command.sub}` : `nexus ${command.group}`;
    if (!page.includes(needle)) {
      messages.push(`page ${command.group}.md does not document "${needle}"`);
    }
  }
  for (const name of pages.keys()) {
    if (RESERVED_PAGES.has(name)) continue;
    const group = name.replace(/\.md$/, "");
    if (!groups.has(group)) {
      messages.push(`orphaned page docs/reference/cli/${name} documents a command group absent from HELP`);
    }
  }
  for (const [name, text] of pages) {
    if (RESERVED_PAGES.has(name)) continue;
    const group = name.replace(/\.md$/, "");
    const realSubs = new Set(
      commands.filter((command) => command.group === group && command.sub).map((command) => command.sub),
    );
    for (const match of text.matchAll(/nexus ([a-z]+) ([a-z]+)/g)) {
      if (match[1] !== group) continue;
      const sub = match[2];
      if (sub && !realSubs.has(sub)) {
        messages.push(`page ${name} documents subcommand "nexus ${group} ${sub}" absent from HELP`);
      }
    }
  }
  return messages;
}

export function loadPages(cliDir) {
  if (!existsSync(cliDir)) {
    return { ok: false, error: `reference directory missing: ${cliDir}`, pages: new Map() };
  }
  const pages = new Map();
  for (const name of readdirSync(cliDir)) {
    if (!name.endsWith(".md")) continue;
    pages.set(name, readFileSync(join(cliDir, name), "utf8"));
  }
  return { ok: true, pages };
}

export function scan(filePath, contents) {
  const helpMatch = /const HELP = `([\s\S]*?)`;/.exec(contents);
  if (!helpMatch) {
    return [
      finding({
        ruleId: id,
        severity,
        filePath,
        line: 1,
        column: 1,
        message: "HELP parse failure: const HELP template not found in bin/nexus.mjs",
      }),
    ];
  }
  const parsed = commandsFromHelp(helpMatch[1] ?? "");
  if (!parsed.ok) {
    return [
      finding({
        ruleId: id,
        severity,
        filePath,
        line: 1,
        column: 1,
        message: parsed.error,
      }),
    ];
  }
  const repoRoot = dirname(dirname(filePath));
  const cliDir = join(repoRoot, "docs", "reference", "cli");
  const loaded = loadPages(cliDir);
  if (!loaded.ok) {
    return [
      finding({
        ruleId: id,
        severity,
        filePath,
        line: 1,
        column: 1,
        message: loaded.error,
      }),
    ];
  }
  return diffReference(parsed.commands, loaded.pages).map((message) =>
    finding({
      ruleId: id,
      severity,
      filePath,
      line: 1,
      column: 1,
      message,
    }),
  );
}
