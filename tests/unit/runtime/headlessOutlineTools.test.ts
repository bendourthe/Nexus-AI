/**
 * v2.11.0 Phase 4.3 -- the outline tools on the headless (desktop sidecar)
 * path: registration, guard parity, and output parity with the extension core.
 */

import { copyFileSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDocumentOutlineTools } from "../../../modules/coding/documents/createDocumentOutlineTools.js";
import { DEFAULT_CONTEXT_TOKENS } from "../../../modules/coding/documents/DocumentOutlineTools.js";
import { screenHeadlessCall } from "../../../modules/coding/runtime/headlessGuards.js";
import { createHeadlessTools, resolveInsideWorkspaceRoots } from "../../../modules/coding/runtime/headlessTools.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "../../fixtures/documents/outline/docs");
let workdir = "";

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "outline-headless-"));
  for (const name of readdirSync(FIXTURES)) copyFileSync(join(FIXTURES, name), join(workdir, name));
});

afterEach(() => rmSync(workdir, { recursive: true, force: true }));

const withoutNonce = (s: string): string => s.replace(/nonce=[0-9a-f]{16}/g, "nonce=X");

describe("headless outline tools", () => {
  it("are absent with the flag off and present with it on", () => {
    expect(createHeadlessTools({}).map((t) => t.name)).not.toContain("document_outline");
    const names = createHeadlessTools({ documentOutlineEnabled: true, outlineCacheDir: null }).map((t) => t.name);
    expect(names).toContain("document_outline");
    expect(names).toContain("document_read_section");
  });

  it("screen the path parameter as a secret path, like parse_document", async () => {
    for (const tool of ["document_outline", "document_read_section"]) {
      const decision = await screenHeadlessCall(tool, { path: ".env" });
      expect(decision.allowed, tool).toBe(false);
      expect(decision.reason).toMatch(/secret-path denylist/);
    }
  });

  it("prompt for confirmation, which is their tier", async () => {
    const confirm = vi.fn(async () => true);
    await screenHeadlessCall("document_outline", { path: "a.md" }, { confirm });
    expect(confirm).toHaveBeenCalled();
  });

  it("produce the same outline and section as the extension core for the same file", async () => {
    const headless = createHeadlessTools({ documentOutlineEnabled: true, outlineCacheDir: null });
    const outlineTool = headless.find((t) => t.name === "document_outline");
    const readTool = headless.find((t) => t.name === "document_read_section");
    const ctx = { workdir, workspaceRoots: [workdir] };
    const h = await outlineTool?.execute({ path: "handbook.md" }, ctx);
    const core = createDocumentOutlineTools({
      cacheDir: null,
      host: {
        resolvePath: (p) => resolveInsideWorkspaceRoots(workdir, [workdir], p),
        checkSecret: async () => null,
        parseDocument: async () => {
          throw new Error("not used");
        },
        contextTokens: () => DEFAULT_CONTEXT_TOKENS,
      },
    });
    const e = await core.outline({ path: "handbook.md" });
    expect(h?.success).toBe(true);
    expect(withoutNonce(h?.output ?? "")).toBe(withoutNonce(e.output));
    const id = /\[([0-9a-f]{8}-[0-9a-f]{12})\]/.exec(e.output)?.[1] ?? "";
    const hash = /tree_hash=([0-9a-f]{64})/.exec(e.output)?.[1] ?? "";
    const hr = await readTool?.execute({ path: "handbook.md", node_id: id, tree_hash: hash }, ctx);
    const er = await core.readSection({ path: "handbook.md", node_id: id, tree_hash: hash });
    expect(withoutNonce(hr?.output ?? "")).toBe(withoutNonce(er.output));
  });

  it("refuse a path outside the call's workspace roots", async () => {
    const tool = createHeadlessTools({ documentOutlineEnabled: true, outlineCacheDir: null }).find((t) => t.name === "document_outline");
    const r = await tool?.execute({ path: "../outside.md" }, { workdir, workspaceRoots: [workdir] });
    expect(r?.success).toBe(false);
  });
});
