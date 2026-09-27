import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { NewerSchemaError } from "../../../core/chat/branchPolicy.js";
import { ChatExplorerStore } from "../../../modules/chat/storage/ChatExplorerStore.js";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // Windows can keep a SQLite handle for a moment after close.
    }
  }
});

describe("ChatExplorerStore branching", () => {
  it("keeps both branches and the active leaf across a reopen", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-explorer-branch-"));
    dirs.push(dir);
    const dbPath = path.join(dir, "explorer.db");
    const store = new ChatExplorerStore(dbPath);
    const chat = store.createChat({ folderId: null, title: "Thread", modelId: "gemma" });
    const first = store.appendMessage({ chatId: chat.id, role: "user", content: "one", id: "m1", createdAt: 1 });
    store.appendMessage({ chatId: chat.id, role: "assistant", content: "two", id: "m2", createdAt: 2 });
    const branched = store.forkFromMessage(chat.id, first.id);
    store.appendMessage({ chatId: branched.id, role: "user", content: "different", id: "m3", createdAt: 3 });
    store.close();

    const reopened = new ChatExplorerStore(dbPath);
    expect(reopened.listMessages(chat.id).map((message) => message.content)).toEqual(["one", "two"]);
    expect(reopened.listMessages(branched.id).map((message) => message.content)).toEqual(["one", "different"]);
    expect(reopened.getChat(chat.id)?.activeLeafChatId).toBe(branched.id);
    reopened.close();
  });

  it("lists a branch at the root when its parent row is gone, and refuses a newer database", () => {
    const store = new ChatExplorerStore(":memory:");
    const chat = store.createChat({ folderId: null, title: "Thread", modelId: "gemma" });
    const message = store.appendMessage({ chatId: chat.id, role: "user", content: "one", id: "m1", createdAt: 1 });
    const branched = store.forkFromMessage(chat.id, message.id);
    const raw = (store as unknown as { _db: Database.Database })._db;
    raw.prepare("UPDATE chat_chats SET forked_from_chat_id = ? WHERE id = ?").run("missing-parent", branched.id);
    const rooted = store.listTree().chats.find((entry) => entry.id === branched.id);
    expect(rooted?.parentUnresolved).toBe(true);
    expect(rooted?.folderId).toBeNull();
    expect(() => store.deleteChat(chat.id)).toThrow(/branch/);
    store.close();

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-explorer-newer-"));
    dirs.push(dir);
    const dbPath = path.join(dir, "newer.db");
    const newer = new Database(dbPath);
    newer.exec("CREATE TABLE chat_chats (id TEXT PRIMARY KEY)");
    newer.pragma("user_version = 99");
    newer.close();
    expect(() => new ChatExplorerStore(dbPath)).toThrow(NewerSchemaError);
  });
});
