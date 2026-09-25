/**
 * Bind every sidecar IPC method to one feature id or one exemption.
 * A zero-length enumeration, or a count below the committed snapshot, fails
 * even when every discovered command is mapped. That is the floor.
 *
 * Scope: `export const IPC_METHODS` in desktop/sidecar. This does not close
 * NI-3 (a duplicated value union). It does not read Rust macros.
 */

import fs from "node:fs";
import path from "node:path";

const IDIOM = /export const IPC_METHODS = \[([\s\S]*?)\] as const;/g;

export function enumerateMethods(files) {
  const commands = [];
  const errors = [];
  if (!files.length) {
    errors.push("no registration files were provided");
    return { commands, errors };
  }
  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch (err) {
      errors.push(`cannot read ${file}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const matches = [...text.matchAll(IDIOM)];
    if (matches.length === 0) continue;
    for (const match of matches) {
      const body = match[1] ?? "";
      const names = [...body.matchAll(/"([^"]+)"/g)].map((item) => item[1]);
      if (names.length === 0) {
        errors.push(`IPC_METHODS in ${file} parsed to zero commands`);
      }
      for (const name of names) commands.push({ command: name, file });
    }
  }
  return { commands, errors };
}

export function discoverRegistrationFiles(root) {
  const dir = path.join(root, "desktop", "sidecar", "src");
  if (!fs.existsSync(dir)) return { files: [], errors: [`registration directory missing: ${dir}`] };
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(full);
    }
  };
  walk(dir);
  return { files, errors: [] };
}

export function checkParity({ commands, errors, bindings, features, snapshot, root }) {
  const findings = [...errors];
  const unique = new Set(commands.map((item) => item.command));
  if (unique.size === 0) {
    findings.push("floor: enumeration returned zero commands");
  } else if (unique.size < snapshot) {
    findings.push(`floor: enumerated ${unique.size} commands, snapshot is ${snapshot}`);
  }

  const byCommand = new Map();
  for (const binding of bindings) {
    const list = byCommand.get(binding.command) ?? [];
    list.push(binding);
    byCommand.set(binding.command, list);
  }

  let exempt = 0;
  for (const command of unique) {
    const claims = byCommand.get(command) ?? [];
    if (claims.length === 0) {
      findings.push(`unmapped command: ${command}`);
      continue;
    }
    if (claims.length > 1) {
      findings.push(`command claimed ${claims.length} times: ${command}`);
      continue;
    }
    const claim = claims[0];
    if (claim.exempt === true) {
      if (typeof claim.reason !== "string" || claim.reason.trim().length === 0) {
        findings.push(`exempt command missing reason: ${command}`);
      } else {
        exempt += 1;
      }
      if (claim.feature) findings.push(`command claimed by both a feature and an exemption: ${command}`);
      continue;
    }
    if (typeof claim.feature !== "string" || claim.feature.length === 0) {
      findings.push(`command has neither a feature id nor an exemption: ${command}`);
      continue;
    }
    const feature = features.get(claim.feature);
    if (!feature) {
      findings.push(`unknown feature id ${claim.feature} for ${command}`);
      continue;
    }
    const evidence = path.resolve(root, feature.evidence);
    if (!fs.existsSync(evidence)) {
      findings.push(`dead evidence path for ${command}: ${feature.evidence}`);
    }
  }

  for (const binding of bindings) {
    if (!unique.has(binding.command)) {
      findings.push(`map names a command that is not registered: ${binding.command}`);
    }
  }

  return { findings, enumerated: unique.size, exempt };
}

function loadFeatures(root) {
  const raw = JSON.parse(fs.readFileSync(path.join(root, "feature_list.json"), "utf8"));
  return new Map(raw.features.map((feature) => [feature.id, feature]));
}

function main() {
  const root = process.cwd();
  const discovered = discoverRegistrationFiles(root);
  const enumerated = enumerateMethods(discovered.files);
  const errors = [...discovered.errors, ...enumerated.errors];
  const mapPath = path.join(root, "configs", "command-capabilities.json");
  const snapshotPath = path.join(root, "configs", "command-count-snapshot.json");
  let bindings = [];
  let snapshot = 0;
  try {
    bindings = JSON.parse(fs.readFileSync(mapPath, "utf8")).bindings;
  } catch (err) {
    errors.push(`cannot read command map: ${err instanceof Error ? err.message : String(err)}`);
  }
  try {
    snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8")).count;
  } catch (err) {
    errors.push(`cannot read command snapshot: ${err instanceof Error ? err.message : String(err)}`);
  }
  const report = checkParity({
    commands: enumerated.commands,
    errors,
    bindings,
    features: loadFeatures(root),
    snapshot: Number(snapshot) || 0,
    root,
  });
  const summary = `commands ${report.enumerated}, exempt ${report.exempt}, findings ${report.findings.length}`;
  if (report.findings.length > 0) {
    process.stderr.write(`command-parity: FAIL ${summary}\n`);
    for (const finding of report.findings) process.stderr.write(`  ${finding}\n`);
    process.exit(1);
  }
  process.stdout.write(`command-parity: PASS ${summary}\n`);
}

if (import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, "/")}`).href || process.argv[1]?.endsWith("check-command-parity.mjs")) {
  main();
}
