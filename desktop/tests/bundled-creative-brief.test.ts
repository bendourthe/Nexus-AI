import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { InProcessHookBus, type LifecycleEvent } from "../../core/lifecycle/HookBus";
import {
  buildHeadlessRunEnrichment,
  runEnrichedHeadlessSession,
} from "../sidecar/src/coding/headlessRunEnrichment";
import {
  BUNDLED_SKILL_NAMES,
  defaultBundledSkillsDir,
  readBundledCommandRows,
} from "../sidecar/src/skills/bundledSkills";
import { CommandsListResponse } from "../sidecar/src/protocol";
import { filterSlashCommandsWithHub } from "../src/modules/coding/slashCommands";

// v2.16.2 Phase 1 (T003, D1): the desktop sidecar resolves and lists the
// bundled creative-brief skill without an installed Nexus-Hub catalog, keeps
// Hub precedence, and refuses a missing or malformed bundled file.

const REPO = path.resolve(__dirname, "..", "..");
const SOURCE_SKILL = path.join(REPO, "modules", "coding", "skills", "catalog", "creative-brief", "SKILL.md");

let workspace: string;
let catalogDir: string;
let bundledDir: string;

beforeEach(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), "nexus-bundled-skill-"));
  catalogDir = path.join(workspace, "hub-catalog-absent");
  bundledDir = path.join(workspace, "dist", "skills");
  await fs.mkdir(path.join(bundledDir, "creative-brief"), { recursive: true });
  // The packaged layout: the build copies the reviewed source file verbatim.
  await fs.copyFile(SOURCE_SKILL, path.join(bundledDir, "creative-brief", "SKILL.md"));
});

afterEach(async () => {
  await fs.rm(workspace, { recursive: true, force: true });
});

function enrich(message: string, extra: { log?: (m: string) => void; bundled?: string } = {}) {
  return buildHeadlessRunEnrichment({
    workspacePath: workspace,
    message,
    catalogDir,
    bundledSkillsDir: extra.bundled ?? bundledDir,
    log: extra.log,
  });
}

describe("bundled creative-brief delivery", () => {
  it("resolves /creative-brief from the bundled copy when no Hub catalog is installed", async () => {
    const result = await enrich("/creative-brief briefs/spring.md three posters");
    expect(result.skillId).toBe("builtin/creative-brief");
    expect(result.skillBody).toContain("Missing file or changed hash: stop.");
    expect(result.skillBody).not.toMatch(/^---/);
  });

  it("passes the real prompt-injection scanner unchanged", async () => {
    const logs: string[] = [];
    const result = await enrich("/creative-brief", { log: (m) => logs.push(m) });
    expect(logs).toEqual([]);
    expect(result.skillBody?.length).toBeGreaterThan(0);
  });

  it("keeps an installed Hub command of the same name ahead of the bundled skill", async () => {
    await fs.mkdir(path.join(catalogDir, "commands"), { recursive: true });
    await fs.writeFile(
      path.join(catalogDir, "commands", "creative-brief.md"),
      "---\ndescription: user hub version\n---\nHub creative brief body.\n",
      "utf8",
    );
    const result = await enrich("/creative-brief");
    expect(result.skillId).toBe("nexus-hub/creative-brief");
    expect(result.skillBody).toBe("Hub creative brief body.");
  });

  it("lets a Hub command that differs only in case shadow the bundled skill", async () => {
    await fs.mkdir(path.join(catalogDir, "commands"), { recursive: true });
    await fs.writeFile(path.join(catalogDir, "commands", "Creative-Brief.md"), "---\ndescription: hub\n---\nHub body.\n", "utf8");
    const result = await enrich("/creative-brief");
    // Never the hidden built-in: on a case-insensitive disk the Hub file runs,
    // on a case-sensitive disk nothing runs, matching commands.list.
    expect(result.skillId).not.toBe("builtin/creative-brief");
    expect(await readBundledCommandRows(["Creative-Brief"], bundledDir)).toEqual([]);
  });

  it("reports a missing bundled file as unavailable instead of running anything", async () => {
    const logs: string[] = [];
    const result = await enrich("/creative-brief", {
      bundled: path.join(workspace, "empty"),
      log: (m) => logs.push(m),
    });
    expect(result.skillId).toBeUndefined();
    expect(logs.join("\n")).toMatch(/bundled skill \/creative-brief unavailable: .*unreadable \(ENOENT\)/);
  });

  it("refuses a bundled file whose declared name does not match", async () => {
    const file = path.join(bundledDir, "creative-brief", "SKILL.md");
    const text = await fs.readFile(file, "utf8");
    await fs.writeFile(file, text.replace("name: creative-brief", "name: other-skill"), "utf8");
    const logs: string[] = [];
    const result = await enrich("/creative-brief", { log: (m) => logs.push(m) });
    expect(result.skillId).toBeUndefined();
    expect(logs.join("\n")).toContain("malformed skill metadata");
  });

  it("does not treat an unbundled catalog skill name as bundled", async () => {
    const result = await enrich("/polish src/x.ts");
    expect(result.skillId).toBeUndefined();
  });

  it("emits the skill entry hook under the builtin namespace", async () => {
    const hookBus = new InProcessHookBus();
    const events: LifecycleEvent[] = [];
    hookBus.onAny((event) => events.push(event));
    await runEnrichedHeadlessSession({
      workspacePath: workspace,
      message: "/creative-brief",
      catalogDir,
      bundledSkillsDir: bundledDir,
      session: {
        run: async () => ({ finishReason: "stop", iterations: 1, toolCalls: 0, llmCalls: 1, finalText: "ok" }),
      } as never,
      sessionId: "s1",
      model: "m",
      hookBus,
    });
    expect(events.filter((e) => e.kind === "lifecycle.skill.entry")).toEqual([
      expect.objectContaining({ skillId: "builtin/creative-brief", namespace: "builtin" }),
    ]);
  });

  it("lists the bundled skill for discovery unless a Hub command shadows it", async () => {
    const rows = await readBundledCommandRows([], bundledDir);
    expect(rows).toEqual([
      expect.objectContaining({ name: "creative-brief", source: "builtin" }),
    ]);
    expect(rows[0]?.description.length).toBeGreaterThan(0);
    expect(CommandsListResponse.parse({ commands: rows, catalogPresent: false }).commands).toHaveLength(1);
    expect(await readBundledCommandRows(["Creative-Brief"], bundledDir)).toEqual([]);

    const offered = filterSlashCommandsWithHub("/creative", rows);
    expect(offered).toEqual([
      expect.objectContaining({ name: "creative-brief", namespace: "builtin" }),
    ]);
  });

  it("uses no bundled folder outside a packaged dist build", () => {
    // Under the test runner this module is loaded from source, not dist/.
    expect(defaultBundledSkillsDir()).toBeUndefined();
  });

  it("keeps the build copy list equal to the bundled skill names", async () => {
    const config = await fs.readFile(path.join(REPO, "desktop", "sidecar", "esbuild.config.mjs"), "utf8");
    const listed = /for \(const skill of (\[[^\]]*\])\)/.exec(config)?.[1];
    expect(listed && (JSON.parse(listed) as string[])).toEqual([...BUNDLED_SKILL_NAMES]);
  });
});
