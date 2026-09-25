/**
 * v2.4.9 regression: the Ollama eviction fit test must ask about the job's
 * own model, not a per-pillar constant.
 *
 * Found by the repo-local standards judge against the v2.4.8 range. The
 * handoff used `MEDIA_MODEL_VRAM_GB = { image: 6.9, video: 8 }` and called
 * `evictOllamaForJob(job.pillar)`, discarding the model identity, so a job
 * for a 24 GB model was tested as though it needed 8. The decisive case is
 * `wan2.2-ti2v-5b` on a 24 GB host, asserted below end to end against the
 * real catalog and the real `evictOllamaIfTight`.
 */

import { describe, expect, it, vi } from "vitest";

import { loadCatalog } from "../../core/registry/catalog";
import { evictOllamaIfTight } from "../sidecar/src/models/ollamaResidency";
import {
  MEDIA_MODEL_VRAM_FALLBACK_GB,
  jobModelId,
  mediaModelVramGB,
  type CatalogLoader,
} from "../sidecar/src/models/mediaModelVram";

function catalogWith(models: Array<{ id: string; vramGB?: number }>): CatalogLoader {
  return async () =>
    ({ _meta: {}, models }) as unknown as Awaited<ReturnType<CatalogLoader>>;
}

describe("jobModelId", () => {
  it("reads the model id out of the job parameters", () => {
    expect(jobModelId({ modelId: "wan2.2-ti2v-5b", prompt: "x" })).toBe("wan2.2-ti2v-5b");
  });

  it("returns null when the job names no model", () => {
    expect(jobModelId({ prompt: "x" })).toBeNull();
    expect(jobModelId({ modelId: "" })).toBeNull();
    expect(jobModelId({ modelId: 7 })).toBeNull();
  });
});

describe("mediaModelVramGB", () => {
  it("uses the job model's own catalog floor, not the pillar constant", async () => {
    const load = catalogWith([{ id: "wan2.2-ti2v-5b", vramGB: 24 }]);
    await expect(mediaModelVramGB("video", "wan2.2-ti2v-5b", load)).resolves.toBe(24);
    expect(MEDIA_MODEL_VRAM_FALLBACK_GB.video).toBe(8);
  });

  it("falls back to the pillar figure for an unknown model", async () => {
    const load = catalogWith([{ id: "wan2.2-ti2v-5b", vramGB: 24 }]);
    await expect(mediaModelVramGB("image", "not-in-catalog", load)).resolves.toBe(6.9);
  });

  it("falls back when the entry declares no usable floor", async () => {
    const load = catalogWith([{ id: "odd-entry" }, { id: "zero-entry", vramGB: 0 }]);
    await expect(mediaModelVramGB("video", "odd-entry", load)).resolves.toBe(8);
    await expect(mediaModelVramGB("video", "zero-entry", load)).resolves.toBe(8);
  });

  it("falls back rather than throwing when the catalog cannot be read", async () => {
    const load: CatalogLoader = async () => {
      throw new Error("no catalog");
    };
    await expect(mediaModelVramGB("image", "wan2.2-ti2v-5b", load)).resolves.toBe(6.9);
  });

  it("falls back when the job named no model at all", async () => {
    await expect(mediaModelVramGB("video", null, catalogWith([]))).resolves.toBe(8);
  });

  it("resolves real catalog floors that the pillar constants get wrong", async () => {
    const real = await loadCatalog();
    const load: CatalogLoader = async () => real;
    // Every one of these differs from its pillar constant, which is the
    // whole defect: the constant answered for all of them identically.
    await expect(mediaModelVramGB("video", "wan2.2-ti2v-5b", load)).resolves.toBe(24);
    await expect(mediaModelVramGB("video", "wan2.1-t2v-1.3b", load)).resolves.toBe(13);
    await expect(mediaModelVramGB("image", "sana-1.6b-4k", load)).resolves.toBe(20);
    await expect(mediaModelVramGB("image", "sana-1.6b-2k", load)).resolves.toBe(12);
  });
});

describe("the eviction decision the constant got wrong", () => {
  /** 24 GB card, chat model resident holding 12, so 12 GB free. */
  const FREE_VRAM_GB = 12;

  function fetchSpy() {
    return vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href.endsWith("/api/ps")) {
        return new Response(JSON.stringify({ models: [{ name: "gemma4:31b" }] }), {
          status: 200,
        });
      }
      return new Response("{}", { status: 200 });
    });
  }

  it("evicts for a 24 GB video job on a 12 GB-free host", async () => {
    const real = await loadCatalog();
    const modelVramGB = await mediaModelVramGB(
      "video",
      jobModelId({ modelId: "wan2.2-ti2v-5b" }),
      async () => real,
    );
    const fetchImpl = fetchSpy();

    const evicted = await evictOllamaIfTight({
      freeVramGB: FREE_VRAM_GB,
      modelVramGB,
      baseUrl: "http://127.0.0.1:11434",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(modelVramGB).toBe(24);
    expect(evicted).toEqual(["gemma4:31b"]);
  });

  it("shows the pillar constant would have evicted nothing in that same case", async () => {
    const fetchImpl = fetchSpy();

    const evicted = await evictOllamaIfTight({
      freeVramGB: FREE_VRAM_GB,
      modelVramGB: MEDIA_MODEL_VRAM_FALLBACK_GB.video,
      baseUrl: "http://127.0.0.1:11434",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    // 12 >= 8 * 1.5 is true, so the old code left the chat model resident and
    // the 24 GB job went to CPU offload. This assertion documents the defect
    // and fails if the fallback is ever raised into correctness by accident.
    expect(evicted).toEqual([]);
  });

  it("still leaves a small image job alone when there is room", async () => {
    const real = await loadCatalog();
    const modelVramGB = await mediaModelVramGB(
      "image",
      jobModelId({ modelId: "sana-1.6b-int4" }),
      async () => real,
    );
    const fetchImpl = fetchSpy();

    const evicted = await evictOllamaIfTight({
      freeVramGB: FREE_VRAM_GB,
      modelVramGB,
      baseUrl: "http://127.0.0.1:11434",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(modelVramGB).toBe(5);
    expect(evicted).toEqual([]);
  });
});
