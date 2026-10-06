/**
 * v2.11.0 Phase 3.3 -- file-backed store for the outline cache.
 *
 * One directory under the Nexus storage root, shared by the VS Code extension
 * and the desktop sidecar. Only `<64 hex>.json` names are accepted, so no
 * source filename or node id ever reaches a path. Writes go to a unique temp
 * file and are renamed into place, so two writers never interleave; files are
 * created owner-only where the platform honours the mode. Any error is
 * surfaced to the caller, which degrades to no cache.
 */

import { randomBytes } from "node:crypto";
import { promises as fsp } from "node:fs";
import { join } from "node:path";

import type { OutlineStore, OutlineStoreEntry } from "../documents/OutlineCache.js";
import { nexusHome } from "./paths.js";

export const OUTLINE_CACHE_DIRNAME = "outline-cache";
const NAME = /^[0-9a-f]{64}\.json$/;

export function outlineCacheDir(root: string = nexusHome(), namespace?: string): string {
  return namespace ? join(root, OUTLINE_CACHE_DIRNAME, namespace) : join(root, OUTLINE_CACHE_DIRNAME);
}

function assertName(name: string): void {
  if (!NAME.test(name)) throw new Error(`refusing outline cache name: ${JSON.stringify(name).slice(0, 80)}`);
}

/**
 * Windows refuses a rename onto a file another process is renaming or reading
 * (EPERM / EBUSY / EACCES). Two hosts can write the same entry, so retry once
 * after a short pause; a second failure is surfaced and the cache is skipped.
 */
async function renameWithRetry(from: string, to: string): Promise<void> {
  try {
    await fsp.rename(from, to);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "EPERM" && code !== "EBUSY" && code !== "EACCES") throw err;
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
    await fsp.rename(from, to);
  }
}

export class OutlineFileStore implements OutlineStore {
  constructor(private readonly dir: string) {}

  async read(name: string): Promise<string | null> {
    assertName(name);
    try {
      return await fsp.readFile(join(this.dir, name), "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async write(name: string, data: string): Promise<void> {
    assertName(name);
    await fsp.mkdir(this.dir, { recursive: true, mode: 0o700 });
    const temp = join(this.dir, `.${name}.${randomBytes(6).toString("hex")}.tmp`);
    await fsp.writeFile(temp, data, { encoding: "utf8", mode: 0o600 });
    try {
      await renameWithRetry(temp, join(this.dir, name));
    } catch (err) {
      await fsp.rm(temp, { force: true });
      throw err;
    }
  }

  async list(): Promise<readonly OutlineStoreEntry[]> {
    let names: string[];
    try {
      names = await fsp.readdir(this.dir);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
    const out: OutlineStoreEntry[] = [];
    for (const name of names) {
      if (!NAME.test(name)) continue;
      try {
        const stat = await fsp.stat(join(this.dir, name));
        out.push({ name, size: stat.size, mtimeMs: stat.mtimeMs });
      } catch {
        /* removed concurrently */
      }
    }
    return out;
  }

  async remove(name: string): Promise<void> {
    assertName(name);
    await fsp.rm(join(this.dir, name), { force: true });
  }
}
