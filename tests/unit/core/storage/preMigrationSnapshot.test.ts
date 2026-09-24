import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ChatHistoryStore } from "../../../../src/storage/ChatHistoryStore.js";
import {
  HalfMigratedDatabaseError,
  SNAPSHOT_RETAIN,
  assertNotHalfMigrated,
  databaseFilePath,
  markMigrationPending,
  snapshotBeforeMigration,
  userVersion,
} from "../../../../core/storage/preMigrationSnapshot.js";

const dirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-snap-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function snapshots(dir: string): string[] {
  return fs.readdirSync(dir).filter((name) => name.endsWith(".snapshot"));
}

describe("pre-migration snapshots", () => {
  it("uses a SQLite that supports VACUUM INTO", () => {
    const db = new Database(":memory:");
    const version = String(db.prepare("select sqlite_version() as v").get() && (db.prepare("select sqlite_version() as v").get() as { v: string }).v);
    db.close();
    const [major, minor] = version.split(".").map((part) => Number(part));
    expect(major > 3 || (major === 3 && (minor ?? 0) >= 27)).toBe(true);
  });

  it("creates no new snapshot when the chat store is already migrated", () => {
    const dir = tempDir();
    const file = path.join(dir, "chat.db");
    const first = new ChatHistoryStore(file);
    first.createSession("kept");
    const afterFirst = snapshots(dir).length;
    expect(afterFirst).toBe(1);
    for (let i = 0; i < 3; i++) new ChatHistoryStore(file);
    expect(snapshots(dir).length).toBe(afterFirst);
  });

  it("keeps the newest three snapshots and prunes the oldest", () => {
    const dir = tempDir();
    const file = path.join(dir, "chat.db");
    const db = new Database(file);
    db.exec("CREATE TABLE t (id INTEGER)");
    db.pragma("user_version = 0");
    for (let target = 1; target <= 4; target++) {
      db.pragma("user_version = 0");
      snapshotBeforeMigration(db, target);
    }
    db.close();
    expect(snapshots(dir).length).toBe(SNAPSHOT_RETAIN);
  });

  it("leaves the original bytes unchanged and refuses to reopen after a failed migration", () => {
    const dir = tempDir();
    const file = path.join(dir, "chat.db");
    const db = new Database(file);
    db.exec("CREATE TABLE t (id INTEGER)");
    db.prepare("INSERT INTO t (id) VALUES (1)").run();
    db.pragma("user_version = 0");
    db.close();
    const before = fs.readFileSync(file);
    const opened = new Database(file);
    opened.pragma("journal_mode = WAL");
    const snap = snapshotBeforeMigration(opened, 2);
    expect(snap).toBeTruthy();
    markMigrationPending(databaseFilePath(opened));
    expect(() => {
      opened.transaction(() => {
        opened.exec("INSERT INTO t (id) VALUES (2)");
        throw new Error("migration failed on purpose");
      })();
    }).toThrow(/migration failed/);
    opened.close();
    expect(fs.readFileSync(file).equals(before)).toBe(true);
    expect(() => assertNotHalfMigrated(file)).toThrow(HalfMigratedDatabaseError);
    expect(() => new ChatHistoryStore(file)).toThrow(/half-migrated/);
    expect(userVersion(new Database(file))).toBe(0);
  });
});
