import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { catalogEntryVisibility } from "../../../../../core/registry/catalogVisibility.js";

const fixtureRoot = resolve(__dirname, "../../../../fixtures/model-probe/bolt-e4b");
const bytes = (name: string) => readFileSync(resolve(fixtureRoot, name));
const json = <T>(name: string): T => JSON.parse(bytes(name).toString("utf8")) as T;
const digest = (name: string) => `sha256:${createHash("sha256").update(bytes(name)).digest("hex")}`;
const outcome = json<{
  tag: string;
  manifestDigest: string;
  "E-3": string;
  requiredRuntime: string;
  observedRuntime: string;
  inferenceTranscriptCount: number;
  "E-4": string;
  "E-5": string;
}>("outcome.json");
const config = json<{ requires: string; parser: string }>("registry-config.json");
const version = json<{ version: string }>("ollama-version.json");

describe("Bolt E4B tool-call probe: runtime HOLD before inference", () => {
  it("binds the required runtime to the exact fetched registry manifest and config", () => {
    const manifest = json<{ config: { digest: string } }>("registry-manifest.json");
    expect(digest("registry-manifest.json")).toBe(outcome.manifestDigest);
    expect(digest("registry-config.json")).toBe(manifest.config.digest);
    expect(config.requires).toBe(outcome.requiredRuntime);
  });

  it("hides the candidate through the real catalog gate on the observed host", () => {
    const result = catalogEntryVisibility(
      { id: outcome.tag, minOllamaVersion: config.requires },
      { hostVramGb: 16, ollamaVersion: version.version, requireKnownOllama: true },
    );
    expect(version.version).toBe(outcome.observedRuntime);
    expect(result).toEqual({
      visible: false,
      reason: "hidden-ollama",
      note: `Update Ollama to ${config.requires} or newer to install this model.`,
    });
  });

  it("releases only the version gate at the required version, without claiming codec support", () => {
    expect(catalogEntryVisibility(
      { id: outcome.tag, minOllamaVersion: config.requires },
      { hostVramGb: 16, ollamaVersion: config.requires, requireKnownOllama: true },
    )).toMatchObject({ visible: true, reason: "visible" });
  });

  it("retains the actual pull refusal rather than presenting it as an inference transcript", () => {
    const observation = json<{ status: number; sha256: string; request: { model: string } }>("pull-observation.json");
    const response = json<{ error: string }>("pull-response.json");
    expect(observation.status).toBe(500);
    expect(digest("pull-response.json")).toBe(`sha256:${observation.sha256}`);
    expect(observation.request.model).toBe(outcome.tag);
    expect(response.error).toContain("412");
    expect(response.error).toContain("requires a newer version of Ollama");
    expect(response).not.toHaveProperty("message");
  });

  it("keeps codec evidence on HOLD and the dependent measurements not run", () => {
    expect(outcome["E-3"]).toBe("HOLD");
    expect(outcome.inferenceTranscriptCount).toBe(0);
    expect(outcome["E-4"]).toBe("not run");
    expect(outcome["E-5"]).toBe("not run");
  });
});
