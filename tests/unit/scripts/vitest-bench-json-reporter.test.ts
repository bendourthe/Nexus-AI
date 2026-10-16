import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import BenchJsonReporter from "../../../scripts/vitest-bench-json-reporter.mjs";

describe("benchmark JSON reporter", () => {
  it.each(["onFinished", "onTestRunEnd"])("writes nested metrics and errors through %s", (hook) => {
    const root = mkdtempSync(join(tmpdir(), "nexus-bench-reporter-"));
    try {
      const reporter = new BenchJsonReporter();
      reporter.onInit({ version: "4.1.11", config: { root, benchmark: { outputFile: "result.json" } } });
      const file = { name: "rendering.bench.ts", filepath: "rendering.bench.ts", tasks: [{ name: "render small", type: "test", result: { state: "pass", benchmark: { hz: 500, mean: 2, rme: 0.5, samples: [1, 2, 3] } } }] };
      const errors = [{ message: "fixture error", stack: "fixture stack" }];
      if (hook === "onFinished") reporter.onFinished([file], errors);
      else reporter.onTestRunEnd([{ task: file }], errors);
      const report = JSON.parse(readFileSync(join(root, "result.json"), "utf8"));
      expect(report.vitestVersion).toBe("4.1.11");
      expect(report.files[0].result.tasks[0]).toMatchObject({ name: "render small", result: { benchmark: { hz: 500, mean: 2, rme: 0.5, samples: 3 } } });
      expect(report.errors).toEqual(errors);
    } finally { rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }); }
  });
});
