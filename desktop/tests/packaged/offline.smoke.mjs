#!/usr/bin/env node
import fs from "node:fs";
import { evaluateSmoke } from "./smoke.mjs";

const reportPath = process.argv[2];
if (!reportPath) {
  process.stderr.write("usage: node offline.smoke.mjs <probe-report.json>\n");
  process.exit(2);
}
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const result = evaluateSmoke(report);
const outbound = result.findings.filter((finding) => finding.startsWith("non-loopback"));
if (outbound.length > 0) {
  process.stderr.write(`${outbound.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("offline: PASS\n");
