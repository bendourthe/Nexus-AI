/**
 * Optional local TripoSplat process. Weights come from the catalog models
 * root. The process is an argument array with the shell disabled. This module
 * does not download weights and does not call a remote splat service.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { MAX_GAUSSIANS } from "../../../../core/image/GaussianSplat.js";

export const TRIPOSPLAT_MODEL_ID = "triposplat";

export class TripoSplatUnavailable extends Error {
  readonly code = "unavailable";

  constructor(message: string) {
    super(message);
    this.name = "TripoSplatUnavailable";
  }
}

export interface ProcessRun {
  readonly code: number | null;
  readonly stdout: Uint8Array;
}

export interface ProcessRunner {
  run(command: string, args: readonly string[], signal: AbortSignal): Promise<ProcessRun>;
}

const TRIPOSPLAT_WEIGHT = path.join("diffusion_models", "triposplat_fp16.safetensors");

export function resolveTripoSplatWeights(modelsRoot: string): string | null {
  const dir = path.resolve(modelsRoot, TRIPOSPLAT_MODEL_ID);
  const relative = path.relative(path.resolve(modelsRoot), dir);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  const marker = path.join(dir, TRIPOSPLAT_WEIGHT);
  const script = path.join(dir, "infer.py");
  if (!fs.existsSync(marker) || !fs.existsSync(script)) return null;
  return dir;
}

export function nodeProcessRunner(): ProcessRunner {
  return {
    run(command, args, signal) {
      return new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(new TripoSplatUnavailable("Splat generate was cancelled."));
          return;
        }
        const child = spawn(command, [...args], { shell: false, windowsHide: true });
        const chunks: Buffer[] = [];
        child.stdout?.on("data", (chunk: Buffer) => chunks.push(chunk));
        const stop = (): void => {
          child.kill();
        };
        signal.addEventListener("abort", stop);
        child.on("error", (error) => {
          signal.removeEventListener("abort", stop);
          reject(error);
        });
        child.on("close", (code) => {
          signal.removeEventListener("abort", stop);
          resolve({ code, stdout: new Uint8Array(Buffer.concat(chunks)) });
        });
      });
    },
  };
}

export async function runTripoSplatAdapter(input: {
  readonly modelsRoot: string;
  readonly sourcePngPath: string;
  readonly seed?: number;
  readonly signal: AbortSignal;
  readonly runner?: ProcessRunner;
  readonly python?: string;
}): Promise<Uint8Array> {
  if (input.signal.aborted) {
    throw new TripoSplatUnavailable("Splat generate was cancelled.");
  }
  const weights = resolveTripoSplatWeights(input.modelsRoot);
  if (!weights) {
    throw new TripoSplatUnavailable("TripoSplat weights are not installed. Generate did not start.");
  }
  const source = path.resolve(input.sourcePngPath);
  if (/^(?:https?:|ftp:|\/\/)/i.test(source) || source.toLowerCase().includes("3daistudio.com")) {
    throw new TripoSplatUnavailable("Splat generate accepts only a local source image.");
  }
  const seed = Number.isFinite(input.seed) ? Math.trunc(input.seed as number) : 0;
  const args = [
    path.join(weights, "infer.py"),
    "--source",
    source,
    "--weights",
    weights,
    "--seed",
    String(seed),
    "--max-gaussians",
    String(MAX_GAUSSIANS),
  ];
  const runner = input.runner ?? nodeProcessRunner();
  const result = await runner.run(input.python ?? "python", args, input.signal);
  if (input.signal.aborted) {
    throw new TripoSplatUnavailable("Splat generate was cancelled.");
  }
  if (result.code !== 0 || result.stdout.byteLength === 0) {
    throw new TripoSplatUnavailable("TripoSplat exited without a splat.");
  }
  return result.stdout;
}
