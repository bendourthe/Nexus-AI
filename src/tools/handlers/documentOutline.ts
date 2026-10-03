/**
 * v2.11.0 Phase 4.2 -- VS Code extension adapters for `document_outline` and
 * `document_read_section`.
 *
 * Thin by design: every guard lives in the shared, vscode-free module
 * (`modules/coding/documents/DocumentOutlineTools.ts`) that the desktop
 * sidecar also uses, so both channels behave identically. The adapter only maps
 * the shared result onto this host's `ToolResult`. The ConfirmationGate tier
 * (`confirm`) is applied by the registry; the adapter raises no prompt of its
 * own beyond the secret-path confirmation the host supplies.
 */

import type { DocumentOutlineTools, OutlineToolResult } from "../../../modules/coding/documents/DocumentOutlineTools.js";
import type { ToolHandler, ToolResult } from "../types.js";

export interface DocumentOutlineDeps {
  /** Lazily builds (once) the shared tool core for this session. */
  readonly getTools: () => DocumentOutlineTools;
}

function toToolResult(id: string, result: OutlineToolResult): ToolResult {
  return result.success
    ? { id, success: true, output: result.output }
    : { id, success: false, output: "", error: result.error ?? "document outline failed" };
}

export class DocumentOutlineTool implements ToolHandler {
  constructor(private readonly _deps: DocumentOutlineDeps) {}

  async execute(parameters: Record<string, unknown>): Promise<ToolResult> {
    const id = (parameters["_callId"] as string | undefined) ?? "";
    return toToolResult(id, await this._deps.getTools().outline(parameters));
  }
}

export class DocumentReadSectionTool implements ToolHandler {
  constructor(private readonly _deps: DocumentOutlineDeps) {}

  async execute(parameters: Record<string, unknown>): Promise<ToolResult> {
    const id = (parameters["_callId"] as string | undefined) ?? "";
    return toToolResult(id, await this._deps.getTools().readSection(parameters));
  }
}
