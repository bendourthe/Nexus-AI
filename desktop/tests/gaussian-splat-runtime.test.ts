import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runSplatGenerate, splatJobPaths, type SplatScheduler } from "../sidecar/src/image/GaussianSplatRuntime";

const roots: string[] = [];

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-splat-"));
  roots.push(root);
  return root;
}

function sourcePng(root: string, name: string, bytes = Buffer.from("source-png-bytes")): string {
  const file = path.join(root, name);
  fs.writeFileSync(file, bytes);
  return file;
}

function scheduler(calls: string[], signal = new AbortController().signal): SplatScheduler {
  return {
    async enqueue(job) {
      calls.push(job.jobType);
      return { completion: job.run(signal), cancel: () => undefined };
    },
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("GaussianSplatRuntime", () => {
  const ready = { platform: "win32", nvidia: true, cuda: true };

  it("does not call the scheduler when CUDA is missing and leaves the PNG untouched", async () => {
    const root = tempRoot();
    const png = sourcePng(root, "still.png");
    const before = fs.readFileSync(png);
    const calls: string[] = [];
    const result = await runSplatGenerate({
      parameters: { sourceMessageId: "msg1", sourcePngPath: png, outputId: "job-a" },
      probe: { platform: "win32", nvidia: true, cuda: false },
      generationsRoot: root,
      scheduler: scheduler(calls),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("cuda-missing");
    expect(calls).toEqual([]);
    expect(fs.readFileSync(png).equals(before)).toBe(true);
    expect(fs.existsSync(splatJobPaths(root, "job-a").outputPath)).toBe(false);
  });

  it("promotes a stub splat and keeps the source bytes identical", async () => {
    const root = tempRoot();
    const png = sourcePng(root, "still.png");
    const before = fs.readFileSync(png);
    const calls: string[] = [];
    const result = await runSplatGenerate({
      parameters: { sourceMessageId: "msg1", sourcePngPath: png, outputId: "job-b" },
      probe: ready,
      generationsRoot: root,
      scheduler: scheduler(calls),
    });
    expect(calls).toEqual(["splat_generate"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(fs.readFileSync(result.outputPath).byteLength).toBe(32);
      expect(result.workflow.backend).toBe("stub");
      expect(result.stages).toContain("promoting");
    }
    expect(fs.readFileSync(png).equals(before)).toBe(true);
  });

  it("keeps two jobs for one source in different directories", async () => {
    const root = tempRoot();
    const png = sourcePng(root, "still.png");
    const calls: string[] = [];
    const first = await runSplatGenerate({
      parameters: { sourceMessageId: "msg1", sourcePngPath: png, outputId: "job-c" },
      probe: ready,
      generationsRoot: root,
      scheduler: scheduler(calls),
    });
    const second = await runSplatGenerate({
      parameters: { sourceMessageId: "msg1", sourcePngPath: png, outputId: "job-d" },
      probe: ready,
      generationsRoot: root,
      scheduler: scheduler(calls),
    });
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(first.outputPath).not.toBe(second.outputPath);
  });

  it("times out and cancels without leaving a splat or changing the PNG", async () => {
    const root = tempRoot();
    const png = sourcePng(root, "still.png");
    const before = fs.readFileSync(png);
    const clock = { t: 0 };
    const timed = await runSplatGenerate({
      parameters: { sourceMessageId: "msg1", sourcePngPath: png, outputId: "job-e" },
      probe: ready,
      generationsRoot: root,
      scheduler: scheduler([]),
      timeoutMs: 5,
      now: () => clock.t,
      backend: async () => {
        clock.t = 6;
        return new Uint8Array([1, 2, 3]);
      },
    });
    expect(timed.ok).toBe(false);
    if (!timed.ok) expect(timed.code).toBe("timeout");
    expect(fs.existsSync(splatJobPaths(root, "job-e").outputPath)).toBe(false);

    const controller = new AbortController();
    controller.abort();
    const cancelled = await runSplatGenerate({
      parameters: { sourceMessageId: "msg1", sourcePngPath: png, outputId: "job-f" },
      probe: ready,
      generationsRoot: root,
      scheduler: scheduler([]),
      signal: controller.signal,
    });
    expect(cancelled.ok).toBe(false);
    if (!cancelled.ok) expect(cancelled.code).toBe("cancelled");
    expect(fs.readFileSync(png).equals(before)).toBe(true);
    expect(fs.existsSync(splatJobPaths(root, "job-f").outputPath)).toBe(false);
  });

  it("rejects a splat that would replace the source PNG", async () => {
    const root = tempRoot();
    const paths = splatJobPaths(root, "job-g");
    fs.mkdirSync(paths.jobDir, { recursive: true });
    fs.writeFileSync(paths.outputPath, Buffer.from("png"));
    const result = await runSplatGenerate({
      parameters: { sourceMessageId: "msg1", sourcePngPath: paths.outputPath, outputId: "job-g" },
      probe: ready,
      generationsRoot: root,
      scheduler: scheduler([]),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("malformed");
    expect(fs.readFileSync(paths.outputPath).toString()).toBe("png");
  });
});
