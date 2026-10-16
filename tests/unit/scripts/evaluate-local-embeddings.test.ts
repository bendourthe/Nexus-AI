import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
// Existing command helpers are JavaScript modules consumed directly by Node.
// @ts-expect-error The standalone evaluation helper has no emitted declaration.
import { loadEvaluation, validateVector, p95, pairedInterval, compareArms, ownedPath } from "../../../lib/embedding-eval.mjs";

const contractPath = "docs/releases/v2/v2.13/development/embedding-eval-contract.json";
const checkout = resolve(__dirname, "../../..");
const temporary: string[] = [];
let pinnedSources: Map<string, Buffer> | undefined;

function disposableFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "nexus-eval-test-"));
  temporary.push(root);
  const corpus = JSON.parse(readFileSync(join(checkout, "tests/fixtures/embedding-eval/held-out.json"), "utf8"));
  // One Git process for the immutable source snapshot; no per-case process storm.
  if (!pinnedSources) {
    const sources = [...new Set<string>(corpus.chunks.map((chunk: { source: string }) => chunk.source))];
    const output = execFileSync("git", ["cat-file", "--batch"], {
      cwd: checkout, maxBuffer: 8 * 1024 * 1024,
      input: sources.map((path) => "90b95f2439959ddfa4c902d287a6d673df785dd9:" + path).join("\n") + "\n",
    });
    const captured = new Map<string, Buffer>();
    let offset = 0;
    for (const path of sources) {
      const end = output.indexOf(10, offset);
      const header = output.subarray(offset, end).toString("ascii").match(/^[a-f0-9]+ blob (\d+)$/);
      if (end < offset || !header) throw new Error("Pinned source snapshot unavailable.");
      const size = Number(header[1]);
      const start = end + 1;
      if (!Number.isSafeInteger(size) || size < 0 || output[start + size] !== 10) throw new Error("Invalid Git snapshot frame.");
      captured.set(path, Buffer.from(output.subarray(start, start + size)));
      offset = start + size + 1;
    }
    pinnedSources = captured;
  }
  const files = [contractPath, "tests/fixtures/embedding-eval/manifest.json",
    "tests/fixtures/embedding-eval/held-out.json", "tests/fixtures/embedding-eval/tuning.json",
    ...corpus.chunks.map((chunk: { source: string }) => chunk.source)];
  for (const path of new Set<string>(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    if (path === contractPath || path.startsWith("tests/fixtures/embedding-eval/")) copyFileSync(join(checkout, path), join(root, path));
    else {
      const bytes = pinnedSources.get(path);
      if (!bytes) throw new Error("Missing pinned source.");
      writeFileSync(join(root, path), bytes);
    }
  }
  return root;
}

afterEach(() => { for (const root of temporary.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe("local embedding evaluation evidence boundary", () => {
  it("exercises CLI argument refusal without opening the inference runtime", () => {
    const result = spawnSync(process.execPath, ["scripts/evaluate-local-embeddings.mjs", "--unknown"], { cwd: checkout, encoding: "utf8", timeout: 10000 });
    expect(result.status).toBe(2);
    expect(JSON.parse(result.stderr).error.code).toBe("INVALID_ARGUMENT");
  });

  it("refuses overwriting existing evidence through the real CLI", () => {
    const before = readFileSync(join(checkout, contractPath));
    const result = spawnSync(process.execPath, ["scripts/evaluate-local-embeddings.mjs", "--contract", contractPath, "--output", contractPath],
      { cwd: checkout, encoding: "utf8", timeout: 10000 });
    expect(result.status).toBe(2);
    expect(JSON.parse(result.stderr).error.code).toBe("OUTPUT_EXISTS");
    expect(readFileSync(join(checkout, contractPath))).toEqual(before);
  });

  it("loads the frozen corpus without inference and refuses a modified held-out fixture", () => {
    const root = disposableFixture();
    expect(loadEvaluation(root, contractPath).fixture.queries).toHaveLength(100);
    writeFileSync(join(root, "tests/fixtures/embedding-eval/held-out.json"), "{}\n");
    expect(() => loadEvaluation(root, contractPath)).toThrow("Fixture bytes changed");
  });

  it("refuses changed admission gates before any inference", () => {
    const root = disposableFixture();
    const path = join(root, contractPath);
    const contract = JSON.parse(readFileSync(path, "utf8"));
    contract.gate.minimumRecallAt5GainPercentagePoints = 0;
    writeFileSync(path, JSON.stringify(contract));
    expect(() => loadEvaluation(root, contractPath)).toThrow("Frozen contract bytes changed");
  });

  it("reconstructs frozen source content from Git after later product work changes the checkout", () => {
    const result = loadEvaluation(checkout, contractPath);
    expect(result.sourceSnapshots).toEqual(expect.arrayContaining([expect.objectContaining({
      source: "core/generations/StudioSessionStore.ts", materializedFrom: "git-baseline",
    })]));
    expect(result.fixture.queries).toHaveLength(100);
  });

  it("refuses changed production source when its pinned baseline is unavailable", () => {
    const root = disposableFixture();
    writeFileSync(join(root, "src/storage/MemorySubsystem.ts"), "// changed\n");
    expect(() => loadEvaluation(root, contractPath)).toThrow("Source changed");
  });

  it("accepts a Git LF checkout of the same pinned Windows source content", () => {
    const root = disposableFixture();
    const path = join(root, "src/storage/MemorySubsystem.ts");
    writeFileSync(path, readFileSync(path, "utf8").replaceAll("\r\n", "\n"));
    expect(loadEvaluation(root, contractPath).fixture.queries).toHaveLength(100);
  });

  it("refuses paths outside the owned checkout", () => {
    expect(() => ownedPath(checkout, "../memory.db")).toThrow("inside the checkout");
  });

  it.each([null, [], Array(128).fill(1), Array(768).fill(0), [NaN, ...Array(767).fill(1)], [Infinity, ...Array(767).fill(1)]])(
    "refuses missing, mixed, zero or nonfinite vectors", (vector) => {
      expect(() => validateVector(vector)).toThrow();
    },
  );

  it("accepts genuine finite nonzero native dimensions without padding", () => {
    const vector = [1, ...Array(767).fill(0)];
    expect(validateVector(vector)).toBe(1);
  });

  it("uses nearest rank p95 and rejects incomplete or invalid latency samples", () => {
    expect(p95(Array.from({ length: 20 }, (_, index) => index + 1))).toBe(19);
    expect(() => p95([])).toThrow();
    expect(() => p95([1, NaN])).toThrow();
    expect(() => p95([-1])).toThrow();
  });

  it("returns exact paired bounds for an all-query improvement", () => {
    expect(pairedInterval(Array(60).fill(1), 21320261014)).toEqual({ lower: 100, upper: 100 });
    expect(pairedInterval(Array(60).fill(-1), 21320261014)).toEqual({ lower: -100, upper: -100 });
  });

  it("reports improved retrieval and fails a no-answer regression separately", () => {
    const { contract, fixture } = loadEvaluation(disposableFixture(), contractPath);
    const make = (correct: boolean, acceptsEmpty: boolean) => ({
      warmMilliseconds: Array(30).fill(100),
      queries: fixture.queries.map((query: { id: string; relevant: string[] }) => ({
        id: query.id, top5: correct ? query.relevant : [], accepted: query.relevant.length > 0 || acceptsEmpty,
      })),
    });
    const measured = compareArms(make(false, false), make(true, true), fixture, contract);
    expect(measured.gainPercentagePoints).toBe(100);
    expect(measured.quality).toBe("PASS");
    expect(measured.latency).toBe("PASS");
    expect(measured.rejection).toBe("FAIL");
    expect(measured.noAnswerAccepted).toEqual({ baseline: 0, candidate: 20 });
    expect(measured.sourceGroup95).toEqual({ lower: 100, upper: 100 });
  });

  it("refuses missing paired observations rather than scoring them as misses", () => {
    const { contract, fixture } = loadEvaluation(disposableFixture(), contractPath);
    const arm = { queries: [], warmMilliseconds: [100] };
    expect(() => compareArms(arm, arm, fixture, contract)).toThrow("Missing paired query");
  });
});
