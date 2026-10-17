/**
 * v2.14.0 T016 -- verify an Ollama `hf.co` pull against its pinned GGUF digest.
 *
 * An `ollama://hf.co/<org>/<repo>:<quant>` tag follows the repository head, so
 * the bytes Ollama pulls can change after the catalog pinned them. An entry
 * that pins a commit (`source.revision`) and exactly one `.gguf` file in
 * `weights.files` is checked after the pull: the model layer's digest in
 * Ollama's on-disk manifest must equal the pinned sha256. Entries without a
 * commit pin are not checked, so existing installs behave as before.
 */

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { ModelSpec } from "./catalog.js";

const MODEL_LAYER = "application/vnd.ollama.image.model";
const SHA256_RE = /^[a-f0-9]{64}$/;
const PLACEHOLDER = "0".repeat(64);

export class OllamaDigestMismatchError extends Error {
  constructor(
    readonly modelTag: string,
    readonly expected: string,
    readonly actual: string | null,
  ) {
    super(
      actual
        ? `pulled ${modelTag} has GGUF digest ${actual}, but the catalog pins ${expected}; the model was removed`
        : `pulled ${modelTag} has no readable GGUF digest in Ollama's manifest; the model was removed`,
    );
    this.name = "OllamaDigestMismatchError";
  }
}

/** The pinned GGUF sha256 of an `hf.co` Ollama entry, or null when none is pinned. */
export function pinnedGgufDigest(spec: Pick<ModelSpec, "source" | "weights">): string | null {
  const url = spec.source?.url ?? "";
  if (spec.source?.protocol !== "ollama" || !url.startsWith("ollama://hf.co/")) return null;
  if (!/^[a-f0-9]{40}$/.test(spec.source.revision ?? "")) return null;
  const ggufs = (spec.weights?.files ?? []).filter((f) => f.path.toLowerCase().endsWith(".gguf"));
  if (ggufs.length !== 1) return null;
  const sha = ggufs[0]!.sha256.toLowerCase();
  return SHA256_RE.test(sha) && sha !== PLACEHOLDER ? sha : null;
}

/** Ollama's model store (`OLLAMA_MODELS` when set). */
export function ollamaModelsDir(env: NodeJS.ProcessEnv = process.env, home: string = homedir()): string {
  return env["OLLAMA_MODELS"] || join(home, ".ollama", "models");
}

/** Path of the manifest Ollama writes for `host/namespace/repo:tag`. */
export function ollamaManifestPath(modelTag: string, modelsDir: string): string {
  const colon = modelTag.lastIndexOf(":");
  const name = colon > 0 ? modelTag.slice(0, colon) : modelTag;
  const tag = colon > 0 ? modelTag.slice(colon + 1) : "latest";
  return join(modelsDir, "manifests", ...name.split("/"), tag);
}

/** The model layer's sha256 from a pulled tag's manifest, or null if unreadable. */
export async function readOllamaModelDigest(modelTag: string, modelsDir: string = ollamaModelsDir()): Promise<string | null> {
  try {
    const manifest = JSON.parse(await readFile(ollamaManifestPath(modelTag, modelsDir), "utf8")) as {
      layers?: Array<{ mediaType?: string; digest?: string }>;
    };
    const layer = (manifest.layers ?? []).find((l) => l.mediaType === MODEL_LAYER);
    const digest = layer?.digest?.replace(/^sha256:/, "").toLowerCase() ?? "";
    return SHA256_RE.test(digest) ? digest : null;
  } catch {
    return null;
  }
}

/**
 * Check a completed pull. Resolves when the entry pins nothing or the digest
 * matches; otherwise removes the pulled model and throws, failing closed.
 */
export async function verifyOllamaPull(
  spec: Pick<ModelSpec, "source" | "weights">,
  modelTag: string,
  remove: (modelTag: string) => Promise<void>,
  readDigest: (modelTag: string) => Promise<string | null> = (tag) => readOllamaModelDigest(tag),
): Promise<void> {
  const expected = pinnedGgufDigest(spec);
  if (!expected) return;
  const actual = await readDigest(modelTag);
  if (actual === expected) return;
  await remove(modelTag).catch(() => undefined);
  throw new OllamaDigestMismatchError(modelTag, expected, actual);
}
