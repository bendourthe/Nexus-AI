#!/usr/bin/env node
/**
 * Re-capture the known-gaps fixtures' checker results (v2.15.0).
 *
 * Needs the pinned Nexus-Hub checker (`~/.nexus-hub/scripts/completion_minor.py`),
 * so it runs on a maintainer machine, never in CI. It writes:
 *
 *   discovery.json            the checker's view of repo/ (ledgers before conversion)
 *   converted-discovery.json  the checker's view of repo/ with expected/ laid over it
 *
 * expected/ holds the converted form of the fixture ledgers. It was produced by
 * the one-time v2.15.0 converter, removed after that release, and is now plain
 * fixture data: edit it by hand if a test needs another shape.
 *
 * Usage: node tests/fixtures/known-gaps/capture.mjs
 */

import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { discoverLedgers } from "../../../scripts/known-gaps/adapter.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "repo");

const strip = (found) => ({ ...found, ledgers: found.ledgers.map(({ text, ...rest }) => rest) });
const save = (name, value) => writeFileSync(join(HERE, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");

save("discovery.json", strip(discoverLedgers(REPO)));

const converted = mkdtempSync(join(tmpdir(), "known-gaps-capture-"));
cpSync(REPO, converted, { recursive: true });
cpSync(join(HERE, "expected"), converted, { recursive: true });
save("converted-discovery.json", strip(discoverLedgers(converted)));
rmSync(converted, { recursive: true, force: true });
process.stdout.write("captured discovery.json and converted-discovery.json\n");
