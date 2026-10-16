/**
 * v2.13.0 Phase 5 -- durable edit state for one persisted Image Studio image.
 *
 * The shared reducer gives an immediate local result; commits go to the
 * sidecar one at a time against the last acknowledged revision. "Saved" means
 * the sidecar acknowledged every queued edit. A failure rolls the view back to
 * the acknowledged recipe and keeps the failed edit for Retry.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  deriveImageEditState,
  reduceImageEditRecipe,
  type ImageEditRecipe,
  type ImageEditState,
} from "../../../../core/image/ImageEditRecipe";
import {
  ImageEditRequestError,
  toImageEditError,
  type DurableImageEdit,
} from "./imageEditClient";

/** `off`: no durable source (Chat attachments); the viewer keeps in-memory editing. */
export type DurableEditStatus = "off" | "loading" | "saved" | "saving" | "error" | "conflict" | "unavailable";

export interface DurableEditView {
  readonly status: DurableEditStatus;
  /** Plain-language reason for error, conflict, or unavailable. */
  readonly message: string | null;
  /** The source PNG as a data URL, once loaded. */
  readonly src: string | null;
  readonly state: ImageEditState | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  apply(action: unknown): void;
  retry(): void;
  reload(): void;
  /** Resolves true once every queued edit is acknowledged, false on failure. */
  flush(): Promise<boolean>;
}

/** How often a clean, open viewer checks for edits made elsewhere. */
export const REVISION_POLL_MS = 2000;

function failure(error: unknown): ImageEditRequestError {
  if (error instanceof ImageEditRequestError) return error;
  // The shared reducer throws ImageEditError (same codes) for local refusals.
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : String(error);
  return typeof code === "string" ? toImageEditError(`${code}: ${message}`) : toImageEditError(message);
}

export function useDurableImageEdit(source: DurableImageEdit | undefined): DurableEditView {
  const [status, setStatus] = useState<DurableEditStatus>(source ? "loading" : "off");
  const [message, setMessage] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [projected, setProjected] = useState<ImageEditRecipe | null>(null);

  const grantRef = useRef<string | null>(null);
  const ackedRef = useRef<ImageEditRecipe | null>(null);
  const projectedRef = useRef<ImageEditRecipe | null>(null);
  const queueRef = useRef<unknown[]>([]);
  const failedRef = useRef<unknown | null>(null);
  const drainingRef = useRef<Promise<boolean> | null>(null);
  const aliveRef = useRef(true);

  const show = useCallback((recipe: ImageEditRecipe | null): void => {
    projectedRef.current = recipe;
    setProjected(recipe);
  }, []);

  const fail = useCallback((error: unknown): void => {
    const reason = failure(error);
    queueRef.current = [];
    show(ackedRef.current);
    setStatus(reason.code === "REVISION_CONFLICT" ? "conflict" : "error");
    setMessage(reason.code === "REVISION_CONFLICT"
      ? "This image was changed somewhere else. Reload to see the latest edits."
      : `Not saved: ${reason.message}`);
  }, [show]);

  const open = useCallback(async (): Promise<void> => {
    if (!source) return;
    setStatus("loading");
    setMessage(null);
    queueRef.current = [];
    failedRef.current = null;
    const previous = grantRef.current;
    try {
      const opened = await source.open();
      if (!aliveRef.current) {
        void source.close(opened.grantId).catch(() => undefined);
        return;
      }
      grantRef.current = opened.grantId;
      ackedRef.current = opened.recipe;
      show(opened.recipe);
      setSrc(`data:image/png;base64,${opened.png}`);
      setStatus("saved");
      if (previous && previous !== opened.grantId) void source.close(previous).catch(() => undefined);
    } catch (error) {
      if (!aliveRef.current) return;
      const reason = failure(error);
      setStatus("unavailable");
      setMessage(`Edits to this image are not saved: ${reason.message}`);
    }
  }, [show, source]);

  const drain = useCallback((): Promise<boolean> => {
    if (drainingRef.current) return drainingRef.current;
    const run = (async (): Promise<boolean> => {
      while (queueRef.current.length > 0) {
        const grant = grantRef.current;
        const acked = ackedRef.current;
        const action = queueRef.current[0];
        if (!source || !grant || !acked) return false;
        try {
          const next = await source.commit(grant, action, acked.revision);
          if (!aliveRef.current) return true;
          ackedRef.current = next;
          queueRef.current.shift();
        } catch (error) {
          if (!aliveRef.current) return false;
          failedRef.current = action;
          fail(error);
          return false;
        }
      }
      if (aliveRef.current) {
        // Re-project from the acknowledged recipe so the view equals storage.
        show(ackedRef.current);
        setStatus("saved");
        setMessage(null);
      }
      return true;
    })();
    drainingRef.current = run;
    void run.finally(() => {
      if (drainingRef.current === run) drainingRef.current = null;
    });
    return run;
  }, [fail, show, source]);

  const apply = useCallback((action: unknown): void => {
    const current = projectedRef.current;
    if (!current || status === "loading" || status === "unavailable" || status === "conflict") return;
    let next: ImageEditRecipe;
    try {
      next = reduceImageEditRecipe(current, action, current.revision);
    } catch (error) {
      const reason = failure(error);
      setMessage(reason.code === "NO_UNDO" || reason.code === "NO_REDO" ? null : `Not applied: ${reason.message}`);
      return;
    }
    failedRef.current = null;
    queueRef.current.push(action);
    show(next);
    setStatus("saving");
    setMessage(null);
    void drain();
  }, [drain, show, status]);

  const retry = useCallback((): void => {
    const action = failedRef.current;
    if (status !== "error" || action === null) return;
    setStatus("saved");
    failedRef.current = null;
    const current = ackedRef.current;
    if (!current) return;
    try {
      show(reduceImageEditRecipe(current, action, current.revision));
    } catch (error) {
      fail(error);
      return;
    }
    queueRef.current.push(action);
    setStatus("saving");
    void drain();
  }, [drain, fail, show, status]);

  const reload = useCallback((): void => {
    void open();
  }, [open]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (queueRef.current.length === 0 && !drainingRef.current) return status !== "error";
    return drain();
  }, [drain, status]);

  useEffect(() => {
    if (!source) return undefined;
    aliveRef.current = true;
    void open();
    return () => {
      aliveRef.current = false;
      const grant = grantRef.current;
      grantRef.current = null;
      if (grant) void source.close(grant).catch(() => undefined);
    };
  }, [open, source]);

  useEffect(() => {
    if (!source || status !== "saved") return undefined;
    const timer = window.setInterval(() => {
      const grant = grantRef.current;
      const acked = ackedRef.current;
      if (!grant || !acked || queueRef.current.length > 0) return;
      source.revision(grant).then((revision) => {
        if (aliveRef.current && revision !== ackedRef.current?.revision && queueRef.current.length === 0) {
          void open();
        }
      }, () => undefined);
    }, REVISION_POLL_MS);
    return () => window.clearInterval(timer);
  }, [open, source, status]);

  return {
    status,
    message,
    src,
    state: projected ? deriveImageEditState(projected) : null,
    canUndo: projected ? projected.cursor > 0 : false,
    canRedo: projected ? projected.cursor < projected.commands.length : false,
    apply,
    retry,
    reload,
    flush,
  };
}
