/**
 * v2.11.0 Phase 4 -- one composition of the outline tools for both channels.
 *
 * The extension wiring and the sidecar both call this, so the cache directory,
 * the cache policy, the snapshot, and the title screen are identical in each.
 */

import { OutlineCache, TextSnapshotCache } from "../../../core/documents/OutlineCache.js";
import { OutlineSession } from "../../../core/documents/OutlineSession.js";
import { OutlineFileStore, outlineCacheDir } from "../../../core/storage/OutlineFileStore.js";
import {
  DocumentOutlineTools,
  createExtractor,
  expectedEngineFor,
  screenTitle,
  type OutlineToolHost,
} from "./DocumentOutlineTools.js";

export interface CreateDocumentOutlineToolsOptions {
  readonly host: OutlineToolHost;
  /** Cache directory; `null` disables the file cache (tests, or an unwritable home). */
  readonly cacheDir?: string | null;
  readonly warn?: (message: string) => void;
}

export function createDocumentOutlineTools(options: CreateDocumentOutlineToolsOptions): DocumentOutlineTools {
  const cacheDir = options.cacheDir === undefined ? outlineCacheDir() : options.cacheDir;
  const cache =
    cacheDir === null
      ? null
      : new OutlineCache({
          store: new OutlineFileStore(cacheDir),
          screenText: screenTitle,
          ...(options.warn ? { warn: options.warn } : {}),
        });
  const session = new OutlineSession({
    extract: createExtractor(options.host),
    expectedEngine: expectedEngineFor,
    cache,
    snapshots: new TextSnapshotCache(),
    screenTitle,
  });
  return new DocumentOutlineTools(options.host, session);
}

/** The summaries namespace under the same cache root. */
export function outlineSummaryStore(cacheDir: string | null = outlineCacheDir()): OutlineFileStore | null {
  return cacheDir === null ? null : new OutlineFileStore(`${cacheDir}/summaries`);
}
