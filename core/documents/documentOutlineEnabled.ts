/**
 * v2.11.0 Phase 4.2 -- one flag for the outline tools, honoured identically by
 * the VS Code extension and the desktop sidecar. Modelled on
 * `parseDocumentEnabled.ts`: an environment override wins, then the stored
 * setting, and the default is off. Summaries have effect only when the outline
 * flag itself is on.
 */

export const DOCUMENT_OUTLINE_SETTING_KEY = "nexus.coding.documentOutline.enabled";
export const DOCUMENT_OUTLINE_SUMMARIES_SETTING_KEY = "nexus.coding.documentOutline.summaries.enabled";
export const DOCUMENT_OUTLINE_ENV = "NEXUS_DOCUMENT_OUTLINE";
export const DOCUMENT_OUTLINE_SUMMARIES_ENV = "NEXUS_DOCUMENT_OUTLINE_SUMMARIES";

function parseFlag(raw: string | undefined): boolean | undefined {
  if (raw === undefined) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  return undefined;
}

export interface FlagSources {
  readonly env?: NodeJS.ProcessEnv;
  /** Stored setting; anything but a real boolean `true` counts as off. */
  readonly settingsValue?: unknown;
}

export function isDocumentOutlineEnabled(opts: FlagSources = {}): boolean {
  const fromEnv = parseFlag((opts.env ?? process.env)[DOCUMENT_OUTLINE_ENV]);
  if (fromEnv !== undefined) return fromEnv;
  return opts.settingsValue === true;
}

export function isDocumentOutlineSummariesEnabled(opts: FlagSources & { readonly outlineEnabled: boolean }): boolean {
  if (!opts.outlineEnabled) return false;
  const fromEnv = parseFlag((opts.env ?? process.env)[DOCUMENT_OUTLINE_SUMMARIES_ENV]);
  if (fromEnv !== undefined) return fromEnv;
  return opts.settingsValue === true;
}
