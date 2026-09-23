import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { stubSplatBytes } from "../../core/image/SplatGenerate";
import { runTripoSplatAdapter, resolveTripoSplatWeights, type ProcessRunner } from "../sidecar/src/image/TripoSplatAdapter";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function weightsRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "nexus-tripo-"));
  roots.push(root);
  const dir = path.join(root, "triposplat");
  mkdirSync(path.join(dir, "diffusion_models"), { recursive: true });
  writeFileSync(path.join(dir, "diffusion_models", "triposplat_fp16.safetensors"), "weights");
  writeFileSync(path.join(dir, "infer.py"), "print('local')\n");
  return root;
}

describe("TripoSplatAdapter", () => {
  it("returns unavailable when weights are missing and does not spawn", async () => {
    const calls: string[][] = [];
    const runner: ProcessRunner = {
      async run(_command, args) {
        calls.push([...args]);
        return { code: 0, stdout: stubSplatBytes() };
      },
    };
    const root = mkdtempSync(path.join(tmpdir(), "nexus-tripo-empty-"));
    roots.push(root);
    await expect(
      runTripoSplatAdapter({
        modelsRoot: root,
        sourcePngPath: "C:/shots/still.png",
        signal: new AbortController().signal,
        runner,
      }),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(calls).toEqual([]);
    expect(resolveTripoSplatWeights(root)).toBeNull();
  });

  it("spawns with the shell disabled and never passes a remote URL", async () => {
    const seen: { command: string; args: readonly string[] }[] = [];
    const runner: ProcessRunner = {
      async run(command, args) {
        seen.push({ command, args });
        expect(args.join(" ")).not.toMatch(/3daistudio|https?:|ftp:/i);
        return { code: 0, stdout: stubSplatBytes() };
      },
    };
    const bytes = await runTripoSplatAdapter({
      modelsRoot: weightsRoot(),
      sourcePngPath: "C:/shots/still.png",
      seed: 3,
      signal: new AbortController().signal,
      runner,
    });
    expect(bytes.byteLength).toBe(32);
    expect(seen[0]?.command).toBe("python");
    expect(seen[0]?.args[0]).toMatch(/infer\.py$/);
    expect(seen[0]?.args).toContain("--max-gaussians");
  });
});
