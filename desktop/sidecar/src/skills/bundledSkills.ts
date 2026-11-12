import { promises as fs } from "node:fs";
import * as path from "node:path";

// v2.16.2 Phase 1 (T003, owner decision D1): built-in skills the desktop
// sidecar ships beside its bundle, so a packaged app can run them without an
// installed Nexus-Hub catalog. The VS Code extension already loads the same
// files from modules/coding/skills/catalog through SkillLoader. The build copies
// exactly these names (desktop/sidecar/esbuild.config.mjs); a Hub command of the
// same name keeps precedence over a bundled skill.

/** Bundled skill names, in the order the build copies them. */
export const BUNDLED_SKILL_NAMES: readonly string[] = ["creative-brief"];

/** Relative folder, under the sidecar `dist/`, that holds the bundled skills. */
export const BUNDLED_SKILLS_SUBDIR = "skills";

/**
 * `<sidecar dist>/skills` in the packaged CommonJS bundle. Undefined when the
 * module is not running from a bundle, so callers report the skill as
 * unavailable instead of guessing a source-tree path.
 */
export function defaultBundledSkillsDir(): string | undefined {
  return typeof __dirname === "string" && path.basename(__dirname) === "dist"
    ? path.join(__dirname, BUNDLED_SKILLS_SUBDIR)
    : undefined;
}

export interface BundledSkill {
  readonly name: string;
  readonly description: string;
  readonly body: string;
  readonly path: string;
}

export type BundledSkillResult =
  | { readonly kind: "found"; readonly skill: BundledSkill }
  | { readonly kind: "not-bundled" }
  | { readonly kind: "unavailable"; readonly reason: string };

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function frontmatterValue(meta: string, key: string): string {
  for (const line of meta.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0 && line.slice(0, idx).trim() === key) {
      return line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return "";
}

/**
 * Read one bundled skill. Uses the same required fields as SkillLoader (`name`
 * and `description`) and additionally requires the declared name to match the
 * folder, so a renamed or swapped file is refused rather than run.
 */
export async function readBundledSkill(
  name: string,
  dir: string | undefined = defaultBundledSkillsDir(),
): Promise<BundledSkillResult> {
  if (!BUNDLED_SKILL_NAMES.includes(name)) return { kind: "not-bundled" };
  if (!dir) return { kind: "unavailable", reason: "no bundled skills folder in this build" };
  const skillPath = path.join(dir, name, "SKILL.md");
  let content: string;
  try {
    content = await fs.readFile(skillPath, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? "read error";
    return { kind: "unavailable", reason: `${skillPath} unreadable (${code})` };
  }
  const match = FRONTMATTER.exec(content);
  const meta = match?.[1] ?? "";
  const body = (match?.[2] ?? "").trim();
  const declared = frontmatterValue(meta, "name");
  const description = frontmatterValue(meta, "description");
  if (!match || declared !== name || !description || !body) {
    return { kind: "unavailable", reason: `${skillPath} has malformed skill metadata` };
  }
  return { kind: "found", skill: { name, description, body, path: skillPath } };
}

/** Discovery rows for bundled skills that no Hub command shadows. */
export async function readBundledCommandRows(
  shadowedNames: readonly string[],
  dir: string | undefined = defaultBundledSkillsDir(),
): Promise<{ name: string; description: string; source: "builtin" }[]> {
  const shadowed = new Set(shadowedNames.map((n) => n.toLowerCase()));
  const rows: { name: string; description: string; source: "builtin" }[] = [];
  for (const name of BUNDLED_SKILL_NAMES) {
    if (shadowed.has(name.toLowerCase())) continue;
    const result = await readBundledSkill(name, dir);
    if (result.kind === "found") {
      rows.push({ name, description: result.skill.description, source: "builtin" });
    }
  }
  return rows;
}
