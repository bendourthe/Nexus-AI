/**
 * Snapshot a SQLite file before a pending migration.
 * VACUUM INTO is synchronous, so store constructors can call it.
 * In-memory databases and borrowed handles with no main file are no-ops.
 * The path-owning constructor is the snapshot owner.
 */

import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

export const SNAPSHOT_SIZE_CEILING_BYTES = 500 * 1024 * 1024;
export const SNAPSHOT_RETAIN = 3;

export class MigrationSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationSnapshotError";
  }
}

export class HalfMigratedDatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HalfMigratedDatabaseError";
  }
}

export function databaseFilePath(db: Database.Database): string | null {
  const rows = db.pragma("database_list") as { name: string; file: string }[];
  const main = rows.find((row) => row.name === "main");
  if (!main?.file) return null;
  return main.file;
}

export function userVersion(db: Database.Database): number {
  return Number(db.pragma("user_version", { simple: true }) ?? 0);
}

export function needsMigration(db: Database.Database, targetVersion: number): boolean {
  return userVersion(db) < targetVersion;
}

export function pendingMarkerPath(filePath: string): string {
  return `${filePath}.migration-pending`;
}

export function newestSnapshotPath(filePath: string): string | null {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  if (!fs.existsSync(dir)) return null;
  const ranked = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(`${base}.v`) && name.endsWith(".snapshot"))
    .map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  const newest = ranked[0];
  return newest ? path.join(dir, newest.name) : null;
}

export function assertNotHalfMigrated(filePath: string | null): void {
  if (!filePath || !fs.existsSync(pendingMarkerPath(filePath))) return;
  const snap = newestSnapshotPath(filePath) ?? "the newest .snapshot file beside the database";
  throw new HalfMigratedDatabaseError(
    `Database ${filePath} was left half-migrated by an interrupted upgrade. Refusing to start. Snapshot: ${snap}. An older build may have stopped mid-migration. Do not delete the database. Copy the snapshot over the database only after you decide that copy is the one you want.`,
  );
}

export function snapshotBeforeMigration(
  db: Database.Database,
  targetVersion: number,
  log: (message: string) => void = (message) => {
    console.warn(message);
  },
): string | null {
  if (!needsMigration(db, targetVersion)) return null;
  const filePath = databaseFilePath(db);
  if (!filePath || !fs.existsSync(filePath)) return null;
  const size = fs.statSync(filePath).size;
  if (size > SNAPSHOT_SIZE_CEILING_BYTES) {
    log(
      `pre-migration snapshot skipped: ${filePath} is ${size} bytes, ceiling is ${SNAPSHOT_SIZE_CEILING_BYTES}`,
    );
    return null;
  }
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const dest = path.join(dir, `${base}.v${targetVersion}.${Date.now()}.snapshot`);
  const sqlPath = dest.replace(/\\/g, "/").replace(/'/g, "''");
  try {
    db.exec(`VACUUM INTO '${sqlPath}'`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new MigrationSnapshotError(
      `pre-migration snapshot failed for ${filePath}: ${message}. Migration did not run.`,
    );
  }
  pruneSnapshots(dir, base);
  return dest;
}

function pruneSnapshots(dir: string, base: string): void {
  const ranked = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(`${base}.v`) && name.endsWith(".snapshot"))
    .map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  for (const old of ranked.slice(SNAPSHOT_RETAIN)) {
    fs.unlinkSync(path.join(dir, old.name));
  }
}

export function markMigrationPending(filePath: string | null): void {
  if (!filePath) return;
  fs.writeFileSync(pendingMarkerPath(filePath), "pending\n", "utf8");
}

export function clearMigrationPending(filePath: string | null): void {
  if (!filePath) return;
  const marker = pendingMarkerPath(filePath);
  if (fs.existsSync(marker)) fs.unlinkSync(marker);
}
