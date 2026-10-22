// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHandlerContext, dispatch, resetExplorerOps } from "../../sidecar/src/handlers";
import { CodingSessionManager } from "../../sidecar/src/coding/sessionManager";
import { chatExplorerRuntime, resetChatExplorerRuntime } from "../../sidecar/src/chat/explorerRuntime";
import { clearInvokeOverride, setInvokeOverride } from "../../src/lib/ipc";
import { createIpcChatExplorerAdapter } from "../../src/modules/chat/ipcChatExplorerClient";

vi.mock("../../../modules/coding/utils/logger.js", () => ({
  getLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

describe("folder color through production dispatch and SQLite", () => {
  let directory: string;
  let dbPath: string;
  const context = createHandlerContext(
    { pid: process.pid, platform: process.platform },
    new CodingSessionManager(),
  );

  function reopen() {
    resetExplorerOps();
    resetChatExplorerRuntime();
    chatExplorerRuntime(dbPath);
    return createIpcChatExplorerAdapter();
  }

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "nexus-folder-color-"));
    dbPath = join(directory, "explorer.db");
    setInvokeOverride(async (command, args) => {
      if (command !== "ipc_call" || typeof args?.method !== "string") {
        throw new Error("unexpected IPC request");
      }
      const response = await dispatch(args.method, args.params, context);
      // IPC returns detached data, never mutable references to the store.
      return JSON.parse(JSON.stringify(response)) as unknown;
    });
  });

  afterEach(() => {
    clearInvokeOverride();
    resetExplorerOps();
    resetChatExplorerRuntime();
    rmSync(directory, { recursive: true, force: true });
  });

  it("sets, reloads and clears color without changing folders, chats or messages", async () => {
    const first = reopen();
    const parent = await first.createFolder({ parentId: null, name: "Parent" });
    const folder = await first.createFolder({ parentId: parent.id, name: "Project" });
    const other = await first.createFolder({ parentId: null, name: "Other" });
    const chat = await first.createChat({ folderId: folder.id, title: "Keep", modelId: "local" });
    const message = await first.appendMessage({ chatId: chat.id, role: "user", content: "Preserved transcript" });
    const before = await first.getFolder(folder.id);
    const savedChat = await first.getChat(chat.id);
    await first.setFolderColor?.(folder.id, "#9b5de5");
    expect((await first.getFolder(folder.id))?.color).toBe("#9b5de5");

    const second = reopen();
    expect(await second.getFolder(folder.id)).toMatchObject({
      id: folder.id, parentId: parent.id, name: "Project", icon: before?.icon, color: "#9b5de5",
    });
    expect(await second.getFolder(parent.id)).toEqual(parent);
    expect(await second.getFolder(other.id)).toEqual(other);
    expect(await second.getChat(chat.id)).toEqual(savedChat);
    expect(await second.listMessages(chat.id)).toEqual([message]);
    for (const color of ["red", "#abcd", "#1234567", "url(file)", undefined, 42]) {
      await expect(dispatch("chat.explorer.setFolderColor", { id: folder.id, color }, context)).rejects.toThrow();
    }
    await expect(dispatch("chat.explorer.setFolderColor", { id: "missing", color: null }, context)).rejects.toThrow("folder not found");
    await expect(dispatch("chat.explorer.setFolderColor", { id: folder.id, color: null, name: "Changed" }, context)).rejects.toThrow();
    expect((await second.listTree()).children.find((node) => node.folder?.id === parent.id)?.children[0]?.folder?.color).toBe("#9b5de5");
    await second.setFolderColor?.(folder.id, null);

    const third = reopen();
    expect((await third.getFolder(folder.id))?.color).toBeNull();
    expect(await third.getFolder(other.id)).toEqual(other);
    expect(await third.getChat(chat.id)).toEqual(savedChat);
    expect(await third.listMessages(chat.id)).toEqual([message]);
  });
});
