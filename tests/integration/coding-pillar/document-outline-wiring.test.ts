/**
 * v2.11.0 Phase 4.2 -- the outline tools in the VS Code extension: declaration,
 * security posture, flag-gated registration, and inbound-data membership.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { getPermissionTier } from "../../../modules/coding/guardrails/PermissionTiers.js";
import { PermissionTier } from "../../../modules/coding/guardrails/permissionTierMap.js";
import { originForTool } from "../../../modules/coding/guardrails/toolResultOrigin.js";
import { buildDocumentOutlineDeps } from "../../../src/tools/documentOutlineWiring.js";
import { TOOL_CATALOG } from "../../../src/tools/ToolCatalog.js";
import { buildToolRegistry } from "../../../src/tools/ToolRegistryBuilder.js";
import { BUILTIN_TOOL_NAMES } from "../../../src/tools/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../..");
const TOOLS = ["document_outline", "document_read_section"] as const;

function deps(enabled: boolean, env: NodeJS.ProcessEnv = {}) {
  return buildDocumentOutlineDeps({
    documentOutlineEnabled: enabled,
    documentOutlineSummariesEnabled: false,
    cacheDir: null,
    env,
  });
}

describe("declaration", () => {
  it("declares both tools with untrusted-content descriptions and required parameters", () => {
    for (const name of TOOLS) {
      expect(BUILTIN_TOOL_NAMES).toContain(name);
      const entry = TOOL_CATALOG.find((t) => t.name === name);
      expect(entry?.description).toMatch(/untrusted/i);
      expect(entry?.parameters["path"]?.required).toBe(true);
    }
    const read = TOOL_CATALOG.find((t) => t.name === "document_read_section");
    expect(read?.parameters["node_id"]?.required).toBe(true);
    expect(read?.parameters["tree_hash"]?.required).toBe(true);
  });

  it("puts both tools at the CONFIRM tier with a workspace-file origin", () => {
    for (const name of TOOLS) {
      expect(getPermissionTier(name)).toBe(PermissionTier.CONFIRM);
      expect(originForTool(name)).toBe("workspace_file");
    }
  });
});

describe("registration", () => {
  it("registers both tools only when the flag is on", () => {
    const on = buildToolRegistry({ confirmationGate: null, documentOutline: deps(true) } as never);
    const off = buildToolRegistry({ confirmationGate: null, documentOutline: deps(false) } as never);
    for (const name of TOOLS) {
      expect(on.has(name)).toBe(true);
      expect(off.has(name)).toBe(false);
    }
  });

  it("lets the environment switch the tools off over a stored opt-in", () => {
    expect(deps(true, { NEXUS_DOCUMENT_OUTLINE: "0" })).toBeUndefined();
    expect(deps(false, { NEXUS_DOCUMENT_OUTLINE: "1" })).toBeDefined();
  });
});

describe("inbound-data membership (annotation only)", () => {
  it("lists both tools in AgentLoop and the headless mirror", () => {
    const loop = readFileSync(join(REPO, "src/tools/AgentLoop.ts"), "utf8");
    const set = loop.slice(loop.indexOf("INBOUND_EXTERNAL_DATA_TOOLS = new Set"), loop.indexOf("]);", loop.indexOf("INBOUND_EXTERNAL_DATA_TOOLS = new Set")));
    const headless = readFileSync(join(REPO, "modules/coding/runtime/HeadlessAgentSession.ts"), "utf8");
    const hset = headless.slice(headless.indexOf("HEADLESS_INBOUND_TOOLS = new Set"), headless.indexOf("]);", headless.indexOf("HEADLESS_INBOUND_TOOLS = new Set")));
    for (const name of TOOLS) {
      expect(set).toContain(`"${name}"`);
      expect(hset).toContain(`"${name}"`);
    }
  });
});
