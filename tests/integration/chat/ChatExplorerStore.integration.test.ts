/**
 * Integration test for `ChatExplorerStore` against a real on-disk SQLite
 * file. Exercises the migration path (schema_version 0 -> 1), WAL journal
 * mode, FTS5 rebuild, and cross-instance persistence.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ChatExplorerStore } from "../../../modules/chat/storage/ChatExplorerStore.js";

describe("ChatExplorerStore (integration)", () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-chat-explorer-"));
    dbPath = path.join(tmpDir, "chat-explorer.db");
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  });

  it("persists folder color and clearing across reopen without changing other user data", () => {
    const first = new ChatExplorerStore(dbPath);
    const parent = first.createFolder({ parentId: null, name: "Parent" });
    const folder = first.createFolder({ parentId: parent.id, name: "Projects", icon: "book" });
    const other = first.createFolder({ parentId: null, name: "Other", color: "#123456" });
    const chat = first.createChat({ folderId: folder.id, title: "Keep me", modelId: "m" });
    const message = first.appendMessage({ chatId: chat.id, role: "user", content: "Keep this transcript" });
    const { updatedAt: _updatedAt, ...unchanged } = folder;
    const savedChat = first.getChat(chat.id);
    first.setFolderColor(folder.id, "#9b5de5");
    first.close();

    const second = new ChatExplorerStore(dbPath);
    expect(second.getFolder(folder.id)).toMatchObject({ ...unchanged, color: "#9b5de5" });
    expect(second.getFolder(parent.id)).toEqual(parent);
    expect(second.getFolder(other.id)).toEqual(other);
    expect(second.getChat(chat.id)).toEqual(savedChat);
    expect(second.listMessages(chat.id)).toEqual([message]);
    second.setFolderColor(folder.id, null);
    second.close();

    const third = new ChatExplorerStore(dbPath);
    expect(third.getFolder(folder.id)).toMatchObject({ ...unchanged, color: null });
    expect(third.getFolder(other.id)).toEqual(other);
    expect(third.listMessages(chat.id)).toEqual([message]);
    third.close();
  });

  it("creates the schema on first open and reuses it on re-open", () => {
    const first = new ChatExplorerStore(dbPath);
    const folder = first.createFolder({ parentId: null, name: "Projects" });
    const chat = first.createChat({ folderId: folder.id, title: "kickoff", modelId: "m" });
    first.close();

    expect(fs.existsSync(dbPath)).toBe(true);

    const second = new ChatExplorerStore(dbPath);
    expect(second.getFolder(folder.id)?.name).toBe("Projects");
    expect(second.getChat(chat.id)?.title).toBe("kickoff");
    second.close();
  });

  it("rebuilds FTS5 on a fresh schema version and matches across re-opens", () => {
    const first = new ChatExplorerStore(dbPath);
    const folder = first.createFolder({ parentId: null, name: "Roadmap" });
    first.close();

    const second = new ChatExplorerStore(dbPath);
    const hits = second.search("roadmap");
    expect(hits.find((h) => h.id === folder.id)).toBeDefined();
    second.close();
  });

  it("persists chat moves across reopen and cascades folder deletion", () => {
    const first = new ChatExplorerStore(dbPath);
    const a = first.createFolder({ parentId: null, name: "A" });
    const b = first.createFolder({ parentId: null, name: "B" });
    const chat = first.createChat({ folderId: a.id, title: "c", modelId: "m" });
    first.moveChat(chat.id, b.id);
    first.close();

    const second = new ChatExplorerStore(dbPath);
    expect(second.getChat(chat.id)?.folderId).toBe(b.id);

    second.deleteFolder(b.id);
    expect(second.getFolder(b.id)).toBeNull();
    expect(second.getChat(chat.id)).toBeNull();
    second.close();
  });
});
