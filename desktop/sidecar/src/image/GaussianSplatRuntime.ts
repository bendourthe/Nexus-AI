/**
 * Stage a splat beside a source PNG. The PNG is read before and after
 * promotion and is never the output path. The stub backend writes one
 * local Gaussian row; TripoSplat replaces that writer later.
 */

import fs from "node:fs";
import path from "node:path";
import { decodeSplatBytes, MAX_GAUSSIANS } from "../../../../core/image/GaussianSplat.js";
import {
  SPLAT_GENERATE_JOB_TYPE,
  SPLAT_GENERATE_TIMEOUT_MS,
  prepareSplatGenerate,
  stubSplatBytes,
  type SplatGenerateFailureCode,
  type SplatGenerateStage,
  type SplatHostProbe,
} from "../../../../core/image/SplatGenerate.js";
import { buildSplatProvenance } from "../../../../core/image/SplatProvenance.js";

export function probeSplatHost(
  env: NodeJS.ProcessEnv = process.env,
  platform = process.platform,
): SplatHostProbe {
  return {
    platform,
    nvidia: env.NEXUS_SPLAT_NVIDIA === "1",
    cuda: env.NEXUS_SPLAT_CUDA === "1",
  };
}

export interface SplatScheduler {
  enqueue(job: {
    readonly moduleId: "image";
    readonly jobType: string;
    readonly estimatedVramGB: number;
    readonly priority: "foreground" | "background";
    readonly id?: string;
    readonly run: (signal: AbortSignal) => Promise<unknown>;
  }): Promise<{ readonly completion: Promise<unknown>; readonly cancel: () => void }>;
}

export interface SplatGenerateRunResult {
  readonly ok: true;
  readonly outputPath: string;
  readonly stages: readonly SplatGenerateStage[];
  readonly workflow: Record<string, unknown>;
}

export interface SplatGenerateRunFailure {
  readonly ok: false;
  readonly code: SplatGenerateFailureCode;
  readonly message: string;
  readonly stages: readonly SplatGenerateStage[];
}

export function splatJobPaths(root: string, outputId: string): { jobDir: string; outputPath: string } {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(outputId)) {
    throw new Error("malformed: Splat output id is not a single path segment.");
  }
  const jobDir = path.resolve(root, outputId);
  const outputPath = path.join(jobDir, "preview.splat");
  const relative = path.relative(path.resolve(root), jobDir);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("malformed: Splat job directory escapes the generations root.");
  }
  return { jobDir, outputPath };
}

function sameBytes(left: Buffer, right: Buffer): boolean {
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

function failure(
  code: SplatGenerateFailureCode,
  message: string,
  stages: readonly SplatGenerateStage[],
): SplatGenerateRunFailure {
  return { ok: false, code, message, stages };
}

export async function runSplatGenerate(input: {
  readonly parameters: Record<string, unknown>;
  readonly probe: SplatHostProbe;
  readonly generationsRoot: string;
  readonly scheduler: SplatScheduler;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly now?: () => number;
  readonly backend?: (signal: AbortSignal) => Promise<Uint8Array>;
  readonly jobId?: string;
}): Promise<SplatGenerateRunResult | SplatGenerateRunFailure> {
  const prepared = prepareSplatGenerate(input.parameters, input.probe);
  if (!prepared.ok) return prepared;
  const paths = splatJobPaths(input.generationsRoot, prepared.parameters.outputId);
  const sourcePath = path.resolve(prepared.parameters.sourcePngPath);
  if (path.resolve(paths.outputPath) === sourcePath) {
    return failure("malformed", "Splat output must not replace the source PNG.", ["preflight"]);
  }
  if (!fs.existsSync(sourcePath)) {
    return failure("source-missing", "The source PNG is missing. Splat generate did not write a file.", ["preflight"]);
  }
  const sourceBefore = fs.readFileSync(sourcePath);
  const stages: SplatGenerateStage[] = ["preflight", "scheduled"];
  const controller = new AbortController();
  const signal = input.signal ?? controller.signal;
  const onAbort = (): void => controller.abort();
  if (input.signal) input.signal.addEventListener("abort", onAbort);
  try {
    const handle = await input.scheduler.enqueue({
      moduleId: "image",
      jobType: SPLAT_GENERATE_JOB_TYPE,
      estimatedVramGB: 4,
      priority: "foreground",
      id: input.jobId,
      run: async (schedulerSignal) => {
        if (input.signal?.aborted || schedulerSignal.aborted) controller.abort();
        const linked = (): void => controller.abort();
        schedulerSignal.addEventListener("abort", linked);
        try {
          return await promotePreparedSplat({
            sourcePath,
            sourceBefore,
            jobDir: paths.jobDir,
            outputPath: paths.outputPath,
            sourceMessageId: prepared.parameters.sourceMessageId,
            signal: controller.signal,
            timeoutMs: input.timeoutMs ?? SPLAT_GENERATE_TIMEOUT_MS,
            now: input.now ?? Date.now,
            backend: input.backend ?? (async () => stubSplatBytes()),
            stages,
          });
        } finally {
          schedulerSignal.removeEventListener("abort", linked);
        }
      },
    });
    const written = (await handle.completion) as SplatGenerateRunResult | SplatGenerateRunFailure;
    return written;
  } catch (error) {
    quarantine(paths.jobDir, paths.outputPath, sourcePath);
    const message = error instanceof Error ? error.message : "Splat generate failed.";
    if (signal.aborted || controller.signal.aborted) {
      return failure("cancelled", "Splat generate was cancelled.", stages);
    }
    return failure("invalid-output", message, stages);
  } finally {
    if (input.signal) input.signal.removeEventListener("abort", onAbort);
  }
}

export async function promotePreparedSplat(input: {
  readonly sourcePath: string;
  readonly sourceBefore: Buffer;
  readonly jobDir: string;
  readonly outputPath: string;
  readonly sourceMessageId: string;
  readonly signal: AbortSignal;
  readonly timeoutMs: number;
  readonly now: () => number;
  readonly backend: (signal: AbortSignal) => Promise<Uint8Array>;
  readonly stages: SplatGenerateStage[];
}): Promise<SplatGenerateRunResult | SplatGenerateRunFailure> {
  const started = input.now();
  if (input.signal.aborted) {
    return failure("cancelled", "Splat generate was cancelled.", input.stages);
  }
  input.stages.push("writing");
  let bytes: Uint8Array;
  try {
    bytes = await input.backend(input.signal);
  } catch (error) {
    quarantine(input.jobDir, input.outputPath, input.sourcePath);
    if (input.signal.aborted) return failure("cancelled", "Splat generate was cancelled.", input.stages);
    if (isUnavailable(error)) {
      return failure("unavailable", error.message, input.stages);
    }
    const message = error instanceof Error ? error.message : "Splat backend failed.";
    return failure("invalid-output", message, input.stages);
  }
  if (input.signal.aborted) {
    quarantine(input.jobDir, input.outputPath, input.sourcePath);
    return failure("cancelled", "Splat generate was cancelled.", input.stages);
  }
  if (input.now() - started > input.timeoutMs) {
    quarantine(input.jobDir, input.outputPath, input.sourcePath);
    return failure("timeout", "Splat generate timed out.", input.stages);
  }
  const staged = path.join(input.jobDir, "staged.splat");
  fs.mkdirSync(input.jobDir, { recursive: true });
  fs.writeFileSync(staged, bytes);
  try {
    const decoded = decodeSplatBytes(new Uint8Array(fs.readFileSync(staged)));
    if (decoded.count <= 0 || decoded.count > MAX_GAUSSIANS) {
      throw new Error("Splat output has no Gaussians.");
    }
    input.stages.push("promoting");
    fs.renameSync(staged, input.outputPath);
  } catch (error) {
    quarantine(input.jobDir, input.outputPath, input.sourcePath);
    const message = error instanceof Error ? error.message : "Splat output was invalid.";
    return failure("invalid-output", message, input.stages);
  }
  const sourceAfter = fs.readFileSync(input.sourcePath);
  if (!sameBytes(input.sourceBefore, sourceAfter)) {
    quarantine(input.jobDir, input.outputPath, input.sourcePath);
    return failure("source-changed", "The source PNG changed. The splat was not kept.", input.stages);
  }
  const provenance = buildSplatProvenance({
    sourceImageHash: hashBytes(input.sourceBefore),
    format: "splat",
    gaussianCount: decodeSplatBytes(new Uint8Array(fs.readFileSync(input.outputPath))).count,
    backend: "stub",
    backendVersion: "phase-4",
    createdAt: new Date(0).toISOString(),
    sourcePngName: path.basename(input.sourcePath),
    requestId: input.sourceMessageId,
  });
  return {
    ok: true,
    outputPath: input.outputPath,
    stages: input.stages,
    workflow: { ...provenance },
  };
}

function isUnavailable(error: unknown): error is Error {
  return error instanceof Error && (error as Error & { code?: string }).code === "unavailable";
}

function quarantine(jobDir: string, outputPath: string, sourcePath: string): void {
  for (const candidate of [path.join(jobDir, "staged.splat"), outputPath]) {
    if (path.resolve(candidate) === path.resolve(sourcePath)) continue;
    if (fs.existsSync(candidate)) fs.unlinkSync(candidate);
  }
}

function hashBytes(bytes: Buffer): string {
  let hash = 2166136261;
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i] ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
