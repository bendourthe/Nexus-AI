/**
 * v2.11.0 Phase 4.2 -- composition-root helper for the outline tools in the
 * VS Code extension, modelled on `parseDocumentWiring.ts`.
 *
 * Flag off returns undefined, so the tools are absent from the registry. Flag
 * on returns lazy deps: the shared tool core, the OCR parser, and (only when
 * the summaries flag is also on) the summary provider are built on first use.
 */

import { realpathSync } from "node:fs";
import { relative } from "node:path";

import {
  isDocumentOutlineEnabled,
  isDocumentOutlineSummariesEnabled,
} from "../../core/documents/documentOutlineEnabled.js";
import {
  resolveEffectiveContextTokens,
  type DocumentOutlineTools,
  type OutlineToolHost,
} from "../../modules/coding/documents/DocumentOutlineTools.js";
import { createDocumentOutlineTools, outlineSummaryStore } from "../../modules/coding/documents/createDocumentOutlineTools.js";
import { createOutlineSummaryProvider } from "../../modules/coding/documents/OutlineSummaryProvider.js";
import type { LLMClient } from "../../modules/coding/llm/types.js";
import { matchesSecretPath } from "../../modules/coding/utils/secretPaths.js";
import type { ConfirmationGate } from "./ConfirmationGate.js";
import type { DocumentOutlineDeps } from "./handlers/documentOutline.js";
import type { DocumentParser } from "./handlers/parseDocument.js";
import { resolveInsideWorkspace, workspaceRoot } from "./handlers/pathGuard.js";
import { createExtensionDocumentParser } from "./parseDocumentWiring.js";

export interface BuildDocumentOutlineDepsOptions {
  readonly documentOutlineEnabled: boolean;
  readonly documentOutlineSummariesEnabled: boolean;
  readonly gate?: ConfirmationGate | null;
  readonly extraSecretPatterns?: readonly string[];
  /** Configured runtime window (settings.maxTokens / num_ctx), when known. */
  readonly configuredContextTokens?: () => number | null | undefined;
  /** Model client and endpoint for summaries; required only when summaries are on. */
  readonly llm?: { readonly client: LLMClient; readonly model: () => string; readonly endpoint: string };
  /** Tests inject a parser; production uses the shared OCR runtime adapter. */
  readonly createParser?: () => DocumentParser;
  /** Tests pass null to disable the file cache. */
  readonly cacheDir?: string | null;
  readonly env?: NodeJS.ProcessEnv;
}

/** The workspace root as the resolver sees it (real path), or the root itself when it cannot be resolved. */
function realRoot(root: string): string {
  try {
    return realpathSync(root);
  } catch {
    return root;
  }
}

export function buildDocumentOutlineDeps(opts: BuildDocumentOutlineDepsOptions): DocumentOutlineDeps | undefined {
  const env = opts.env ?? process.env;
  const enabled = isDocumentOutlineEnabled({ env, settingsValue: opts.documentOutlineEnabled });
  if (!enabled) return undefined;
  const summariesEnabled = isDocumentOutlineSummariesEnabled({
    env,
    settingsValue: opts.documentOutlineSummariesEnabled,
    outlineEnabled: enabled,
  });

  let parser: DocumentParser | null = null;
  let tools: DocumentOutlineTools | null = null;
  const extra = opts.extraSecretPatterns ?? [];

  const host: OutlineToolHost = {
    resolvePath: (userPath) => resolveInsideWorkspace(userPath, workspaceRoot()),
    async checkSecret(userPath, allowSecrets, resolvedPath) {
      // The resolved path catches "./.env.md", "x/../secrets/a.txt", and symlinks to secret files.
      // Against the root's real path: a junction or symlinked workspace folder would otherwise give "..\..".
      const resolvedRelative = relative(realRoot(workspaceRoot()), resolvedPath);
      if (!matchesSecretPath(userPath, extra) && !matchesSecretPath(resolvedRelative, extra)) return null;
      if (!allowSecrets) {
        return `Path "${userPath.slice(0, 200)}" matches the secret-path denylist. Pass allow_secrets=true to request explicit user confirmation, or use a non-secret path.`;
      }
      if (opts.gate) {
        const approved = await opts.gate.request(
          `outline-secret-${Date.now()}`,
          `Outline secret-path file "${userPath.slice(0, 200)}"?`,
          "The path matches the secret-path denylist (env/keys/credentials). Only approve if you trust this file.",
        );
        if (!approved) return "Outline of a secret-path file rejected by user.";
      }
      return null;
    },
    async parseDocument(bytes, maxPages) {
      parser ??= (opts.createParser ?? createExtensionDocumentParser)();
      return parser.parse(bytes.toString("base64"), { maxPages });
    },
    contextTokens: () => resolveEffectiveContextTokens({ configuredTokens: opts.configuredContextTokens?.() ?? null }),
    summaries:
      summariesEnabled && opts.llm
        ? {
            summarize: async (outline, text) => {
              const llm = opts.llm;
              if (!llm) return { summaries: new Map(), status: "off" };
              const provider = createOutlineSummaryProvider({
                client: llm.client,
                model: llm.model(),
                endpoint: llm.endpoint,
                store: outlineSummaryStore(opts.cacheDir === undefined ? undefined : opts.cacheDir),
              });
              return provider.summarize(outline, text);
            },
          }
        : null,
  };

  return {
    getTools: () => {
      tools ??= createDocumentOutlineTools({
        host,
        ...(opts.cacheDir !== undefined ? { cacheDir: opts.cacheDir } : {}),
      });
      return tools;
    },
  };
}
