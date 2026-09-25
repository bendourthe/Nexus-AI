#!/usr/bin/env node
/**
 * Feature-inventory drift gate (v2.4.9 Phase 3).
 *
 * `feature_list.json` shipped for a long time claiming v0.8.0 against a product
 * at 2.4.x, and no job read it. An inventory nobody checks is not an inventory,
 * so this asserts the two things that make it true and can run on every PR:
 *
 *   1. Every entry's `evidence` path resolves in the working tree.
 *   2. Every entry's `name` appears verbatim in the README region named by its
 *      `region`, and every name the README states in those regions has an
 *      entry. Drift is checked in BOTH directions, because an inventory that
 *      only grows is as untrue as one that only shrinks.
 *
 * What it deliberately does NOT do (D3, recorded in
 * docs/reference/feature-inventory.md): execute `verificationCommand`. That
 * would be a full test run wearing an inventory's clothes, duplicating ci.yml
 * and too slow to gate a PR. Those fields are advisory.
 *
 * The regions are bounded by heading, and the bound matters: README.md carries
 * a ~180-line "What's new in vX" changelog whose prose names features. Matching
 * anywhere in the file would produce false passes from the changelog, so each
 * region runs from its own `## ` heading to the next `## ` heading and nothing
 * outside those two slices is ever read.
 *
 * Fails CLOSED. A missing file, unparseable JSON, a missing heading, or a
 * region that yields zero names is an error, not a skip: a checker that passes
 * because it found nothing to check is worse than no checker.
 *
 * Usage:
 *   node scripts/check-feature-drift.mjs [--json]
 *
 * Exits 0 when the inventory and the README agree, 1 otherwise.
 */

import { existsSync, readFileSync } from "node:fs";
import process, { argv, exit } from "node:process";

const INVENTORY = "feature_list.json";
const README = "README.md";

/** Region id -> the exact `## ` heading that opens it. */
const REGIONS = {
  "readme:four-pillars": "## The Four Pillars",
  "readme:featured-capabilities": "## Featured Capabilities",
};

/**
 * Slice a region: from its opening `## ` heading to the next `## ` heading, or
 * end of file. Returns null and records an error when the heading is absent.
 */
export function sliceRegion(lines, heading, fail = () => {}) {
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) {
    fail(
      `README region heading not found: ${heading}. The checker parses by heading, so a renamed section silently narrows what is enforced; update REGIONS in this script in the same commit as the rename.`,
    );
    return null;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end);
}

/** Feature names stated in a region: `### <name>` headings and `| **<name>** |` table rows. */
export function namesInRegion(regionLines) {
  const names = [];
  for (const line of regionLines) {
    const headingMatch = /^###\s+(?:\d+\.\s*)?(.+?)\s*$/.exec(line);
    if (headingMatch) {
      names.push(headingMatch[1]);
      continue;
    }
    const rowMatch = /^\|\s*\*\*(.+?)\*\*\s*\|/.exec(line);
    if (rowMatch) names.push(rowMatch[1]);
  }
  return names;
}

/**
 * Pure analysis. Takes the two file contents and a path-existence predicate,
 * returns every problem found. No filesystem reads, no process exit, so tests
 * drive it directly instead of spawning a process against the real repository.
 */
export function analyze({ inventoryRaw, readmeRaw, exists }) {
  const errors = [];
  const fail = (message) => errors.push(message);
  const done = (summary = null) => ({ ok: errors.length === 0, errors, summary });

  if (typeof inventoryRaw !== "string") {
    fail(`feature inventory not found at ${INVENTORY}`);
    return done();
  }
  if (typeof readmeRaw !== "string") {
    fail(`README not found at ${README}`);
    return done();
  }

  let inventory;
  try {
    inventory = JSON.parse(inventoryRaw);
  } catch (err) {
    fail(`${INVENTORY} is not valid JSON: ${err.message}`);
    return done();
  }

  const features = inventory?.features;
  if (!Array.isArray(features) || features.length === 0) {
    fail(`${INVENTORY} has no \`features\` array, or it is empty.`);
    return done();
  }

  if ("version" in inventory) {
    fail(
      `${INVENTORY} carries a \`version\` field. D3 removed it deliberately: semantic-release bumps package.json on main without touching this file, so a version here goes stale and a gating assertion on it would break main from inside a release commit. Read the version from package.json.`,
    );
  }

  const readmeLines = readmeRaw.split("\n");
  const regionNames = new Map();
  for (const [id, heading] of Object.entries(REGIONS)) {
    const slice = sliceRegion(readmeLines, heading, fail);
    if (slice === null) continue;
    const names = namesInRegion(slice);
    if (names.length === 0) {
      fail(
        `README region ${id} (${heading}) yielded zero feature names. Either the section is empty or its markup changed; failing closed rather than reporting a vacuous pass.`,
      );
      continue;
    }
    regionNames.set(id, names);
  }
  if (regionNames.size !== Object.keys(REGIONS).length) return done();

  const seenIds = new Set();
  const claimed = new Map([...regionNames.keys()].map((id) => [id, new Set()]));

  for (const [index, feature] of features.entries()) {
    const where = `${INVENTORY} entry ${index} (${feature?.id ?? "no id"})`;

    for (const field of ["id", "name", "region", "evidence"]) {
      if (typeof feature?.[field] !== "string" || feature[field].length === 0) {
        fail(`${where}: missing or empty required field \`${field}\`.`);
      }
    }
    if (typeof feature?.id === "string") {
      if (seenIds.has(feature.id)) fail(`${where}: duplicate id \`${feature.id}\`.`);
      seenIds.add(feature.id);
    }
    if (typeof feature?.name !== "string" || typeof feature?.region !== "string") continue;

    if (!regionNames.has(feature.region)) {
      fail(
        `${where}: unknown region \`${feature.region}\`. Known regions: ${[...regionNames.keys()].join(", ")}.`,
      );
      continue;
    }

    if (typeof feature.evidence === "string" && !exists(feature.evidence)) {
      fail(
        `${where} "${feature.name}": evidence path does not exist: ${feature.evidence}. Either the feature moved and the inventory did not, or it was removed and the README still claims it.`,
      );
    }

    if (!regionNames.get(feature.region).includes(feature.name)) {
      fail(
        `${where} "${feature.name}": not named in README region ${feature.region}. The inventory claims a feature the README does not state there.`,
      );
    } else {
      claimed.get(feature.region).add(feature.name);
    }
  }

  for (const [regionId, names] of regionNames) {
    for (const name of names) {
      if (!claimed.get(regionId).has(name)) {
        fail(
          `README region ${regionId} names "${name}", which has no entry in ${INVENTORY}. Add it, or stop claiming it in the README.`,
        );
      }
    }
  }

  return done({
    entries: features.length,
    regions: Object.fromEntries([...regionNames].map(([id, n]) => [id, n.length])),
  });
}

function readIfPresent(path) {
  if (!existsSync(path)) return null;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function main() {
  const wantJson = argv.includes("--json");
  const { ok, errors, summary } = analyze({
    inventoryRaw: readIfPresent(INVENTORY),
    readmeRaw: readIfPresent(README),
    exists: existsSync,
  });

  if (wantJson) {
    console.log(JSON.stringify({ ok, errors, summary }, null, 2));
  } else if (!ok) {
    console.error(`check-feature-drift: ${errors.length} problem(s)
`);
    for (const message of errors) console.error(`  - ${message}`);
    console.error("");
  } else {
    const counts = Object.entries(summary?.regions ?? {})
      .map(([id, n]) => `${id}=${n}`)
      .join(", ");
    console.log(
      `check-feature-drift: OK -- ${summary?.entries ?? 0} inventory entries agree with README (${counts})`,
    );
  }
  exit(ok ? 0 : 1);
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith("check-feature-drift.mjs");
if (invokedDirectly) main();
