#!/usr/bin/env node
/**
 * Repository-native CI profiles. The same command runs on a developer machine
 * and in GitHub Actions. Profiles: fast, full, platform, report, release.
 *
 *   node scripts/ci-profile.mjs --profile fast --list
 *   node scripts/ci-profile.mjs --profile full
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { platform, release, userInfo } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILES = ["fast", "full", "platform", "report", "release"];

const FAST = [
  ["npm", ["run", "lint"]],
  ["node", ["bin/nexus-check.mjs", "--baseline", "configs/nexus-check-baseline.json"]],
  ["node", ["scripts/check-command-parity.mjs"]],
  ["node", ["scripts/check-release-assets.mjs"]],
  ["node", ["scripts/check-docs-layout.mjs"]],
];

const FULL_AFTER_FAST = [
  ["npm", ["test", "--", "--reporter=dot"]],
];

const RELEASE = [
  ["node", ["scripts/check-release-assets.mjs"]],
];

export function profileCommands(name, host = platform()) {
  if (!PROFILES.includes(name)) {
    throw new Error(`unknown profile "${name}". Expected one of: ${PROFILES.join(", ")}`);
  }
  if (name === "fast") return FAST.map(entry);
  if (name === "full") return [...FAST.map(entry), ...FULL_AFTER_FAST.map(entry)];
  if (name === "release") return RELEASE.map(entry);
  if (name === "report") return [];
  if (host === "win32") return [["pwsh", ["-NoProfile", "-File", "scripts/init.ps1"]]];
  return [["bash", ["scripts/init.sh"]]];
}

function entry(command) {
  return [command[0], command[1].slice()];
}

function parseArgs(argv) {
  const opts = { profile: "", list: false, json: false, reportsDir: join(ROOT, "reports", "ci-profile") };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--list") opts.list = true;
    else if (arg === "--json") opts.json = true;
    else if (arg === "--profile") opts.profile = argv[++i] ?? "";
    else if (arg === "--reports-dir") opts.reportsDir = resolve(argv[++i] ?? "");
    else if (arg === "--help") opts.help = true;
    else throw new Error(`unknown argument ${arg}`);
  }
  return opts;
}

function redact(text) {
  let out = text;
  for (const [name, value] of Object.entries(process.env)) {
    if (!value || value.length < 8) continue;
    if (!/TOKEN|SECRET|KEY|PASSWORD/i.test(name)) continue;
    out = out.split(value).join("<redacted>");
  }
  const home = userInfo().username;
  if (home) out = out.split(home).join("<user>");
  return out;
}

function writeReports(dir, profile, groups, status) {
  mkdirSync(join(dir, "metadata"), { recursive: true });
  const started = groups[0]?.startedAt ?? new Date().toISOString();
  const finished = new Date().toISOString();
  const summary = {
    profile,
    status,
    groups: groups.map((group) => ({
      name: group.name,
      status: group.status,
      durationMs: group.durationMs,
    })),
  };
  const lines = [
    `# ${profile}`,
    "",
    `Status: ${status}`,
    "",
    "| Group | Status | Duration ms |",
    "| --- | --- | ---: |",
    ...groups.map((group) => `| ${group.name} | ${group.status} | ${group.durationMs} |`),
    "",
  ];
  writeFileSync(join(dir, "summary.md"), lines.join("\n"), "utf8");
  writeFileSync(join(dir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  writeFileSync(
    join(dir, "metadata", "environment.json"),
    JSON.stringify(
      {
        profile,
        host: "local",
        os: platform(),
        os_release: release(),
        shell: platform() === "win32" ? "pwsh" : "bash",
        python: process.env.PYTHON ?? "",
        tools: { node: process.version },
        started_at: started,
        finished_at: finished,
        status,
      },
      null,
      2,
    ),
    "utf8",
  );
  writeFileSync(join(dir, `${profile}.json`), JSON.stringify(summary), "utf8");
}

function aggregate(dir) {
  const groups = [];
  if (!existsSync(dir)) {
    return { status: "PARTIAL", groups };
  }
  for (const name of readdirSync(dir).filter((file) => file.endsWith(".json") && file !== "summary.json").sort()) {
    try {
      const parsed = JSON.parse(readFileSync(join(dir, name), "utf8"));
      groups.push({ name: parsed.profile ?? name, status: parsed.status ?? "PARTIAL", durationMs: 0 });
    } catch {
      groups.push({ name, status: "FAIL", durationMs: 0 });
    }
  }
  const status = groups.some((group) => group.status === "FAIL") ? "FAIL" : groups.length === 0 ? "PARTIAL" : "PASS";
  return { status, groups };
}

export function runProfile(options) {
  const commands = profileCommands(options.profile);
  if (options.list) {
    return {
      exitCode: 0,
      payload: { profile: options.profile, commands: commands.map(([cmd, args]) => [cmd, ...args].join(" ")) },
    };
  }
  if (options.profile === "report") {
    const aggregated = aggregate(options.reportsDir);
    const groups = aggregated.groups.length
      ? aggregated.groups
      : [{ name: "report", status: "PARTIAL", durationMs: 0, startedAt: new Date().toISOString() }];
    writeReports(options.reportsDir, "report", groups, aggregated.status);
    return { exitCode: aggregated.status === "FAIL" ? 1 : 0, payload: { profile: "report", status: aggregated.status } };
  }
  const groups = [];
  let failed = false;
  for (const [cmd, args] of commands) {
    const started = Date.now();
    const child = spawnSync(cmd, args, {
      cwd: ROOT,
      encoding: "utf8",
      shell: false,
      timeout: options.profile === "full" || options.profile === "platform" ? 30 * 60 * 1000 : 10 * 60 * 1000,
      env: process.env,
    });
    const durationMs = Date.now() - started;
    const status = child.status === 0 ? "PASS" : "FAIL";
    groups.push({
      name: [cmd, ...args].join(" "),
      status,
      durationMs,
      startedAt: new Date(started).toISOString(),
    });
    const output = redact(`${child.stdout ?? ""}${child.stderr ?? ""}`);
    if (output.trim()) process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
    if (status === "FAIL") {
      failed = true;
      break;
    }
  }
  const status = failed ? "FAIL" : "PASS";
  writeReports(options.reportsDir, options.profile, groups, status);
  return { exitCode: failed ? 1 : 0, payload: { profile: options.profile, status } };
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    return 2;
  }
  if (opts.help || !opts.profile) {
    process.stdout.write(`usage: node scripts/ci-profile.mjs --profile ${PROFILES.join("|")} [--list] [--json] [--reports-dir <dir>]\n`);
    return opts.help ? 0 : 2;
  }
  try {
    const result = runProfile(opts);
    if (opts.json || opts.list) process.stdout.write(`${JSON.stringify(result.payload)}\n`);
    return result.exitCode;
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    return 2;
  }
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invoked) {
  process.exit(main(process.argv.slice(2)));
}
