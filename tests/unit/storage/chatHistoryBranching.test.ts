import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { MAX_BRANCH_DEPTH } from "../../../core/chat/branchPolicy.js";
import { HalfMigratedDatabaseError } from "../../../core/storage/preMigrationSnapshot.js";
import {
  ChatHistoryStore,
  NewerSchemaError,
  chatHistoryMigrationTest,
} from "../../../src/storage/ChatHistoryStore.js";

const dirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-branch-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  chatHistoryMigrationTest.fault = null;
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function seed(store: ChatHistoryStore): { sessionId: string; messageIds: string[] } {
  const session = store.createSession("Thread");
  const messageIds: string[] = [];
  for (const content of ["one", "two", "three", "four"]) {
    const id = `m-${content}`;
    messageIds.push(id);
    store.saveMessage(session.id, {
      id,
      role: content === "two" || content === "four" ? "assistant" : "user",
      content,
      timestamp: messageIds.length,
    });
  }
  return { sessionId: session.id, messageIds };
}

describe("ChatHistoryStore branching", () => {
  it("keeps both branches and the active leaf across a reopen", () => {
    const dir = tempDir();
    const dbPath = path.join(dir, "chat.db");
    const first = new ChatHistoryStore(dbPath);
    const seeded = seed(first);
    const branched = first.forkFromMessage(seeded.sessionId, seeded.messageIds[1]!);
    first.saveMessage(branched.id, {
      id: "m-other",
      role: "user",
      content: "different",
      timestamp: 10,
    });
    first.close();

    const reopened = new ChatHistoryStore(dbPath);
    const root = reopened.getSession(seeded.sessionId);
    const leaf = reopened.getSession(branched.id);
    expect(root?.messages.map((message) => message.content)).toEqual(["one", "two", "three", "four"]);
    expect(leaf?.messages.map((message) => message.content)).toEqual(["one", "two", "different"]);
    expect(leaf?.forkedFromMessageId).toBe(seeded.messageIds[1]);
    expect(root?.activeLeafSessionId).toBe(branched.id);
    expect(reopened.listBranchFamily(seeded.sessionId).map((session) => session.id).sort()).toEqual(
      [seeded.sessionId, branched.id].sort(),
    );
    reopened.close();
  });

  it("reads a pre-plan database and refuses a newer one", () => {
    const dir = tempDir();
    const dbPath = path.join(dir, "legacy.db");
    const raw = new Database(dbPath);
    raw.exec(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      INSERT INTO sessions (id, title, created_at, updated_at) VALUES ('s1', 'Old', 1, 1);
      INSERT INTO messages (id, session_id, role, content, timestamp) VALUES ('m1', 's1', 'user', 'kept', 1);
    `);
    raw.pragma("user_version = 2");
    raw.close();

    const opened = new ChatHistoryStore(dbPath);
    expect(opened.getSession("s1")?.messages[0]?.content).toBe("kept");
    opened.close();

    const newerPath = path.join(dir, "newer.db");
    fs.copyFileSync(dbPath, newerPath);
    const newer = new Database(newerPath);
    newer.pragma("user_version = 99");
    newer.close();
    expect(() => new ChatHistoryStore(newerPath)).toThrow(NewerSchemaError);
  });

  it("leaves the original intact when a migration is interrupted", () => {
    const dir = tempDir();
    const dbPath = path.join(dir, "interrupt.db");
    const store = new ChatHistoryStore(dbPath);
    seed(store);
    store.close();
    const raw = new Database(dbPath);
    raw.pragma("user_version = 2");
    raw.close();
    const before = fs.readFileSync(dbPath);

    chatHistoryMigrationTest.fault = () => {
      throw new Error("migration interrupted");
    };
    expect(() => new ChatHistoryStore(dbPath)).toThrow(/migration interrupted/);
    expect(() => new ChatHistoryStore(dbPath)).toThrow(HalfMigratedDatabaseError);
    expect(fs.readFileSync(dbPath).equals(before)).toBe(true);
  });

  it("rejects a second opener while a migration lock is held", () => {
    const dir = tempDir();
    const dbPath = path.join(dir, "race.db");
    const raw = new Database(dbPath);
    raw.exec(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
    `);
    raw.pragma("user_version = 2");
    raw.pragma("busy_timeout = 0");
    raw.exec("BEGIN IMMEDIATE");
    expect(() => new ChatHistoryStore(dbPath)).toThrow(/locked|busy|branch operation/i);
    raw.exec("ROLLBACK");
    raw.close();
  });

  it("restores the pre-migration snapshot and reads the original thread", () => {
    const dir = tempDir();
    const dbPath = path.join(dir, "restore.db");
    const store = new ChatHistoryStore(dbPath);
    const seeded = seed(store);
    store.close();
    const raw = new Database(dbPath);
    raw.pragma("user_version = 2");
    raw.close();
    const migrating = new ChatHistoryStore(dbPath);
    migrating.close();
    const snapshot = fs
      .readdirSync(dir)
      .filter((name) => name.endsWith(".snapshot"))
      .map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)[0]?.name;
    expect(snapshot).toBeTruthy();
    fs.copyFileSync(path.join(dir, snapshot!), dbPath);
    for (const suffix of ["-wal", "-shm"]) {
      const sidecar = `${dbPath}${suffix}`;
      if (fs.existsSync(sidecar)) fs.rmSync(sidecar);
    }
    const restored = new ChatHistoryStore(dbPath);
    expect(restored.getSession(seeded.sessionId)?.messages.map((message) => message.content)).toEqual([
      "one",
      "two",
      "three",
      "four",
    ]);
    restored.close();
  });

  it("rejects a branch past the depth cap and a cycle", () => {
    const store = new ChatHistoryStore(":memory:");
    let sessionId = store.createSession("root").id;
    let pointId = "root-msg";
    store.saveMessage(sessionId, { id: pointId, role: "user", content: "start", timestamp: 1 });
    for (let depth = 0; depth < MAX_BRANCH_DEPTH; depth += 1) {
      const branched = store.forkFromMessage(sessionId, pointId);
      pointId = `level-${depth}`;
      store.saveMessage(branched.id, {
        id: pointId,
        role: "user",
        content: pointId,
        timestamp: depth + 2,
      });
      sessionId = branched.id;
    }
    expect(() => store.forkFromMessage(sessionId, pointId)).toThrow(/depth/);

    const raw = (store as unknown as { _db: Database.Database })._db;
    raw.prepare("UPDATE sessions SET forked_from_session_id = ? WHERE id = ?").run(sessionId, sessionId);
    expect(() => store.listBranchFamily(sessionId)).toThrow(/cycle/);
    store.close();
  });

  it("refuses to delete a parent session or a branch-point message", () => {
    const store = new ChatHistoryStore(":memory:");
    const seeded = seed(store);
    const branched = store.forkFromMessage(seeded.sessionId, seeded.messageIds[1]!);
    expect(() => store.deleteSession(seeded.sessionId)).toThrow(/branches/);
    expect(() => store.deleteMessage(seeded.messageIds[1]!)).toThrow(/branch point/);
    store.deleteSession(branched.id);
    expect(store.getSession(branched.id)).toBeNull();
    expect(store.getSession(seeded.sessionId)?.messages).toHaveLength(4);
    store.close();
  });

  it("rejects a second branch write while another connection holds the lock", () => {
    const dir = tempDir();
    const dbPath = path.join(dir, "fork-race.db");
    const store = new ChatHistoryStore(dbPath);
    const seeded = seed(store);
    const holder = new Database(dbPath);
    holder.pragma("busy_timeout = 0");
    holder.exec("BEGIN IMMEDIATE");
    expect(() => store.forkFromMessage(seeded.sessionId, seeded.messageIds[0]!)).toThrow(
      /another branch operation is in progress/,
    );
    holder.exec("ROLLBACK");
    holder.close();
    const branched = store.forkFromMessage(seeded.sessionId, seeded.messageIds[0]!);
    expect(branched.forkedFromSessionId).toBe(seeded.sessionId);
    store.close();
  });
});
