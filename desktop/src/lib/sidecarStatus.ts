/**
 * v2.2.0 Phase 2 (2.2) -- shared sidecar health state for the UI.
 *
 * Before this, every surface conflated three very different situations into
 * one message. Image Studio and Video Lab caught ANY `models.list` failure and
 * rendered "No image models installed", and Settings > Skills rendered "the
 * catalog is not yet synced" whenever its IPC call failed. A user whose
 * backend could not start was told their models were missing and their catalog
 * unsynced -- both false, and both un-actionable.
 *
 * The three states are now distinct:
 *   - `sidecar-down`   the backend is not answering (with a Restart action)
 *   - `catalog-failed` the backend answered but the model catalog did not load
 *   - `empty`          the backend is healthy and the user genuinely has none
 *
 * Outside Tauri (dev server, Vitest) the IPC layer reports `ipc-unavailable`;
 * that is NOT a sidecar failure, so callers keep their existing dev fallbacks.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { invokeCommand } from "./ipc";

/** Mirrors the Rust `SidecarStatus` (camelCase serialized). */
export interface SidecarStatus {
  running: boolean;
  nodePath: string | null;
  nodeSource: string | null;
  scriptPath: string | null;
  failure: string | null;
  stderrTail: string[];
  /** First lines of the run: where a crash states its reason (v2.4.11). */
  stderrHead?: string[];
  /** Persisted sidecar log, so the user has something to send. */
  logPath?: string | null;
  candidatesRejected: string[];
  exitCode?: number | null;
}

/** The error string the IPC layer returns when not running under Tauri. */
export const IPC_UNAVAILABLE = "ipc-unavailable";
/** The error string the Rust shell returns when no sidecar handle exists. */
export const SIDECAR_NOT_RUNNING = "sidecar-not-running";

/**
 * True when the backend ANSWERED-OR-FAILED for a real reason, i.e. we are
 * running inside the app rather than in a dev/test environment with no Tauri
 * runtime. Used to decide whether a failed `list()` may be reported as "you
 * have no models" (it may not: a failure means unknown, not empty).
 */
export function isSidecarFailureMessage(message: string): boolean {
  return message.length > 0 && message !== IPC_UNAVAILABLE;
}

/**
 * Tokens the shell emits when the sidecar itself is unreachable. Deliberately
 * narrow: an arbitrary application error (a rejected list, a bad catalog) must
 * keep showing ITS OWN message, not be relabelled as a dead backend. The
 * authoritative signal is the `sidecar_status` command; this is the fast path
 * for the error we already have in hand.
 */
const BACKEND_DOWN_TOKENS = [
  SIDECAR_NOT_RUNNING,
  "sidecar binary not found",
  "sidecar spawn failed",
  "sidecar response timeout",
  "sidecar-exited",
  "sidecar-unprobeable",
  "stdin-closed",
];

/** True when this error message specifically indicates a dead backend. */
export function isBackendDownMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const text = message.toLowerCase();
  return BACKEND_DOWN_TOKENS.some((token) => text.includes(token));
}

/**
 * True when a failed call should be reported as "the backend could not start".
 *
 * v2.4.11 operator report: a Video Lab run showed "The Nexus backend could not
 * start -- Video models cannot be listed" while the backend was alive and
 * busy. `models.list` had simply timed out waiting behind a 30-minute
 * generation, and "sidecar response timeout" is one of the tokens that mean a
 * dead backend when it arrives on its own.
 *
 * The authoritative signal is the shell's own status: when it reports a
 * running child, a timed-out call means BUSY, not dead, and offering a Restart
 * button there would kill the very job the user is waiting for.
 */
export function reportsBackendDown(
  message: string | null | undefined,
  status: SidecarStatus | null,
): boolean {
  if (!isBackendDownMessage(message)) return false;
  // Unknown status (null) keeps the old fast path: something is wrong and the
  // message is the only evidence we have.
  return !status?.running;
}

/** True when a `models.list` catalogStatus indicates a catalog load failure. */
export function isCatalogFailure(catalogStatus: string | undefined): boolean {
  return typeof catalogStatus === "string" && catalogStatus.startsWith("catalog-load-failed");
}

export async function fetchSidecarStatus(): Promise<SidecarStatus | null> {
  const reply = await invokeCommand<SidecarStatus>("sidecar_status");
  return reply.ok ? reply.value : null;
}

export async function restartSidecar(): Promise<
  { ok: true; status: SidecarStatus } | { ok: false; message: string }
> {
  const reply = await invokeCommand<SidecarStatus>("sidecar_restart");
  return reply.ok ? { ok: true, status: reply.value } : { ok: false, message: reply.message };
}

/**
 * The line that says WHY the backend died, out of everything it printed.
 *
 * A Node crash leads with `FATAL ERROR: ...` or an uncaught `Error: ...`; the
 * frames that follow are noise without it. Picked from the head of the run,
 * falling back to the tail for a failure with no recognizable banner.
 */
export function crashCause(status: SidecarStatus | null): string | null {
  const lines = [...(status?.stderrHead ?? []), ...(status?.stderrTail ?? [])];
  const marked = lines.find((line) =>
    /FATAL ERROR|out of memory|Error:|Cannot find module|MODULE_NOT_FOUND/i.test(line),
  );
  return marked?.trim() || null;
}

/** Human-readable one-liner for a failed status, for the banner + diagnostics. */
export function describeSidecarFailure(status: SidecarStatus | null): string {
  if (!status) return "The Nexus backend is not reachable.";
  const parts: string[] = [];
  if (status.failure) parts.push(status.failure);
  /*
   * v2.4.11 operator report: a crash gave the user three V8 stack frames and
   * nothing to act on. Node prints its REASON first and its stack after, so
   * the cause line leads here and the tail follows it.
   */
  const cause = crashCause(status);
  if (cause) parts.push(`cause: ${cause}`);
  if (status.nodePath) parts.push(`node: ${status.nodePath}`);
  if (status.scriptPath) parts.push(`script: ${status.scriptPath}`);
  const tail = status.stderrTail.slice(-3);
  if (tail.length > 0) parts.push(`stderr: ${tail.join(" / ")}`);
  if (status.logPath) parts.push(`log: ${status.logPath}`);
  if (status.candidatesRejected.length > 0) {
    parts.push(`tried: ${status.candidatesRejected.join("; ")}`);
  }
  return parts.length > 0 ? parts.join(" | ") : "The Nexus backend is not reachable.";
}

export interface UseSidecarStatus {
  /** Latest status, or null when unknown / outside Tauri. */
  status: SidecarStatus | null;
  /** True only when we positively know the backend is down (debounced). */
  isDown: boolean;
  /** True while a restart is in flight. */
  restarting: boolean;
  /** Error from the last restart attempt, if any. */
  restartError: string | null;
  restart: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseSidecarStatusOptions {
  /** Poll cadence. 0 disables polling (single fetch on mount). */
  pollMs?: number;
  /**
   * Debounce before reporting a down state, so a restarting sidecar does not
   * flicker the banner on and off.
   */
  debounceMs?: number;
  /** Test seam. */
  fetchFn?: () => Promise<SidecarStatus | null>;
  restartFn?: () => Promise<{ ok: true; status: SidecarStatus } | { ok: false; message: string }>;
}

const DEFAULT_POLL_MS = 5000;
const DEFAULT_DEBOUNCE_MS = 500;

export function useSidecarStatus(options: UseSidecarStatusOptions = {}): UseSidecarStatus {
  const {
    pollMs = DEFAULT_POLL_MS,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    fetchFn = fetchSidecarStatus,
    restartFn = restartSidecar,
  } = options;

  const [status, setStatus] = useState<SidecarStatus | null>(null);
  const [isDown, setIsDown] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartError, setRestartError] = useState<string | null>(null);
  const downTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  // Hold the injected functions in refs so the polling effect never depends on
  // their identity. A caller passing an inline `fetchFn` (or simply
  // re-rendering) would otherwise tear down and restart the effect on every
  // render, clearing the pending down-debounce timer before it could fire --
  // i.e. the banner would never appear no matter how dead the backend was.
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;
  const restartRef = useRef(restartFn);
  restartRef.current = restartFn;

  const applyStatus = useCallback(
    (next: SidecarStatus | null) => {
      if (!mounted.current) return;
      setStatus(next);
      // Unknown (outside Tauri) is never "down" -- dev and tests must keep
      // their existing fallbacks rather than showing a backend error.
      const down = next !== null && !next.running;
      if (down) {
        if (downTimer.current === null) {
          downTimer.current = setTimeout(() => {
            downTimer.current = null;
            if (mounted.current) setIsDown(true);
          }, debounceMs);
        }
      } else {
        if (downTimer.current !== null) {
          clearTimeout(downTimer.current);
          downTimer.current = null;
        }
        setIsDown(false);
      }
    },
    [debounceMs],
  );

  const refresh = useCallback(async () => {
    applyStatus(await fetchRef.current());
  }, [applyStatus]);

  const restart = useCallback(async () => {
    if (!mounted.current) return;
    setRestarting(true);
    setRestartError(null);
    try {
      const result = await restartRef.current();
      if (!mounted.current) return;
      if (result.ok) {
        applyStatus(result.status);
      } else {
        setRestartError(result.message);
        await refresh();
      }
    } finally {
      if (mounted.current) setRestarting(false);
    }
  }, [applyStatus, refresh]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    if (pollMs <= 0) {
      return () => {
        mounted.current = false;
        if (downTimer.current !== null) clearTimeout(downTimer.current);
      };
    }
    const timer = setInterval(() => void refresh(), pollMs);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      if (downTimer.current !== null) clearTimeout(downTimer.current);
    };
  }, [pollMs, refresh]);

  return { status, isDown, restarting, restartError, restart, refresh };
}
