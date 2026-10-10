import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearInvokeOverride, setInvokeOverride } from "../src/lib/ipc";
import { createIpcDocumentClient, DOCUMENT_POLL_MS } from "../src/modules/chat/documentClient";
import type { ListedModelDto } from "../src/pages/settings/modelsTypes";
import type { OcrParseResultT } from "../sidecar/src/protocol";

const result: OcrParseResultT = {
  engine: "rapidocr", text: "Read locally", markdown: null, pageCount: 1,
  pages: [{ index: 0, text: "Read locally" }],
};
let replies: unknown[];
const invoke = vi.fn(async (_command: string, _args?: Record<string, unknown>): Promise<unknown> => undefined);

beforeEach(() => {
  vi.useFakeTimers();
  replies = [];
  invoke.mockReset();
  invoke.mockImplementation(async () => {
    if (!replies.length) throw new Error("unexpected IPC request");
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    return reply;
  });
  setInvokeOverride(invoke);
});
afterEach(() => {
  clearInvokeOverride();
  vi.useRealTimers();
});

describe("document client IPC", () => {
  it("offers only installed usable document models", async () => {
    const models: ListedModelDto[] = [
      { id: "ocr", displayName: "OCR", type: "document", installed: true, source: "registry" },
      { id: "external", displayName: "External", type: "document", installed: true, source: "external" },
      { id: "missing", displayName: "Missing", type: "document", installed: false, source: "registry" },
      { id: "catalog", displayName: "Catalog", type: "document", installed: true, source: "catalog-only" },
      { id: "chat", displayName: "Chat", type: "llm", installed: true, source: "registry" },
    ];
    replies.push({ models });
    expect(await createIpcDocumentClient().installedDocumentModels()).toEqual(models.slice(0, 2));
    expect(invoke).toHaveBeenCalledExactlyOnceWith("ipc_call", { method: "models.list", params: {} });
  });

  it("returns no model choices when the model list is unavailable", async () => {
    replies.push(new Error("sidecar down"));
    expect(await createIpcDocumentClient().installedDocumentModels()).toEqual([]);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("forwards the chosen engine, reports progress and resolves the parsed result", async () => {
    replies.push({ jobId: "job" }, {
      events: [{ kind: "progress", jobId: "job", page: 1, totalPages: 2 }], done: false, result: null,
    }, { events: [], done: true, result });
    const progress = vi.fn();
    const handle = createIpcDocumentClient().parse("PDF-base64", progress, "rapidocr");
    expect(handle.jobId).toBe("");
    await vi.advanceTimersByTimeAsync(DOCUMENT_POLL_MS);
    expect(handle.jobId).toBe("job");
    expect(progress).toHaveBeenCalledExactlyOnceWith({ page: 1, totalPages: 2 });
    await vi.advanceTimersByTimeAsync(DOCUMENT_POLL_MS);
    expect(await handle.done).toEqual(result);
    expect(invoke.mock.calls).toEqual([
      ["ipc_call", { method: "ocr.parseDocument", params: { documentBase64: "PDF-base64", engine: "rapidocr" } }],
      ["ipc_call", { method: "ocr.job.drainEvents", params: { jobId: "job" } }],
      ["ipc_call", { method: "ocr.job.drainEvents", params: { jobId: "job" } }],
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects a failed start without creating a polling timer", async () => {
    replies.push(new Error("document runtime missing"));
    const handle = createIpcDocumentClient().parse("PDF", vi.fn());
    await expect(handle.done).rejects.toThrow("document runtime missing");
    expect(invoke).toHaveBeenCalledExactlyOnceWith("ipc_call", {
      method: "ocr.parseDocument", params: { documentBase64: "PDF" },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ["drain failure", new Error("job unavailable"), "job unavailable"],
    ["error event", { events: [{ kind: "error", jobId: "job", message: "page unreadable" }], done: false, result: null }, "page unreadable"],
    ["missing result", { events: [], done: true, result: null }, "document parse produced no result"],
  ])("rejects %s and stops polling", async (_label, reply, message) => {
    replies.push({ jobId: "job" }, reply);
    const handle = createIpcDocumentClient({ pollMs: 50 }).parse("PDF", vi.fn());
    const rejected = expect(handle.done).rejects.toThrow(message);
    await vi.advanceTimersByTimeAsync(50);
    await rejected;
    expect(invoke).toHaveBeenLastCalledWith("ipc_call", { method: "ocr.job.drainEvents", params: { jobId: "job" } });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels a request cancelled before the sidecar accepts its job", async () => {
    replies.push({ jobId: "cancelled-job" }, { ok: true });
    const handle = createIpcDocumentClient().parse("PDF", vi.fn());
    handle.cancel();
    await expect(handle.done).rejects.toThrow("cancelled");
    await vi.advanceTimersByTimeAsync(0);
    expect(invoke).toHaveBeenLastCalledWith("ipc_call", { method: "ocr.job.cancel", params: { jobId: "cancelled-job" } });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
