/**
 * Splat generate contract. Preflight never downloads weights and never
 * falls back to CPU. A later phase replaces the stub writer.
 */

import { assertLocalSplatPath, isRemoteSplatLocation } from "./GaussianSplat.js";

export const SPLAT_GENERATE_JOB_TYPE = "splat_generate";
export const SPLAT_GENERATE_TIMEOUT_MS = 30_000;
export const SPLAT_GENERATE_STAGES = ["preflight", "scheduled", "writing", "promoting"] as const;
export type SplatGenerateStage = (typeof SPLAT_GENERATE_STAGES)[number];

export type SplatPreflightCode = "ready" | "unsupported-platform" | "cuda-missing";

export type SplatGenerateFailureCode =
  | "malformed"
  | "remote-url"
  | "unsupported-platform"
  | "cuda-missing"
  | "timeout"
  | "cancelled"
  | "invalid-output"
  | "source-missing"
  | "source-changed"
  | "unavailable";

export interface SplatHostProbe {
  readonly platform: string;
  readonly nvidia: boolean;
  readonly cuda: boolean;
}

export interface SplatGenerateParameters {
  readonly sourceMessageId: string;
  readonly sourcePngPath: string;
  readonly outputId: string;
}

export type SplatPrepareResult =
  | { readonly ok: true; readonly parameters: SplatGenerateParameters; readonly stages: ["preflight"] }
  | { readonly ok: false; readonly code: SplatGenerateFailureCode; readonly message: string; readonly stages: ["preflight"] };

const TOKEN = /^[A-Za-z0-9_-]{1,80}$/;

export function classifySplatHost(probe: SplatHostProbe): SplatPreflightCode {
  const platform = probe.platform.toLowerCase();
  if (platform === "darwin" || platform === "mac" || platform === "macos") return "unsupported-platform";
  if (platform !== "win32" && platform !== "linux" && platform !== "windows") return "unsupported-platform";
  if (!probe.nvidia) return "unsupported-platform";
  if (!probe.cuda) return "cuda-missing";
  return "ready";
}

export function splatHostMessage(code: SplatPreflightCode): string {
  if (code === "ready") return "Local CUDA generate is available.";
  if (code === "cuda-missing") return "NVIDIA CUDA is not available. Splat generate did not start.";
  return "This computer cannot generate a splat. Splat generate did not start.";
}

export function parseSplatGenerateParameters(
  parameters: Record<string, unknown>,
): { ok: true; value: SplatGenerateParameters } | { ok: false; code: "malformed" | "remote-url"; message: string } {
  const sourceMessageId = typeof parameters.sourceMessageId === "string" ? parameters.sourceMessageId : "";
  const sourcePngPath = typeof parameters.sourcePngPath === "string" ? parameters.sourcePngPath.trim() : "";
  const outputId = typeof parameters.outputId === "string" ? parameters.outputId : "";
  if (!TOKEN.test(sourceMessageId) || !TOKEN.test(outputId)) {
    return { ok: false, code: "malformed", message: "Splat generate needs a message id and a distinct output id." };
  }
  if (isRemoteSplatLocation(sourcePngPath)) {
    return { ok: false, code: "remote-url", message: "Splat generate accepts only a local source image." };
  }
  if (!sourcePngPath.toLowerCase().endsWith(".png") || sourcePngPath.includes("..")) {
    return { ok: false, code: "malformed", message: "Splat generate needs a local PNG path." };
  }
  return { ok: true, value: { sourceMessageId, sourcePngPath, outputId } };
}

export function prepareSplatGenerate(
  parameters: Record<string, unknown>,
  probe: SplatHostProbe,
): SplatPrepareResult {
  const parsed = parseSplatGenerateParameters(parameters);
  if (!parsed.ok) {
    return { ok: false, code: parsed.code, message: parsed.message, stages: ["preflight"] };
  }
  const verdict = classifySplatHost(probe);
  if (verdict !== "ready") {
    return { ok: false, code: verdict, message: splatHostMessage(verdict), stages: ["preflight"] };
  }
  return { ok: true, parameters: parsed.value, stages: ["preflight"] };
}

/** One valid antimatter row. The stub never reads the network. */
export function stubSplatBytes(): Uint8Array {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);
  view.setFloat32(0, 0, true);
  view.setFloat32(4, 0, true);
  view.setFloat32(8, 0, true);
  view.setFloat32(12, 0.1, true);
  view.setFloat32(16, 0.1, true);
  view.setFloat32(20, 0.1, true);
  bytes.set([180, 90, 40, 255], 24);
  bytes.set([0, 0, 0, 255], 28);
  assertLocalSplatPath("stub.splat");
  return bytes;
}
