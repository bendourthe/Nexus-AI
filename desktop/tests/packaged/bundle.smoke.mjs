#!/usr/bin/env node
import fs from "node:fs";
import { evaluateSmoke, sha256File } from "./smoke.mjs";

const reportPath = process.argv[2];
if (!reportPath) {
  process.stderr.write("usage: node bundle.smoke.mjs <probe-report.json> [bundle-path]\n");
  process.exit(2);
}
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
if (process.argv[3]) report.digest = sha256File(process.argv[3]);
const result = evaluateSmoke(report);
const line = JSON.stringify({ ok: result.ok, digest: result.digest, findings: result.findings });
if (!result.ok) {
  process.stderr.write(`${line}\n`);
  process.exit(1);
}
process.stdout.write(`${line}\n`);
