import { afterEach, describe, expect, it } from "vitest";
import { GenerationQueue } from "../../../../core/generations/GenerationQueue.js";
import { cancelSplatGenerate, enqueueSplatGenerate } from "../../../../core/generations/splatGenerateQueue.js";

describe("splat generate queue", () => {
  const queues: GenerationQueue[] = [];

  afterEach(() => {
    for (const queue of queues.splice(0)) queue.close();
  });

  function queue(): GenerationQueue {
    const next = new GenerationQueue({ dbPath: ":memory:" });
    queues.push(next);
    return next;
  }

  it("rejects a remote source before insert and isolates two children", () => {
    const jobs = queue();
    expect(() =>
      enqueueSplatGenerate(jobs, {
        id: "splat-1",
        parentId: "image-1",
        parameters: {
          sourceMessageId: "msg1",
          sourcePngPath: "https://3daistudio.com/a.png",
          outputId: "out-1",
        },
      }),
    ).toThrow(/remote-url/);
    expect(jobs.list()).toEqual([]);
    const first = enqueueSplatGenerate(jobs, {
      id: "splat-1",
      parentId: "image-1",
      parameters: { sourceMessageId: "msg1", sourcePngPath: "C:/shots/still.png", outputId: "out-1" },
    });
    const second = enqueueSplatGenerate(jobs, {
      id: "splat-2",
      parentId: "image-1",
      parameters: { sourceMessageId: "msg1", sourcePngPath: "C:/shots/still.png", outputId: "out-2" },
    });
    expect(first.parentId).toBe("image-1");
    expect(second.id).not.toBe(first.id);
    expect(second.parameters.outputId).not.toBe(first.parameters.outputId);
  });

  it("cancels a queued child before it runs and a running child as running", () => {
    const jobs = queue();
    enqueueSplatGenerate(jobs, {
      id: "splat-q",
      parentId: "image-1",
      parameters: { sourceMessageId: "msg1", sourcePngPath: "C:/shots/still.png", outputId: "out-q" },
    });
    const queued = cancelSplatGenerate(jobs, "splat-q");
    expect(queued.disposition).toBe("queued");
    expect(queued.job?.state).toBe("failed");
    expect(queued.job?.error).toBe("cancelled");

    enqueueSplatGenerate(jobs, {
      id: "splat-r",
      parentId: "image-1",
      parameters: { sourceMessageId: "msg1", sourcePngPath: "C:/shots/still.png", outputId: "out-r" },
    });
    jobs.markRunning("splat-r");
    const running = cancelSplatGenerate(jobs, "splat-r");
    expect(running.disposition).toBe("running");
    expect(running.job?.error).toBe("cancelled");
  });
});
