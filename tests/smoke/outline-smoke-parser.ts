import { createHash } from "node:crypto";
import type { HeadlessDocumentParser } from "../../modules/coding/runtime/headlessTools.js";

/** Harness-only memo: successful extraction is shared; failed requests can retry. */
export function memoParser(inner: HeadlessDocumentParser): HeadlessDocumentParser {
  const cache = new Map<string, ReturnType<HeadlessDocumentParser["parse"]>>();
  return {
    parse(documentBase64, opts) {
      const key = `${createHash("sha256").update(documentBase64).digest("hex")}|${opts?.maxPages ?? ""}`;
      let hit = cache.get(key);
      if (!hit) {
        hit = inner.parse(documentBase64, opts).catch((error: unknown) => {
          cache.delete(key);
          throw error;
        });
        cache.set(key, hit);
      }
      return hit;
    },
  };
}
