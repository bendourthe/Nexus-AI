/**
 * v2.13.0 Phase 5 -- the owned media root for generated Image Studio PNGs.
 *
 * Kept free of SQLite imports: the job pump loads it eagerly, while studio
 * session storage stays lazy.
 */

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import * as path from "node:path";

import { PNG_SIGNATURE } from "../../../../core/image/ImageEditRecipe.js";
import { nexusHome } from "../../../../core/storage/paths.js";

const PNG_MAGIC = Buffer.from(PNG_SIGNATURE);

export function generatedImagesRoot(home: string = nexusHome()): string {
  return path.join(home, "generations", "images");
}

/**
 * Write a generated PNG as `<sha256>.png` under `root`. Returns null for bytes
 * that are not a PNG or a failed write, so the caller keeps today's display-only
 * behaviour instead of failing a successful generation.
 */
export function persistGeneratedPng(
  pngBase64: string,
  root: string = generatedImagesRoot(),
): { outputPath: string; outputHash: string } | null {
  try {
    const bytes = Buffer.from(pngBase64, "base64");
    if (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_MAGIC)) return null;
    const outputHash = createHash("sha256").update(bytes).digest("hex");
    mkdirSync(root, { recursive: true });
    const outputPath = path.join(root, `${outputHash}.png`);
    if (!existsSync(outputPath)) {
      const temp = path.join(root, `.${outputHash}.${process.pid}.${randomUUID()}.tmp`);
      writeFileSync(temp, bytes, { flag: "wx" });
      renameSync(temp, outputPath);
    }
    return { outputPath, outputHash };
  } catch {
    return null;
  }
}
