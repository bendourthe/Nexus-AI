/**
 * Release artifact matrix. The expected list is configs/release-artifacts.json.
 * It is not generated from the workflows. A separate parity pass fails when a
 * workflow upload name is missing from that file.
 */

import fs from "node:fs";
import path from "node:path";

export function checkArtifacts({ expected, files, smokeDigest }) {
  const findings = [];
  const warnings = [];
  if (!Array.isArray(expected) || expected.length === 0) {
    return { ok: false, findings: ["artifact manifest is empty or unreadable"], warnings };
  }
  const seen = new Set();
  for (const item of expected) {
    const file = files.find((candidate) => candidate.name === item.file);
    if (!file) {
      findings.push(`missing artifact: ${item.id} (${item.file})`);
      continue;
    }
    seen.add(file.name);
    if (!file.size || file.size <= 0) findings.push(`zero-length artifact: ${item.file}`);
    if (item.digest && smokeDigest && item.digest !== smokeDigest && item.bindsSmokeDigest) {
      findings.push(`digest mismatch for ${item.file}: smoke ${smokeDigest} matrix ${item.digest}`);
    }
    if (item.bindsSmokeDigest && smokeDigest && file.digest && file.digest !== smokeDigest) {
      findings.push(`digest mismatch for ${item.file}: smoke ${smokeDigest} file ${file.digest}`);
    }
  }
  for (const file of files) {
    if (!seen.has(file.name)) warnings.push(`unexpected artifact: ${file.name}`);
  }
  return { ok: findings.length === 0, findings, warnings };
}

export function parityAgainstWorkflows(expected, workflowText) {
  const uploaded = [...workflowText.matchAll(/name:\s*(NexusSetup-[A-Za-z0-9-]+)/g)].map((match) => match[1]);
  const declared = new Set(expected.map((item) => item.uploadName));
  const findings = [];
  if (uploaded.length === 0) findings.push("no workflow upload names were found");
  for (const name of uploaded) {
    if (!declared.has(name)) findings.push(`workflow artifact ${name} is absent from the declarative matrix`);
  }
  return findings;
}

export function loadExpected(root) {
  const file = path.join(root, "configs", "release-artifacts.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(raw.artifacts)) throw new Error(`artifact manifest is not a list: ${file}`);
  return raw.artifacts;
}

function main() {
  const root = process.cwd();
  const expected = loadExpected(root);
  const workflowNames = [
    ".github/workflows/installer-build.yml",
    ".github/workflows/installer-linux.yml",
    ".github/workflows/installer-macos.yml",
  ];
  const workflowText = workflowNames.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  const parity = parityAgainstWorkflows(expected, workflowText);
  if (parity.length > 0) {
    process.stderr.write(`release-assets: FAIL\n`);
    for (const finding of parity) process.stderr.write(`  ${finding}\n`);
    process.exit(1);
  }
  process.stdout.write(`release-assets: PASS parity ${expected.length} artifacts\n`);
}

if (process.argv[1]?.endsWith("check-release-assets.mjs")) main();

