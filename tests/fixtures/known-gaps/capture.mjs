#!/usr/bin/env node
/**
 * Re-capture the known-gaps fixtures' checker results (v2.15.0).
 *
 * Needs the pinned Nexus-Hub checker (`~/.nexus-hub/scripts/completion_minor.py`),
 * so it runs on a maintainer machine, never in CI. It writes:
 *
 *   discovery.json            the checker's view of repo/ before conversion
 *   expected/<ledger path>    the converter's output for every ledger it changes
 *   expected-parse.json       the checker's parse of each expected output
 *   converted-discovery.json  the checker's view of repo/ with the outputs applied
 *
 * Review expected/ by eye after a capture: the unit tests assert the converter
 * still produces it, and expected-parse.json records that the checker reads it
 * with zero problems.
 *
 * Usage: node tests/fixtures/known-gaps/capture.mjs
 */

import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverLedgers, runAdapter } from "../../../scripts/known-gaps/adapter.mjs";
import { convertLedger, inScope } from "../../../scripts/known-gaps/migrations/normalize.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "repo");
const DATE = "2026-10-19";

const strip = (found) => ({ ...found, ledgers: found.ledgers.map(({ text, ...rest }) => rest) });
const save = (name, value) => writeFileSync(join(HERE, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");

const before = discoverLedgers(REPO);
save("discovery.json", strip(before));

rmSync(join(HERE, "expected"), { recursive: true, force: true });
const converted = mkdtempSync(join(tmpdir(), "known-gaps-capture-"));
cpSync(REPO, converted, { recursive: true });
const parses = {};
for (const ledger of before.ledgers.filter((l) => inScope(l.minor))) {
  const { output, changed } = convertLedger(ledger, before.ledgers, { date: DATE });
  if (!changed) continue;
  const target = join(HERE, "expected", ledger.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, output, "utf8");
  writeFileSync(join(converted, ledger.path), output, "utf8");
  const parsed = runAdapter(["parse", "--stdin"], output).files[0];
  parses[ledger.path] = { items: parsed.items.map(({ body, ...rest }) => rest), problems: parsed.problems };
}
save("expected-parse.json", parses);
save("converted-discovery.json", strip(discoverLedgers(converted)));
rmSync(converted, { recursive: true, force: true });

for (const [path, parsed] of Object.entries(parses)) {
  process.stdout.write(`${path}: ${parsed.items.length} items, ${parsed.problems.length} problems\n`);
}
