/**
 * v2.4.9 -- how much VRAM the media job in front of us actually needs.
 *
 * The v2.4.8 GPU handoff asked a per-pillar constant (`image: 6.9`,
 * `video: 8`) and never looked at the model the job named, so the fit test
 * that decides whether to evict Ollama's residents was answering a different
 * question from the one being asked. `core/registry/catalog.json` declares
 * image floors from 2 to 20 GB and video floors from 12 to 24 GB, so the
 * constant is wrong in both directions and badly wrong at the top:
 *
 *   24 GB host, chat model resident holding 12 GB, so freeVramGB = 12.
 *   A wan2.2-ti2v-5b job needs 24 GB. Tested as 8, `12 >= 8 * 1.5` passes,
 *   nothing is evicted, and the runtime then picks its offload strategy
 *   against 12 GB free for a 24 GB floor. That CPU-offload path is exactly
 *   what the eviction was added to prevent.
 *
 * Found by the repo-local standards judge reviewing the v2.4.8 range.
 */

import type { CatalogFile } from "../../../../core/registry/catalog.js";
import { foldRequestModelId } from "../diffusion/route.js";

export type MediaPillar = "image" | "video";

/**
 * Per-pillar figure (SDXL class / Wan 1.3B class), used ONLY when the job's
 * own model cannot be resolved. Keeping a fallback matters: a model missing
 * from the catalog should still get a fit test, just a less precise one.
 */
export const MEDIA_MODEL_VRAM_FALLBACK_GB: Record<MediaPillar, number> = {
  image: 6.9,
  video: 8,
};

export type CatalogLoader = () => Promise<CatalogFile>;

const defaultCatalogLoader: CatalogLoader = async () => {
  const { loadCatalog } = await import("../../../../core/registry/catalog.js");
  return loadCatalog();
};

/** The job's own model id, folded through the alias table, or null. */
export function jobModelId(parameters: Record<string, unknown>): string | null {
  const raw = foldRequestModelId(parameters)["modelId"];
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/**
 * VRAM the job's own model needs, from the catalog, falling back to the
 * pillar figure when the model is unknown, declares no floor, or the catalog
 * cannot be read.
 */
export async function mediaModelVramGB(
  pillar: MediaPillar,
  modelId: string | null,
  loadCatalogImpl: CatalogLoader = defaultCatalogLoader,
): Promise<number> {
  if (modelId) {
    try {
      const catalog = await loadCatalogImpl();
      const entry = catalog.models.find((model) => model.id === modelId);
      if (entry && typeof entry.vramGB === "number" && entry.vramGB > 0) {
        return entry.vramGB;
      }
    } catch {
      // No catalog reachable. The pillar figure is a worse answer than the
      // catalog's, and a better one than skipping the fit test entirely.
    }
  }
  return MEDIA_MODEL_VRAM_FALLBACK_GB[pillar];
}
