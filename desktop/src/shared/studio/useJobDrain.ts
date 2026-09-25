/**
 * v2.4.11 -- the studio poll loop, with one guarantee: a drained batch is
 * never thrown away.
 *
 * Operator report: an image job sat on its last sampling step for 51 minutes
 * and never produced a picture. `drainEvents` REMOVES the events it returns
 * from the sidecar queue, so the batch in hand is the only copy there will
 * ever be. Both studios polled with an effect that re-checked a `cancelled`
 * flag AFTER the await and returned early -- so any teardown between the call
 * and its answer discarded that copy. A teardown needs nothing dramatic: the
 * effect listed callbacks in its dependencies, and those change identity
 * whenever an unrelated piece of page state does (the backend-health flag, for
 * instance). A batch carrying `complete` was then gone for good, and the
 * bubble waited for an event that no longer existed.
 *
 * Two rules follow, and they are the whole point of this hook:
 *
 *   1. Whatever `drain` returns is passed to `apply`, always. Stopping only
 *      cancels the NEXT poll.
 *   2. `apply` / `onError` are held in refs, so re-renders cannot restart the
 *      interval at all. Only the job, the client, and the interval do.
 */

import { useEffect, useRef } from "react";

/** What one batch told us about the job it belongs to. */
export interface DrainOutcome<TJob> {
  /** The job finished: stop polling. */
  readonly done?: boolean;
  /** Continue with a different job (a chained video segment). */
  readonly nextJob?: TJob | null;
}

export interface JobDrainOptions<TJob, TEvent> {
  /** The job to poll, or null when nothing is running. */
  readonly job: TJob | null;
  readonly intervalMs: number;
  /** Takes the queued events, emptying the queue. */
  drain(job: TJob): Promise<readonly TEvent[]>;
  /** Applies one batch. Runs even when the loop has been stopped. */
  apply(events: readonly TEvent[], job: TJob): DrainOutcome<TJob> | Promise<DrainOutcome<TJob>>;
  /** The drain or the apply threw: the job is over either way. */
  onError(error: unknown, job: TJob): void;
  /** Called with the next job (or null) when polling should move or stop. */
  onSettled(next: TJob | null): void;
}

export function useJobDrain<TJob, TEvent>(options: JobDrainOptions<TJob, TEvent>): void {
  const { job, intervalMs } = options;
  const handlers = useRef(options);
  handlers.current = options;

  useEffect(() => {
    if (job === null) return;
    let stopped = false;
    // One poll at a time: a slow drain used to let the next tick start a
    // second one, so a failing sidecar reported the same error three times
    // over and a busy one queued up overlapping reads.
    let inFlight = false;
    const timer = setInterval(() => {
      void (async () => {
        if (stopped || inFlight) return;
        inFlight = true;
        try {
          const events = await handlers.current.drain(job);
          // Rule 1: the queue has already given these up. Apply them even if
          // the loop was stopped while they were in flight.
          const outcome = await handlers.current.apply(events, job);
          if (outcome.nextJob) {
            stopped = true;
            clearInterval(timer);
            handlers.current.onSettled(outcome.nextJob);
            return;
          }
          if (outcome.done) {
            stopped = true;
            clearInterval(timer);
            handlers.current.onSettled(null);
          }
        } catch (error) {
          stopped = true;
          clearInterval(timer);
          handlers.current.onError(error, job);
          handlers.current.onSettled(null);
        } finally {
          inFlight = false;
        }
      })();
    }, intervalMs);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [job, intervalMs]);
}
