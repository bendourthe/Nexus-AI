/**
 * v2.14.0 (inherited gap DF-5) -- the in-app installer fetches every file a
 * Hugging Face entry lists in `weights.files` into `weights/<id>/`, each
 * verified against its own pinned sha256 at the pinned revision.
 */

import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadCatalog, type ModelSpec } from "../../../../core/registry/catalog.js";
import { DigestMismatch } from "../../../../core/registry/Downloader.js";
import { ModelStorage } from "../../../../core/registry/ModelStorage.js";
import { NexusModelRegistry } from "../../../../core/registry/NexusModelRegistry.js";
import { scanWeightsIds } from "../../../../core/registry/scanWeightsProbe.js";

// Pass-through, so one test can make a single folder delete fail.
vi.mock("node:fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs/promises")>();
  return { ...real, rm: vi.fn(real.rm) };
});

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const FILES: Record<string, string> = { "config.json": '{"a":1}', "voices/v.pt": "voice-bytes" };

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-df5-"));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

async function syntheticSpec(overrides: Partial<Record<string, string>> = {}): Promise<{ spec: ModelSpec; catalog: Awaited<ReturnType<typeof loadCatalog>> }> {
  const catalog = await loadCatalog();
  const kokoro = catalog.models.find((m) => m.id === "kokoro-82m")!;
  const spec: ModelSpec = {
    ...kokoro,
    id: "test/voice:1",
    name: "test-voice",
    tag: "1",
    source: { protocol: "huggingface", repo: "org/voice", revision: "a".repeat(40), url: "https://huggingface.co/org/voice/resolve/main/config.json" },
    weights: {
      layoutVersion: 1,
      files: Object.keys(FILES).map((p) => ({ path: p, sha256: overrides[p] ?? sha(FILES[p]!) })),
    },
  };
  return { spec, catalog: { ...catalog, models: [...catalog.models, spec] } };
}

function fetchServing(contents: Record<string, string>) {
  return vi.fn(async (url: string) => {
    const file = Object.keys(contents).find((p) => url.endsWith(`/resolve/${"a".repeat(40)}/${p}`));
    return file ? new Response(contents[file]) : new Response("missing", { status: 404 });
  }) as unknown as typeof fetch;
}

describe("weights.files install", () => {
  it("installs every file into weights/<id>/ verified, and writes the model-id marker", async () => {
    const { spec, catalog } = await syntheticSpec();
    const registry = new NexusModelRegistry({ storage: new ModelStorage(root), catalog });
    const fetch = fetchServing(FILES);
    const result = await registry.install(spec, { fetch });
    const dir = path.join(root, "weights", "test-voice-1");
    expect(result.status).toBe("installed");
    expect(await fs.readFile(path.join(dir, "config.json"), "utf8")).toBe(FILES["config.json"]);
    expect(await fs.readFile(path.join(dir, "voices", "v.pt"), "utf8")).toBe(FILES["voices/v.pt"]);
    expect((await fs.readFile(path.join(dir, ".nexus-model-id"), "utf8")).trim()).toBe(spec.id);
    expect(await registry.isInstalled(spec.id)).toBe(true);
    expect(vi.mocked(fetch).mock.calls.map((c) => c[0])).toEqual([
      `https://huggingface.co/org/voice/resolve/${"a".repeat(40)}/config.json`,
      `https://huggingface.co/org/voice/resolve/${"a".repeat(40)}/voices/v.pt`,
    ]);
  });

  it("keeps a file already present with the pinned digest", async () => {
    const { spec, catalog } = await syntheticSpec();
    const dir = path.join(root, "weights", "test-voice-1");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "config.json"), FILES["config.json"]!);
    const fetch = fetchServing(FILES);
    await new NexusModelRegistry({ storage: new ModelStorage(root), catalog }).install(spec, { fetch });
    expect(vi.mocked(fetch).mock.calls.map((c) => String(c[0]))).toEqual([
      expect.stringContaining("voices/v.pt"),
    ]);
  });

  it("fails closed when a downloaded file does not match its pin", async () => {
    const { spec, catalog } = await syntheticSpec();
    const registry = new NexusModelRegistry({ storage: new ModelStorage(root), catalog });
    await expect(registry.install(spec, { fetch: fetchServing({ ...FILES, "voices/v.pt": "tampered" }) })).rejects.toBeInstanceOf(DigestMismatch);
    expect(await registry.isInstalled(spec.id)).toBe(false);
  });

  it("refuses an entry whose file digests are still placeholders, before any download", async () => {
    const { spec, catalog } = await syntheticSpec({ "voices/v.pt": "0".repeat(64) });
    const fetch = fetchServing(FILES);
    await expect(new NexusModelRegistry({ storage: new ModelStorage(root), catalog }).install(spec, { fetch })).rejects.toThrow(/no verifiable digest for voices\/v\.pt/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("removes the weights folder with the model, but only when its marker names it", async () => {
    const { spec, catalog } = await syntheticSpec();
    const registry = new NexusModelRegistry({ storage: new ModelStorage(root), catalog });
    await registry.install(spec, { fetch: fetchServing(FILES) });
    await registry.remove(spec.id);
    await expect(fs.stat(path.join(root, "weights", "test-voice-1"))).rejects.toThrow();
    expect(await registry.isInstalled(spec.id)).toBe(false);
  });

  // v2.14.0 Phase 5 deep pass (adversarial findings 6 and 7).
  it("keeps a failed install out of weights/ and resumes it from its verified files", async () => {
    const { spec, catalog } = await syntheticSpec();
    const registry = new NexusModelRegistry({ storage: new ModelStorage(root), catalog });
    await expect(registry.install(spec, { fetch: fetchServing({ "config.json": FILES["config.json"]! }) })).rejects.toThrow();
    expect(await scanWeightsIds(root)).not.toContain("test-voice-1");
    expect(await registry.isInstalled(spec.id)).toBe(false);
    const fetch = fetchServing(FILES);
    await registry.install(spec, { fetch });
    expect(vi.mocked(fetch).mock.calls.map((c) => String(c[0]))).toEqual([expect.stringContaining("voices/v.pt")]);
    expect(await scanWeightsIds(root)).toContain("test-voice-1");
    await expect(fs.stat(path.join(root, "weights", ".test-voice-1.partial"))).rejects.toThrow();
  });

  it("keeps the model removable when its folder cannot be deleted", async () => {
    const { spec, catalog } = await syntheticSpec();
    const registry = new NexusModelRegistry({ storage: new ModelStorage(root), catalog });
    await registry.install(spec, { fetch: fetchServing(FILES) });
    vi.mocked(fs.rm).mockRejectedValueOnce(Object.assign(new Error("busy"), { code: "EBUSY" }));
    await expect(registry.remove(spec.id)).rejects.toThrow(/busy/);
    expect(await registry.isInstalled(spec.id)).toBe(true);
    await registry.remove(spec.id);
    expect(await registry.isInstalled(spec.id)).toBe(false);
    await expect(fs.stat(path.join(root, "weights", "test-voice-1"))).rejects.toThrow();
  });

  it("asks for the real voice entries' files at their pinned commits", async () => {
    const catalog = await loadCatalog();
    const kokoro = catalog.models.find((m) => m.id === "kokoro-82m")!;
    const urls: string[] = [];
    const fetch = vi.fn(async (url: string) => {
      urls.push(url);
      return new Response("not the real bytes");
    }) as unknown as typeof fetch;
    await expect(new NexusModelRegistry({ storage: new ModelStorage(root), catalog }).install(kokoro, { fetch })).rejects.toBeInstanceOf(DigestMismatch);
    expect(urls[0]).toBe("https://huggingface.co/hexgrad/Kokoro-82M/resolve/f3ff3571791e39611d31c381e3a41a3af07b4987/config.json");
  });
});
