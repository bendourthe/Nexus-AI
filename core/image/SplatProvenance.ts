/**
 * Sidecar provenance for a local splat. This record stores a path and a hash.
 * It does not embed splat bytes in a PNG tEXt chunk.
 */

import type { SplatFormat } from "./GaussianSplat.js";

export const SPLAT_HONESTY_COPY =
  "This is a generated 3D preview. Unseen sides are invented. It is not a measured property tour.";

export interface SplatProvenance {
  readonly sourceImageHash: string | null;
  readonly format: SplatFormat | null;
  readonly gaussianCount: number | null;
  readonly backend: string | null;
  readonly backendVersion: string | null;
  readonly seed: number | null;
  readonly durationMs: number | null;
  readonly createdAt: string;
  readonly sourcePngName: string;
  readonly splatFileName: string | null;
  readonly screenshotFileName: string;
  readonly incomplete: boolean;
}

export interface SplatProvenanceInput {
  readonly sourceImageHash?: string | null;
  readonly format?: SplatFormat | null;
  readonly gaussianCount?: number | null;
  readonly backend?: string | null;
  readonly backendVersion?: string | null;
  readonly seed?: number | null;
  readonly durationMs?: number | null;
  readonly createdAt: string;
  readonly sourcePngName: string;
  readonly requestId: string;
}

function cleanId(requestId: string): string {
  const cleaned = requestId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
  return cleaned.length > 0 ? cleaned : "preview";
}

function blankToNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function splatArtifactNames(
  sourcePngName: string,
  format: SplatFormat,
  requestId: string,
): { splatFileName: string; screenshotFileName: string } {
  const stem = sourcePngName.replace(/\.png$/i, "") || "nexus-image";
  const suffix = cleanId(requestId);
  const splatFileName = `${stem}-${suffix}.${format}`;
  const screenshotFileName = `${stem}-${suffix}-preview.png`;
  if (splatFileName === sourcePngName || screenshotFileName === sourcePngName) {
    throw new Error("Splat download name collided with the source PNG.");
  }
  return { splatFileName, screenshotFileName };
}

export function buildSplatProvenance(input: SplatProvenanceInput): SplatProvenance {
  const format = input.format === "splat" || input.format === "ply" ? input.format : null;
  const gaussianCount =
    typeof input.gaussianCount === "number" && Number.isInteger(input.gaussianCount) && input.gaussianCount >= 0
      ? input.gaussianCount
      : null;
  const names = format ? splatArtifactNames(input.sourcePngName, format, input.requestId) : null;
  const sourceImageHash = blankToNull(input.sourceImageHash);
  return {
    sourceImageHash,
    format,
    gaussianCount,
    backend: blankToNull(input.backend),
    backendVersion: blankToNull(input.backendVersion),
    seed: typeof input.seed === "number" && Number.isFinite(input.seed) ? input.seed : null,
    durationMs: typeof input.durationMs === "number" && Number.isFinite(input.durationMs) ? input.durationMs : null,
    createdAt: input.createdAt,
    sourcePngName: input.sourcePngName,
    splatFileName: names?.splatFileName ?? null,
    screenshotFileName: names?.screenshotFileName ?? `${input.sourcePngName.replace(/\.png$/i, "") || "nexus-image"}-preview.png`,
    incomplete: sourceImageHash === null || format === null || gaussianCount === null,
  };
}
