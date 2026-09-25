/**
 * v2.4.8 follow-up (2026-09-07) -- "Do not show again" for the switch dialog.
 *
 * The dialog is the only thing standing between a click and a stopped job, so
 * it asks by default. A user who switches models constantly can turn it off
 * from the dialog itself and turn it back on in Settings > Preferences.
 * Stored per install in localStorage, like the other renderer-side UI
 * preferences (`nexus.ui.*`).
 *
 * v2.4.11 operator instruction: "after each new install, this should be turned
 * back to default (which is to ask again)". localStorage outlives an install,
 * so the stored value carries the build that wrote it; a value written by any
 * other build is ignored and cleared. Suppressing a dialog is a choice about
 * THIS build's behavior, not a permanent one.
 */

export const ASK_BEFORE_MODEL_SWITCH_KEY = "nexus.ui.askBeforeModelSwitch";

/** Build that wrote the value above. */
export const ASK_BEFORE_MODEL_SWITCH_BUILD_KEY =
  "nexus.ui.askBeforeModelSwitch.build";

/** This build's identity, injected by Vite; a stable fallback in tests. */
export function currentBuildId(): string {
  const injected = (globalThis as { __NEXUS_BUILD_ID__?: string })
    .__NEXUS_BUILD_ID__;
  return typeof injected === "string" && injected ? injected : "dev";
}

export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): PreferenceStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    // Private mode / blocked storage: fall back to the safe default.
    return null;
  }
}

/**
 * True unless the user turned the dialog off ON THIS BUILD.
 *
 * A value left behind by an earlier install is dropped as it is read, so the
 * next write starts from the default rather than from a stale suppression.
 */
export function askBeforeModelSwitch(
  storage: PreferenceStorage | null = defaultStorage(),
  buildId: string = currentBuildId(),
): boolean {
  try {
    if (storage?.getItem(ASK_BEFORE_MODEL_SWITCH_KEY) !== "false") return true;
    if (storage.getItem(ASK_BEFORE_MODEL_SWITCH_BUILD_KEY) === buildId) return false;
    // Written by another install: forget it and ask again.
    storage.setItem(ASK_BEFORE_MODEL_SWITCH_KEY, "true");
    storage.setItem(ASK_BEFORE_MODEL_SWITCH_BUILD_KEY, buildId);
    return true;
  } catch {
    return true;
  }
}

export function setAskBeforeModelSwitch(
  value: boolean,
  storage: PreferenceStorage | null = defaultStorage(),
  buildId: string = currentBuildId(),
): void {
  try {
    storage?.setItem(ASK_BEFORE_MODEL_SWITCH_KEY, value ? "true" : "false");
    storage?.setItem(ASK_BEFORE_MODEL_SWITCH_BUILD_KEY, buildId);
  } catch {
    // A preference that cannot be stored still applies to this session.
  }
}
