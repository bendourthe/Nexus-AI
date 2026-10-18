// v2.14.0 Phase 5 (DF-v212-2): count the catalog entries a catalog-wide
// "declared size fits its tier" check would flag, under two definitions.
// Run from the repository root: node docs/releases/v2/v2.14/development/evidence/measure-catalog-size-check.mjs
import { readFileSync } from "node:fs";

const catalog = JSON.parse(readFileSync("core/registry/catalog.json", "utf8"));
const recommended = JSON.parse(readFileSync("core/registry/recommended.json", "utf8"));
const byId = Object.fromEntries(catalog.models.map((m) => [m.id, m]));
const need = (m) => m.requiredVramGB ?? m.vramGB;

// A: every default a tier pre-ticks fits that tier's VRAM (cpu: needs no GPU).
const tierFlags = [];
for (const [tier, sections] of Object.entries(recommended.tiers)) {
  for (const [section, ids] of Object.entries(sections)) {
    for (const id of [].concat(ids)) {
      const m = byId[id];
      if (!m) tierFlags.push(`${tier}/${section}: ${id} not in catalog`);
      else if (tier === "cpu" ? (m.requiredVramGB ?? 0) > 0 : need(m) > Number(tier)) {
        tierFlags.push(`${tier}/${section}: ${id} needs ${need(m)} GB`);
      }
    }
  }
}

// B: an entry's own size fields agree with each other.
const entryFlags = [];
for (const m of catalog.models) {
  if (m.vramGB != null && m.requiredVramGB != null && m.vramGB > m.requiredVramGB) {
    entryFlags.push(`${m.id}: vramGB ${m.vramGB} > requiredVramGB ${m.requiredVramGB}`);
  }
  if (m.hideBelowVramGB != null && need(m) != null && m.hideBelowVramGB < need(m)) {
    entryFlags.push(`${m.id}: hideBelowVramGB ${m.hideBelowVramGB} < ${need(m)}`);
  }
  if (m.sizeGB == null) entryFlags.push(`${m.id}: no sizeGB`);
}

console.log(`entries ${catalog.models.length}`);
console.log(`A tier-default flags ${tierFlags.length}`);
for (const f of tierFlags) console.log(`  ${f}`);
console.log(`B entry-consistency flags ${entryFlags.length}`);
for (const f of entryFlags) console.log(`  ${f}`);
