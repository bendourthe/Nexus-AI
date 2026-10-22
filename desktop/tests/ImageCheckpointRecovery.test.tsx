import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StudioSessionStore } from "../../core/generations/StudioSessionStore";
import { AskInbox } from "../../modules/coding/autonomy/AskInbox";
import { createImageEditOps } from "../sidecar/src/studio/imageEditRuntime";
import { METHOD_SCHEMAS, type Method } from "../sidecar/src/protocol";
import { clearInvokeOverride, setInvokeOverride } from "../src/lib/ipc";
import { createDurableImageEdit } from "../src/shared/studio/imageEditClient";
import { ImageViewer } from "../src/shared/studio/ImageViewer";
import { StudioHistoryPane } from "../src/shared/explorer/StudioHistoryPane";
import { InMemoryStudioExplorerClient } from "../src/shared/explorer/studioExplorerClient";

const roots: string[] = [];
const stores: StudioSessionStore[] = [];
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=";
const adjust = (brightness: number) => ({ kind: "adjustments", values: { brightness, contrast: 100, saturation: 100, sharpness: 0 } });
afterEach(() => {
  cleanup();
  clearInvokeOverride();
  for (const store of stores.splice(0)) store.close();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "nexus-viewer-recovery-"));
  roots.push(root);
  const mediaRoot = join(root, "images");
  mkdirSync(mediaRoot);
  const png = join(mediaRoot, "source.png");
  writeFileSync(png, Buffer.from(PNG, "base64"));
  const store = new StudioSessionStore(join(root, "sessions.db"));
  stores.push(store);
  const session = store.createSession({ pillar: "image", folderId: null, title: "Recovery", modelId: "fixture" });
  const turn = store.appendTurn({ sessionId: session.id, role: "assistant", content: "", mediaRef: png });
  const inbox = new AskInbox();
  const ops = createImageEditOps(store, { mediaRoot, askInbox: inbox });
  const selected = { sessionId: session.id, turnId: turn.id };
  const calls: string[] = [];
  let restoreError: string | null = null;
  let releaseRestore: (() => void) | null = null;
  let holdRestore = false;
  // The production renderer client and strict protocol requests cross this
  // injected transport into production ops. Native Tauri is not under test.
  setInvokeOverride(async (_command, args) => {
    const method = args!.method as Method;
    const input = METHOD_SCHEMAS[method].request.parse(args!.params);
    calls.push(method);
    switch (method) {
      case "studio.image.edit.open": return ops.open(input as Parameters<typeof ops.open>[0]);
      case "studio.image.edit.close": return ops.close(input as Parameters<typeof ops.close>[0]);
      case "studio.image.edit.revision": return ops.revision(input as Parameters<typeof ops.revision>[0]);
      case "studio.image.edit.commit": return ops.commit(input as Parameters<typeof ops.commit>[0]);
      case "studio.image.edit.checkpoints": return ops.checkpoints(input as Parameters<typeof ops.checkpoints>[0]);
      case "studio.image.edit.restore":
        if (holdRestore) await new Promise<void>((resolve) => { releaseRestore = resolve; });
        if (restoreError) throw new Error(restoreError);
        return ops.restore(input as Parameters<typeof ops.restore>[0]);
      default: throw new Error(`Unexpected method ${method}`);
    }
  });
  return { ops, inbox, selected, calls, edit: createDurableImageEdit(selected),
    failRestore: (error: string | null) => { restoreError = error; },
    hold: () => { holdRestore = true; }, release: () => { holdRestore = false; releaseRestore?.(); } };
}

async function saved() {
  await waitFor(() => expect(screen.getByTestId("viewer-save-status")).toHaveTextContent("Edits saved"));
}
function viewer(f: ReturnType<typeof fixture>) {
  render(<ImageViewer src={`data:image/png;base64,${PNG}`} durable={f.edit} onClose={vi.fn()} testId="viewer" />);
}
function brightness(value: number) {
  fireEvent.change(screen.getByTestId("viewer-brightness"), { target: { value: String(value) } });
  fireEvent.pointerUp(screen.getByTestId("viewer-brightness"));
}

describe("viewer approval recovery", () => {
  it("shows approval metadata, confirms and saves full history recovery over the production client and owners", async () => {
    const f = fixture();
    viewer(f);
    await saved();
    brightness(120); await saved();
    brightness(150); await saved();
    fireEvent.click(screen.getByTestId("viewer-undo")); await saved();
    const requested = f.ops.requestAccess({ ...f.selected, callerId: "agent", runId: "run" });
    await waitFor(async () => expect(await f.inbox.pendingCount()).toBe(1));
    const ask = (await f.inbox.list("pending"))[0]!;
    await act(async () => { expect((await f.inbox.approve(ask.id)).ok).toBe(true); });
    const access = { callerId: "agent", runId: "run", grantId: f.ops.accessStatus({ ...requested, callerId: "agent", runId: "run" }).grantId! };
    f.ops.apply(access, { action: adjust(180), expectedRevision: 3, idempotencyKey: "branch" });
    cleanup(); viewer(f); await saved();
    expect(screen.getByTestId("viewer-brightness")).toHaveValue("180");
    fireEvent.click(screen.getByTestId("viewer-recovery"));
    await screen.findByText(/agent \/ run, revision 3, history 1\/2/);
    const checkpoint = f.ops.checkpoints({ grantId: f.ops.open(f.selected).grantId }).checkpoints[0]!;
    fireEvent.click(screen.getByTestId(`viewer-restore-${checkpoint.id}`));
    expect(screen.getByRole("alertdialog", { name: "Confirm image recovery" })).toBeInTheDocument();
    expect(screen.getByTestId("viewer-brightness")).toHaveValue("180");
    fireEvent.click(screen.getByTestId("viewer-restore-confirm"));
    await screen.findByText("Recovery checkpoint restored and saved. Previous agent access has ended.");
    await saved();
    expect(screen.getByTestId("viewer-brightness")).toHaveValue("120");
    expect(screen.getByTestId("viewer-redo")).toBeEnabled();
    fireEvent.click(screen.getByTestId("viewer-redo")); await saved();
    expect(screen.getByTestId("viewer-brightness")).toHaveValue("150");
    expect(() => f.ops.describe(access)).toThrow("FORBIDDEN");
    expect(f.calls).toContain("studio.image.edit.restore");
  });

  it("flushes edits before restore, locks editing in flight, and keeps failures/conflicts visible without false success", async () => {
    const f = fixture();
    viewer(f); await saved();
    f.ops.requestAccess({ ...f.selected, callerId: "agent", runId: "run" });
    await waitFor(async () => expect(await f.inbox.pendingCount()).toBe(1));
    await f.inbox.approve((await f.inbox.list("pending"))[0]!.id);
    fireEvent.click(screen.getByTestId("viewer-recovery"));
    await screen.findByText(/agent \/ run, revision 0/);
    const checkpoint = f.ops.checkpoints({ grantId: f.ops.open(f.selected).grantId }).checkpoints[0]!;
    brightness(130);
    fireEvent.click(screen.getByTestId(`viewer-restore-${checkpoint.id}`));
    f.failRestore("STORAGE_UNAVAILABLE: Recovery disk failed");
    fireEvent.click(screen.getByTestId("viewer-restore-confirm"));
    await screen.findByText("Not saved: Recovery disk failed");
    expect(screen.getByTestId("viewer-brightness")).toHaveValue("130");
    expect(screen.queryByText(/checkpoint restored and saved/)).toBeNull();
    fireEvent.click(screen.getByTestId("viewer-save-status-reload")); await saved();
    f.failRestore(null);
    f.hold();
    fireEvent.click(screen.getByTestId("viewer-restore-confirm"));
    await screen.findByText("Restoring and saving checkpoint...");
    const commits = f.calls.filter((method) => method === "studio.image.edit.commit").length;
    brightness(190);
    expect(f.calls.filter((method) => method === "studio.image.edit.commit")).toHaveLength(commits);
    // Another viewer wins the CAS while recovery's transport is delayed.
    const other = f.ops.open(f.selected);
    f.ops.commit({ grantId: other.grantId, expectedRevision: other.recipe.revision, action: adjust(160) });
    await act(async () => { f.release(); });
    await screen.findByText("This image was changed somewhere else. Reload to see the latest edits.");
    expect(screen.queryByText(/checkpoint restored and saved/)).toBeNull();
  });
});

describe("image deletion policy disclosure", () => {
  it.each(["image", "video"] as const)("keeps the retention notice exclusive to %s image deletion", async (pillar) => {
    const client = new InMemoryStudioExplorerClient(pillar);
    const session = client.createSession({ folderId: null, title: "Saved image", modelId: "fixture" });
    render(<StudioHistoryPane pillar={pillar} client={client} defaultModelId="fixture" />);
    fireEvent.click(screen.getByTestId(`tree-delete-${session.id}`));
    const dialog = await screen.findByTestId("folder-tree-confirm-delete");
    if (pillar === "image") {
      expect(dialog).toHaveTextContent("history, saved edits and recovery checkpoints");
      expect(dialog).toHaveTextContent("Shared original image files stay on disk");
    } else expect(dialog).not.toHaveTextContent("Shared original image files");
  });
});
