/**
 * v2.14.0 T016 -- the opt-in LFM2.5-24B-A2B entry: digest verification at
 * install, and the opt-in guarantees (no pre-ticked default, the coding and
 * installer catalogs agree, license note present).
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadCatalog, type ModelSpec } from "../../../../core/registry/catalog.js";
import { ModelCatalog } from "../../../../core/registry/ModelCatalog.js";
import { ModelStorage } from "../../../../core/registry/ModelStorage.js";
import { NexusModelRegistry } from "../../../../core/registry/NexusModelRegistry.js";
import { lookupAlias, toSidecarRuntime } from "../../../../core/registry/modelAliases.js";
import {
  OllamaDigestMismatchError,
  ollamaManifestPath,
  pinnedGgufDigest,
  readOllamaModelDigest,
  verifyOllamaPull,
} from "../../../../core/registry/ollamaDigest.js";
import { toolFormatForModel } from "../../../../modules/coding/llm/parseAgentToolCalls.js";

const ID = "lfm2.5:24b-a2b";
const TAG = "hf.co/LiquidAI/LFM2.5-24B-A2B-GGUF:QAD-Q4_0";
const PINNED = "d1c03f73ecaf61017d70419eec9e5dc0b05d50ae26c23d522829b934fbabf8a5";

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-t016-"));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

async function spec(): Promise<ModelSpec> {
  const catalog = await loadCatalog();
  const found = catalog.models.find((m) => m.id === ID);
  expect(found).toBeDefined();
  return found!;
}

async function writeManifest(modelsDir: string, digest: string): Promise<void> {
  const file = ollamaManifestPath(TAG, modelsDir);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    JSON.stringify({ layers: [{ mediaType: "application/vnd.ollama.image.model", digest: `sha256:${digest}` }] }),
  );
}

describe("pinned GGUF digest", () => {
  it("pins the admitted entry to its GGUF sha256 and commit", async () => {
    const s = await spec();
    expect(pinnedGgufDigest(s)).toBe(PINNED);
    expect(s.source.revision).toBe("0912d33141f77e10705345a6732bfd83f0252fdc");
  });

  it("does not check an hf.co entry that pins no commit, so its installs are unchanged", async () => {
    const catalog = await loadCatalog();
    const small = catalog.models.find((m) => m.id === "lfm2.5:2.6b")!;
    expect(small.source.revision).toBeUndefined();
    expect(pinnedGgufDigest(small)).toBeNull();
  });

  it("pins nothing for library tags or entries without exactly one real GGUF pin", () => {
    expect(pinnedGgufDigest({ source: { protocol: "ollama", url: "ollama://gemma4:12b" } })).toBeNull();
    expect(
      pinnedGgufDigest({
        source: { protocol: "ollama", url: "ollama://hf.co/x/y:Q4" },
        weights: { layoutVersion: 1, files: [{ path: "a.gguf", sha256: "0".repeat(64) }] },
      }),
    ).toBeNull();
  });

  it("reads the model layer's digest from Ollama's manifest layout", async () => {
    await writeManifest(root, PINNED);
    expect(ollamaManifestPath(TAG, root)).toBe(
      path.join(root, "manifests", "hf.co", "LiquidAI", "LFM2.5-24B-A2B-GGUF", "QAD-Q4_0"),
    );
    expect(await readOllamaModelDigest(TAG, root)).toBe(PINNED);
    expect(await readOllamaModelDigest("hf.co/none/x:Q4", root)).toBeNull();
  });
});

describe("install verification", () => {
  function registryWith(digest: string | null) {
    const pull = vi.fn(async () => undefined);
    const remove = vi.fn(async () => undefined);
    return (async () => {
      const catalog = await loadCatalog();
      const registry = new NexusModelRegistry({
        storage: new ModelStorage(root),
        catalog,
        ollama: { pull, remove },
        readOllamaDigest: async () => digest,
      });
      return { registry, pull, remove };
    })();
  }

  it("installs when the pulled digest matches the pin", async () => {
    const { registry, pull, remove } = await registryWith(PINNED);
    await expect(registry.installById(ID)).resolves.toMatchObject({ id: ID, status: "installed" });
    expect(pull).toHaveBeenCalledWith(TAG, expect.anything());
    expect(remove).not.toHaveBeenCalled();
    expect(await registry.isInstalled(ID)).toBe(true);
  });

  it("fails closed and removes the pulled model when the digest is tampered", async () => {
    const { registry, remove } = await registryWith("f".repeat(64));
    await expect(registry.installById(ID)).rejects.toBeInstanceOf(OllamaDigestMismatchError);
    expect(remove).toHaveBeenCalledWith(TAG);
    expect(await registry.isInstalled(ID)).toBe(false);
  });

  it("fails closed when the digest cannot be read at all", async () => {
    const { registry, remove } = await registryWith(null);
    await expect(registry.installById(ID)).rejects.toThrow(/no readable GGUF digest/);
    expect(remove).toHaveBeenCalledWith(TAG);
  });

  it("leaves unpinned Ollama entries unchecked", async () => {
    const remove = vi.fn(async () => undefined);
    const readDigest = vi.fn(async () => "f".repeat(64));
    await verifyOllamaPull({ source: { protocol: "ollama", url: "ollama://gemma4:12b" } }, "gemma4:12b", remove, readDigest);
    expect(readDigest).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});

describe("opt-in admission", () => {
  it("is in no tier's pre-ticked defaults", () => {
    const recommended = readFileSync(path.resolve(__dirname, "../../../../core/registry/recommended.json"), "utf8");
    expect(recommended).not.toContain("24b-a2b");
    expect(recommended.toLowerCase()).not.toContain("lfm2.5-24b");
  });

  it("carries the license note and is not tagged recommended", async () => {
    const s = await spec();
    expect(s.licenseNote).toMatch(/USD 10M/);
    expect(s.tags).not.toContain("recommended");
    expect(s.role).toBe("worker-candidate");
    expect(s.hideBelowVramGB).toBe(16);
  });

  it("resolves identically through the coding catalog and the installer catalog", async () => {
    const coding = ModelCatalog.byId(ID);
    expect(coding).toMatchObject({ family: "lfm2.5", promptFormat: "lfm", toolFormat: "lfm-pythonic" });
    expect(coding?.reasoningOpensInPrompt).toBeUndefined();
    const runtime = toSidecarRuntime(lookupAlias(ID)!);
    expect(runtime).toMatchObject({ family: coding?.family, promptFormat: coding?.promptFormat, toolFormat: coding?.toolFormat });
    expect(toolFormatForModel(ID)).toBe("lfm-pythonic");
    expect(lookupAlias(TAG)?.catalogId).toBe(ID);
  });
});
