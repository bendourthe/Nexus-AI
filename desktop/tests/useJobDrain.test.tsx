/**
 * v2.4.11 -- the drain loop's one guarantee.
 *
 * Operator report: an image job sat on its last sampling step for 51 minutes
 * and never produced a picture. `drainEvents` empties the sidecar queue, so a
 * batch dropped by the poll loop is gone for good; the old loop dropped one
 * whenever it was torn down between the call and its answer.
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useJobDrain } from "../src/shared/studio/useJobDrain";

afterEach(cleanup);

type Job = { readonly jobId: string };

function Harness({
  job,
  drain,
  apply,
  onSettled,
  onError = () => {},
  // Changing this re-renders with brand-new callback identities, which is what
  // used to restart the interval and strand an in-flight batch.
  churn,
}: {
  job: Job | null;
  drain: (job: Job) => Promise<readonly string[]>;
  apply: (events: readonly string[], job: Job) => { done?: boolean };
  onSettled: (next: Job | null) => void;
  onError?: (error: unknown, job: Job) => void;
  churn?: number;
}): JSX.Element {
  useJobDrain<Job, string>({
    job,
    intervalMs: 20,
    drain: (j) => drain(j),
    apply: (events, j) => apply(events, j),
    onError: (error, j) => onError(error, j),
    onSettled: (next) => onSettled(next),
  });
  return <span data-churn={churn} />;
}

describe("useJobDrain", () => {
  // Plain fake timers: `shouldAdvanceTime` lets real time fire the interval
  // too, which makes a drain COUNT unreliable when the suite is loaded.
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("applies a batch that arrives after the loop was torn down", async () => {
    const applied: string[][] = [];
    let release: (() => void) | null = null;
    const drain = vi.fn(async (): Promise<readonly string[]> => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return ["complete"];
    });
    const { rerender, unmount } = render(
      <Harness
        job={{ jobId: "j1" }}
        drain={drain}
        apply={(events) => {
          applied.push([...events]);
          return { done: true };
        }}
        onSettled={() => {}}
        churn={0}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });
    expect(drain).toHaveBeenCalledTimes(1);

    // Re-render with new callback identities, then unmount: both used to be
    // teardowns that discarded whatever the drain was about to return.
    rerender(
      <Harness
        job={{ jobId: "j1" }}
        drain={drain}
        apply={(events) => {
          applied.push([...events]);
          return { done: true };
        }}
        onSettled={() => {}}
        churn={1}
      />,
    );
    unmount();
    await act(async () => {
      release?.();
      await Promise.resolve();
      await Promise.resolve();
    });

    // The batch the sidecar already gave up was still applied.
    expect(applied).toEqual([["complete"]]);
  });

  it("does not restart polling when only the callbacks change", async () => {
    const drain = vi.fn(async (): Promise<readonly string[]> => []);
    const props = {
      job: { jobId: "j1" } as Job,
      drain,
      apply: () => ({}),
      onSettled: () => {},
    };
    const { rerender } = render(<Harness {...props} churn={0} />);
    await act(async () => {
      vi.advanceTimersByTime(20);
    });
    for (let i = 1; i <= 5; i += 1) {
      rerender(<Harness {...props} churn={i} />);
    }
    await act(async () => {
      vi.advanceTimersByTime(20);
    });
    // Two ticks, two drains -- not one per re-render.
    expect(drain).toHaveBeenCalledTimes(2);
  });

  it("stops after a completion and hands the next job back", async () => {
    const settled: (Job | null)[] = [];
    const drain = vi.fn(async (): Promise<readonly string[]> => ["done"]);
    render(
      <Harness
        job={{ jobId: "j1" }}
        drain={drain}
        apply={() => ({ done: true })}
        onSettled={(next) => settled.push(next)}
      />,
    );
    await act(async () => {
      vi.advanceTimersByTime(20);
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(settled).toEqual([null]);
    expect(drain).toHaveBeenCalledTimes(1);
  });

  it("reports an error once and settles the job", async () => {
    const errors: unknown[] = [];
    render(
      <Harness
        job={{ jobId: "j1" }}
        drain={async () => {
          throw new Error("sidecar gone");
        }}
        apply={() => ({})}
        onError={(error) => errors.push(error)}
        onSettled={() => {}}
      />,
    );
    await act(async () => {
      vi.advanceTimersByTime(60);
      await Promise.resolve();
    });
    expect(errors).toHaveLength(1);
  });
});
