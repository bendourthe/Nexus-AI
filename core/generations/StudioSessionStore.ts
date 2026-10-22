/**
 * v2.2.6 Phase 1 -- SQLite store for named Image/Video studio sessions.
 *
 * Mirrors the Chat explorer folder/session/turn shape without sharing the
 * Chatbot schema. `lastOutputRef` and turn `mediaRef` are paths only.
 * Missing pillar rejects create. Corrupt optional JSON on a row is skipped
 * so one bad session cannot crash the tree. Delete wins over rename.
 */

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import BetterSqlite from "better-sqlite3";
import type Database from "better-sqlite3";
import { redactSecrets } from "../observability/redactSecrets.js";
import { isStudioPillar, type StudioPillar } from "./StudioSessionStore.types.js";
import { ImageEditError, parseImageEditRecipe, type ImageEditRecipe } from "../image/ImageEditRecipe.js";
import type {
  AppendStudioTurnInput,
  CreateStudioFolderInput,
  CreateStudioSessionInput,
  StudioFolder,
  StudioSession,
  StudioTreeNode,
  StudioTurn,
} from "./StudioSessionStore.types.js";

const MAX_PATH_REF = 4096;

export interface StudioImageRecipeScope {
  readonly turn: StudioTurn;
  readonly recipeJson: string | null;
  readonly storedRevision: number;
  readonly storedSourceSha256: string | null;
  commit(recipe: ImageEditRecipe, expectedRevision: number): void;
  checkpoints(beforeId?: string): ImageEditCheckpointSummary[];
  findCheckpoint(id: string): ImageEditCheckpoint | null;
  checkpoint(input: ImageEditCheckpoint): ImageEditCheckpoint;
}

/** Immutable recovery data, never an authorization grant. */
export interface ImageEditCheckpoint {
  readonly id: string;
  readonly requestId: string;
  readonly approvalId: string;
  readonly callerId: string;
  readonly runId: string;
  readonly createdAt: number;
  readonly recipe: ImageEditRecipe;
}
export interface ImageEditCheckpointSummary {
  readonly id: string;
  readonly createdAt: number;
  readonly callerId: string;
  readonly runId: string;
  readonly revision: number;
  readonly cursor: number;
  readonly commands: number;
}

interface FolderRow {
  id: string;
  pillar: string;
  parent_id: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  extra_json: string | null;
  created_at: number;
  updated_at: number;
}

interface SessionRow {
  id: string;
  pillar: string;
  folder_id: string | null;
  title: string;
  model_id: string;
  last_output_ref: string | null;
  extra_json: string | null;
  created_at: number;
  updated_at: number;
  turn_count: number;
  archived_at?: number | null;
  archived_folder_id?: string | null;
}

interface TurnRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  media_ref: string | null;
  extra_json: string | null;
  created_at: number;
}

function assertPillar(value: unknown): StudioPillar {
  if (!isStudioPillar(value)) {
    throw new Error("studio pillar is required (image or video)");
  }
  return value;
}

function assertPathRef(ref: string | null | undefined): string | null {
  if (ref == null || ref === "") return null;
  const trimmed = ref.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) {
    throw new Error("mediaRef must be a path, not an inline blob");
  }
  if (trimmed.length > MAX_PATH_REF) {
    throw new Error("mediaRef path is too long");
  }
  return trimmed;
}

function extraJsonOk(raw: string | null): boolean {
  if (raw == null || raw === "") return true;
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

interface TurnUsageExtra {
  inputTokens?: number | null;
  reasoningTokens?: number | null;
  reasoningText?: string | null;
  outputTokens?: number | null;
  tokensEstimated?: boolean;
  requestUsage?: AppendStudioTurnInput["requestUsage"];
  messageUsage?: AppendStudioTurnInput["messageUsage"];
  visualUnits?: number | null;
}

function optionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseTurnUsage(raw: string | null): TurnUsageExtra {
  if (raw == null || raw === "") return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const obj = parsed as Record<string, unknown>;
    const extra: TurnUsageExtra = {
      inputTokens: optionalNumber(obj.inputTokens),
      reasoningTokens: optionalNumber(obj.reasoningTokens),
      reasoningText:
        typeof obj.reasoningText === "string" ? obj.reasoningText.slice(0, 65_536) : null,
      outputTokens: optionalNumber(obj.outputTokens),
    };
    if (obj.tokensEstimated === true) extra.tokensEstimated = true;
    if (obj.requestUsage && typeof obj.requestUsage === "object") {
      extra.requestUsage = obj.requestUsage as NonNullable<AppendStudioTurnInput["requestUsage"]>;
    }
    if (obj.messageUsage && typeof obj.messageUsage === "object") {
      extra.messageUsage = obj.messageUsage as NonNullable<AppendStudioTurnInput["messageUsage"]>;
    }
    if (typeof obj.visualUnits === "number" && Number.isFinite(obj.visualUnits)) {
      extra.visualUnits = obj.visualUnits;
    } else if (obj.visualUnits === null) {
      extra.visualUnits = null;
    }
    return extra;
  } catch {
    return {};
  }
}

function turnUsageExtraJson(input: AppendStudioTurnInput): string | null {
  const extra: TurnUsageExtra = {};
  if (input.inputTokens !== undefined) extra.inputTokens = input.inputTokens;
  if (input.reasoningTokens !== undefined) extra.reasoningTokens = input.reasoningTokens;
  if (input.reasoningText !== undefined) {
    extra.reasoningText = input.reasoningText
      ? redactSecrets(input.reasoningText).slice(0, 65_536)
      : null;
  }
  if (input.outputTokens !== undefined) extra.outputTokens = input.outputTokens;
  if (input.tokensEstimated) extra.tokensEstimated = true;
  if (input.requestUsage) extra.requestUsage = input.requestUsage;
  if (input.messageUsage) extra.messageUsage = input.messageUsage;
  if (input.visualUnits !== undefined) extra.visualUnits = input.visualUnits;
  return Object.keys(extra).length === 0 ? null : JSON.stringify(extra);
}

function rowToFolder(row: FolderRow): StudioFolder | null {
  if (!isStudioPillar(row.pillar)) return null;
  if (!extraJsonOk(row.extra_json)) return null;
  return {
    id: row.id,
    pillar: row.pillar,
    parentId: row.parent_id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSession(row: SessionRow): StudioSession | null {
  if (!isStudioPillar(row.pillar)) return null;
  if (!extraJsonOk(row.extra_json)) return null;
  return {
    id: row.id,
    pillar: row.pillar,
    folderId: row.folder_id,
    title: row.title,
    modelId: row.model_id,
    lastOutputRef: row.last_output_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    turnCount: row.turn_count,
    archivedAt: row.archived_at ?? null,
    archivedFolderId: row.archived_folder_id ?? null,
  };
}

function rowToTurn(row: TurnRow): StudioTurn | null {
  if (!extraJsonOk(row.extra_json)) return null;
  const usage = parseTurnUsage(row.extra_json);
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    mediaRef: row.media_ref,
    createdAt: row.created_at,
    ...usage,
  };
}

export class StudioSessionStore {
  private readonly db: Database.Database;

  constructor(dbPath: string) {
    if (dbPath !== ":memory:") {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new BetterSqlite(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS studio_folders (
        id          TEXT    PRIMARY KEY,
        pillar      TEXT    NOT NULL,
        parent_id   TEXT             REFERENCES studio_folders(id) ON DELETE CASCADE,
        name        TEXT    NOT NULL,
        color       TEXT,
        icon        TEXT,
        extra_json  TEXT,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_studio_folders_pillar_parent
        ON studio_folders(pillar, parent_id);

      CREATE TABLE IF NOT EXISTS studio_sessions (
        id               TEXT    PRIMARY KEY,
        pillar           TEXT    NOT NULL,
        folder_id        TEXT             REFERENCES studio_folders(id) ON DELETE CASCADE,
        title            TEXT    NOT NULL,
        model_id         TEXT    NOT NULL,
        last_output_ref  TEXT,
        extra_json       TEXT,
        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL,
        turn_count       INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_studio_sessions_pillar_folder
        ON studio_sessions(pillar, folder_id);

      CREATE TABLE IF NOT EXISTS studio_turns (
        id          TEXT    PRIMARY KEY,
        session_id  TEXT    NOT NULL REFERENCES studio_sessions(id) ON DELETE CASCADE,
        role        TEXT    NOT NULL,
        content     TEXT    NOT NULL,
        media_ref   TEXT,
        extra_json  TEXT,
        created_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_studio_turns_session
        ON studio_turns(session_id, created_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_turns_identity
        ON studio_turns(id, session_id);
      CREATE TABLE IF NOT EXISTS studio_image_edit_recipes (
        turn_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        source_sha256 TEXT NOT NULL,
        revision INTEGER NOT NULL CHECK (revision > 0),
        recipe_json TEXT NOT NULL,
        FOREIGN KEY (turn_id, session_id) REFERENCES studio_turns(id, session_id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS studio_image_edit_checkpoints (
        id TEXT PRIMARY KEY,
        turn_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        checkpoint_json TEXT NOT NULL,
        FOREIGN KEY (turn_id, session_id) REFERENCES studio_turns(id, session_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_studio_image_edit_checkpoints_owner
        ON studio_image_edit_checkpoints(turn_id, session_id);
    `);
    const columns = this.db.prepare(`PRAGMA table_info(studio_sessions)`).all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === "archived_at")) {
      this.db.exec(`ALTER TABLE studio_sessions ADD COLUMN archived_at INTEGER`);
    }
    if (!columns.some((column) => column.name === "archived_folder_id")) {
      this.db.exec(`ALTER TABLE studio_sessions ADD COLUMN archived_folder_id TEXT`);
    }
  }

  close(): void {
    this.db.close();
  }

  createFolder(input: CreateStudioFolderInput): StudioFolder {
    const pillar = assertPillar(input.pillar);
    const name = input.name.trim();
    if (!name) throw new Error("folder name is required");
    if (input.parentId !== null) {
      const parent = this.getFolderRow(input.parentId);
      if (!parent) throw new Error(`parent folder not found: ${input.parentId}`);
      if (parent.pillar !== pillar) throw new Error("parent folder pillar mismatch");
    }
    const id = randomUUID();
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO studio_folders
           (id, pillar, parent_id, name, color, icon, extra_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .run(id, pillar, input.parentId, name, input.color ?? null, input.icon ?? null, now, now);
    return {
      id,
      pillar,
      parentId: input.parentId,
      name,
      color: input.color ?? null,
      icon: input.icon ?? null,
      createdAt: now,
      updatedAt: now,
    };
  }

  renameFolder(id: string, name: string): StudioFolder {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("folder name is required");
    const existing = this.getFolderRow(id);
    if (!existing) throw new Error(`folder not found: ${id}`);
    const now = Date.now();
    this.db.prepare(`UPDATE studio_folders SET name = ?, updated_at = ? WHERE id = ?`).run(trimmed, now, id);
    const mapped = rowToFolder({ ...existing, name: trimmed, updated_at: now });
    if (!mapped) throw new Error(`folder not found: ${id}`);
    return mapped;
  }

  moveFolder(id: string, newParentId: string | null): StudioFolder {
    const existing = this.getFolderRow(id);
    if (!existing) throw new Error(`folder not found: ${id}`);
    if (newParentId === id) throw new Error("cannot move folder into itself");
    if (newParentId !== null) {
      const parent = this.getFolderRow(newParentId);
      if (!parent) throw new Error(`new parent folder not found: ${newParentId}`);
      if (parent.pillar !== existing.pillar) throw new Error("parent folder pillar mismatch");
      if (this.isAncestor(id, newParentId)) {
        throw new Error("cannot move folder into its own descendant");
      }
    }
    const now = Date.now();
    this.db
      .prepare(`UPDATE studio_folders SET parent_id = ?, updated_at = ? WHERE id = ?`)
      .run(newParentId, now, id);
    const mapped = rowToFolder({ ...existing, parent_id: newParentId, updated_at: now });
    if (!mapped) throw new Error(`folder not found: ${id}`);
    return mapped;
  }

  deleteFolder(id: string): void {
    const existing = this.getFolderRow(id);
    if (!existing) return;
    this.db.prepare(`DELETE FROM studio_folders WHERE id = ?`).run(id);
  }

  getFolder(id: string): StudioFolder | null {
    const row = this.getFolderRow(id);
    return row ? rowToFolder(row) : null;
  }

  createSession(input: CreateStudioSessionInput): StudioSession {
    const pillar = assertPillar(input.pillar);
    const title = input.title.trim();
    if (!title) throw new Error("session title is required");
    if (!input.modelId.trim()) throw new Error("session modelId is required");
    if (input.folderId !== null) {
      const folder = this.getFolderRow(input.folderId);
      if (!folder) throw new Error(`folder not found: ${input.folderId}`);
      if (folder.pillar !== pillar) throw new Error("folder pillar mismatch");
    }
    const id = randomUUID();
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO studio_sessions
           (id, pillar, folder_id, title, model_id, last_output_ref, extra_json, created_at, updated_at, turn_count)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, 0)`,
      )
      .run(id, pillar, input.folderId, title, input.modelId.trim(), now, now);
    return {
      id,
      pillar,
      folderId: input.folderId,
      title,
      modelId: input.modelId.trim(),
      lastOutputRef: null,
      createdAt: now,
      updatedAt: now,
      turnCount: 0,
    };
  }

  renameSession(id: string, title: string): StudioSession {
    const trimmed = title.trim();
    if (!trimmed) throw new Error("session title is required");
    const existing = this.getSessionRow(id);
    if (!existing) throw new Error(`session not found: ${id}`);
    const now = Date.now();
    this.db.prepare(`UPDATE studio_sessions SET title = ?, updated_at = ? WHERE id = ?`).run(trimmed, now, id);
    const mapped = rowToSession({ ...existing, title: trimmed, updated_at: now });
    if (!mapped) throw new Error(`session not found: ${id}`);
    return mapped;
  }

  moveSession(id: string, newFolderId: string | null): StudioSession {
    const existing = this.getSessionRow(id);
    if (!existing) throw new Error(`session not found: ${id}`);
    if (newFolderId !== null) {
      const folder = this.getFolderRow(newFolderId);
      if (!folder) throw new Error(`folder not found: ${newFolderId}`);
      if (folder.pillar !== existing.pillar) throw new Error("folder pillar mismatch");
    }
    const now = Date.now();
    this.db
      .prepare(`UPDATE studio_sessions SET folder_id = ?, updated_at = ? WHERE id = ?`)
      .run(newFolderId, now, id);
    const mapped = rowToSession({ ...existing, folder_id: newFolderId, updated_at: now });
    if (!mapped) throw new Error(`session not found: ${id}`);
    return mapped;
  }

  deleteSession(id: string): void {
    this.db.prepare(`DELETE FROM studio_sessions WHERE id = ?`).run(id);
  }

  archiveSession(id: string, archivedAt = Date.now()): StudioSession {
    const tx = this.db.transaction(() => {
      const existing = this.getSessionRow(id);
      if (!existing) throw new Error(`session not found: ${id}`);
      if (existing.archived_at != null) {
        const mapped = rowToSession(existing);
        if (!mapped) throw new Error(`session not found: ${id}`);
        return mapped;
      }
      this.db
        .prepare(
          `UPDATE studio_sessions
              SET archived_folder_id = folder_id, folder_id = NULL, archived_at = ?, updated_at = ?
            WHERE id = ?`,
        )
        .run(archivedAt, archivedAt, id);
      const mapped = rowToSession({
        ...existing,
        folder_id: null,
        archived_folder_id: existing.folder_id,
        archived_at: archivedAt,
        updated_at: archivedAt,
      });
      if (!mapped) throw new Error(`session not found: ${id}`);
      return mapped;
    });
    return tx();
  }

  restoreSession(id: string): { session: StudioSession; parentFallback: boolean } {
    const tx = this.db.transaction(() => {
      const existing = this.getSessionRow(id);
      if (!existing || existing.archived_at == null) throw new Error(`archived session not found: ${id}`);
      const archivedFolderId = existing.archived_folder_id ?? existing.folder_id;
      const parent = archivedFolderId === null ? null : this.getFolderRow(archivedFolderId);
      const parentFallback = archivedFolderId !== null && parent === undefined;
      const folderId = parentFallback ? null : archivedFolderId;
      const now = Date.now();
      this.db
        .prepare(
          `UPDATE studio_sessions
              SET folder_id = ?, archived_folder_id = NULL, archived_at = NULL, updated_at = ?
            WHERE id = ?`,
        )
        .run(folderId, now, id);
      const mapped = rowToSession({
        ...existing,
        folder_id: folderId,
        archived_folder_id: null,
        archived_at: null,
        updated_at: now,
      });
      if (!mapped) throw new Error(`session not found: ${id}`);
      return { session: mapped, parentFallback };
    });
    return tx();
  }

  listArchivedSessions(pillar?: StudioPillar): readonly import("./StudioSessionStore.types.js").ArchivedStudioSession[] {
    const rows = pillar
      ? (this.db
          .prepare(`SELECT * FROM studio_sessions WHERE archived_at IS NOT NULL AND pillar = ? ORDER BY archived_at DESC, title ASC`)
          .all(pillar) as SessionRow[])
      : (this.db
          .prepare(`SELECT * FROM studio_sessions WHERE archived_at IS NOT NULL ORDER BY archived_at DESC, title ASC`)
          .all() as SessionRow[]);
    return rows
      .map(rowToSession)
      .filter((session): session is import("./StudioSessionStore.types.js").ArchivedStudioSession => session?.archivedAt != null);
  }

  getSession(id: string): StudioSession | null {
    const row = this.getSessionRow(id);
    return row && row.archived_at == null ? rowToSession(row) : null;
  }

  /** Scoped recipe work shares this owner's connection, transaction and deletion. */
  withImageRecipe<T>(sessionId: string, turnId: string, operation: (scope: StudioImageRecipeScope) => T): T {
    return this.db.transaction(() => {
      const session = this.getSession(sessionId);
      const row = this.db.prepare(
        "SELECT * FROM studio_turns WHERE id = ? AND session_id = ?",
      ).get(turnId, sessionId) as TurnRow | undefined;
      const turn = row ? rowToTurn(row) : null;
      if (!session || session.pillar !== "image" || !turn?.mediaRef) {
        throw new ImageEditError("IMAGE_NOT_FOUND", "The persisted Image Studio image is unavailable.");
      }
      const stored = this.db.prepare(
        "SELECT revision, source_sha256, recipe_json FROM studio_image_edit_recipes WHERE turn_id = ? AND session_id = ?",
      ).get(turnId, sessionId) as { revision: number; source_sha256: string; recipe_json: string } | undefined;
      let committed = false;
      const result = operation({
        turn,
        recipeJson: stored?.recipe_json ?? null,
        storedRevision: stored?.revision ?? 0,
        storedSourceSha256: stored?.source_sha256 ?? null,
        checkpoints: (beforeId) => this.db.prepare(`
          SELECT id, json_extract(checkpoint_json, '$.createdAt') AS createdAt,
            json_extract(checkpoint_json, '$.callerId') AS callerId, json_extract(checkpoint_json, '$.runId') AS runId,
            json_extract(checkpoint_json, '$.recipe.revision') AS revision, json_extract(checkpoint_json, '$.recipe.cursor') AS cursor,
            json_array_length(checkpoint_json, '$.recipe.commands') AS commands
          FROM studio_image_edit_checkpoints WHERE turn_id = ? AND session_id = ?
            AND (? IS NULL OR rowid < (SELECT rowid FROM studio_image_edit_checkpoints WHERE id = ? AND turn_id = ? AND session_id = ?))
          ORDER BY rowid DESC LIMIT 50
        `).all(turnId, sessionId, beforeId ?? null, beforeId ?? null, turnId, sessionId) as ImageEditCheckpointSummary[],
        findCheckpoint: (id) => {
          const checkpoint = this.db.prepare("SELECT checkpoint_json FROM studio_image_edit_checkpoints WHERE id = ? AND turn_id = ? AND session_id = ?")
            .get(id, turnId, sessionId) as { checkpoint_json: string } | undefined;
          return checkpoint ? JSON.parse(checkpoint.checkpoint_json) as ImageEditCheckpoint : null;
        },
        checkpoint: (input) => {
          const recipe = parseImageEditRecipe(input.recipe);
          if (recipe.identity.studioSessionId !== sessionId || recipe.identity.studioTurnId !== turnId) {
            throw new ImageEditError("REVISION_CONFLICT", "The recovery checkpoint does not match the current image.");
          }
          const existing = this.db.prepare("SELECT checkpoint_json FROM studio_image_edit_checkpoints WHERE id = ?")
            .get(input.id) as { checkpoint_json: string } | undefined;
          if (existing) {
            const previous = JSON.parse(existing.checkpoint_json) as ImageEditCheckpoint;
            if (previous.requestId !== input.requestId || previous.approvalId !== input.approvalId
              || previous.callerId !== input.callerId || previous.runId !== input.runId
              || JSON.stringify(previous.recipe.identity) !== JSON.stringify(recipe.identity)) {
              throw new ImageEditError("FORBIDDEN", "The checkpoint belongs to another approval.");
            }
            return previous;
          }
          if (recipe.revision !== (stored?.revision ?? 0)) {
            throw new ImageEditError("REVISION_CONFLICT", "The recovery checkpoint does not match the current image.");
          }
          const checkpoint = { ...input, recipe };
          this.db.prepare("INSERT INTO studio_image_edit_checkpoints (id, turn_id, session_id, checkpoint_json) VALUES (?, ?, ?, ?)")
            .run(input.id, turnId, sessionId, JSON.stringify(checkpoint));
          return checkpoint;
        },
        commit: (input, expectedRevision) => {
          const recipe = parseImageEditRecipe(input);
          if (committed || !Number.isSafeInteger(expectedRevision)
            || expectedRevision !== (stored?.revision ?? 0) || recipe.revision !== expectedRevision + 1) {
            throw new ImageEditError("REVISION_CONFLICT", "The image recipe revision is stale.");
          }
          if (recipe.identity.studioSessionId !== sessionId || recipe.identity.studioTurnId !== turnId) {
            throw new ImageEditError("FORBIDDEN", "The recipe belongs to another image.");
          }
          if (stored) {
            const changed = this.db.prepare(
              "UPDATE studio_image_edit_recipes SET source_sha256 = ?, revision = ?, recipe_json = ? WHERE turn_id = ? AND session_id = ? AND revision = ?",
            ).run(recipe.identity.sourceSha256, recipe.revision, JSON.stringify(recipe), turnId, sessionId, expectedRevision);
            if (changed.changes !== 1) throw new ImageEditError("REVISION_CONFLICT", "The image recipe revision is stale.");
          } else {
            this.db.prepare(
              "INSERT INTO studio_image_edit_recipes (turn_id, session_id, source_sha256, revision, recipe_json) VALUES (?, ?, ?, ?, ?)",
            ).run(turnId, sessionId, recipe.identity.sourceSha256, recipe.revision, JSON.stringify(recipe));
          }
          committed = true;
        },
      });
      if (result instanceof Promise) throw new ImageEditError("STORAGE_UNAVAILABLE", "Recipe transactions must be synchronous.");
      return result;
    })();
  }

  appendTurn(input: AppendStudioTurnInput): StudioTurn {
    const existing = this.getSessionRow(input.sessionId);
    if (!existing) throw new Error(`session not found: ${input.sessionId}`);
    const mediaRef = assertPathRef(input.mediaRef);
    const now = input.createdAt ?? Date.now();
    const id = input.id ?? randomUUID();
    const extraJson = turnUsageExtraJson(input);
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO studio_turns
             (id, session_id, role, content, media_ref, extra_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(id, input.sessionId, input.role, input.content, mediaRef, extraJson, now);
      if (input.role === "assistant" && mediaRef) {
        this.db
          .prepare(
            `UPDATE studio_sessions
               SET turn_count = turn_count + 1, last_output_ref = ?, updated_at = ?
             WHERE id = ?`,
          )
          .run(mediaRef, now, input.sessionId);
      } else {
        this.db
          .prepare(
            `UPDATE studio_sessions
               SET turn_count = turn_count + 1, updated_at = ?
             WHERE id = ?`,
          )
          .run(now, input.sessionId);
      }
    });
    tx();
    return {
      id,
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      mediaRef,
      createdAt: now,
      inputTokens: input.inputTokens,
      reasoningTokens: input.reasoningTokens,
      reasoningText: input.reasoningText
        ? redactSecrets(input.reasoningText).slice(0, 65_536)
        : input.reasoningText,
      outputTokens: input.outputTokens,
      tokensEstimated: input.tokensEstimated,
      requestUsage: input.requestUsage,
      messageUsage: input.messageUsage,
      visualUnits: input.visualUnits,
    };
  }

  listTurns(sessionId: string, limit = 500): readonly StudioTurn[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM studio_turns WHERE session_id = ?
         ORDER BY created_at ASC, rowid ASC LIMIT ?`,
      )
      .all(sessionId, limit) as TurnRow[];
    const out: StudioTurn[] = [];
    for (const row of rows) {
      const mapped = rowToTurn(row);
      if (mapped) out.push(mapped);
      else console.warn(`studio-session: skipping corrupt turn ${row.id}`);
    }
    return out;
  }

  listTree(pillar: StudioPillar): StudioTreeNode {
    assertPillar(pillar);
    const folderRows = this.db
      .prepare<unknown[], FolderRow>(
        `SELECT * FROM studio_folders WHERE pillar = ? ORDER BY name ASC`,
      )
      .all(pillar);
    const sessionRows = this.db
      .prepare<unknown[], SessionRow>(
        `SELECT * FROM studio_sessions WHERE pillar = ? AND archived_at IS NULL ORDER BY created_at DESC, title ASC`,
      )
      .all(pillar);
    const byParent = new Map<string | null, StudioFolder[]>();
    for (const row of folderRows) {
      const folder = rowToFolder(row);
      if (!folder) {
        console.warn(`studio-session: skipping corrupt folder ${row.id}`);
        continue;
      }
      const bucket = byParent.get(folder.parentId) ?? [];
      bucket.push(folder);
      byParent.set(folder.parentId, bucket);
    }
    const sessionsByFolder = new Map<string | null, StudioSession[]>();
    for (const row of sessionRows) {
      const session = rowToSession(row);
      if (!session) {
        console.warn(`studio-session: skipping corrupt session ${row.id}`);
        continue;
      }
      const bucket = sessionsByFolder.get(session.folderId) ?? [];
      bucket.push(session);
      sessionsByFolder.set(session.folderId, bucket);
    }
    const buildNode = (folder: StudioFolder | null): StudioTreeNode => {
      const parentKey = folder?.id ?? null;
      return {
        folder,
        children: (byParent.get(parentKey) ?? []).map((child) => buildNode(child)),
        sessions: sessionsByFolder.get(parentKey) ?? [],
      };
    };
    return buildNode(null);
  }

  ancestors(folderId: string | null): readonly StudioFolder[] {
    const chain: StudioFolder[] = [];
    let cursor: string | null = folderId;
    const seen = new Set<string>();
    while (cursor !== null) {
      if (seen.has(cursor)) break;
      seen.add(cursor);
      const row = this.getFolderRow(cursor);
      if (!row) break;
      const mapped = rowToFolder(row);
      if (!mapped) break;
      chain.push(mapped);
      cursor = row.parent_id;
    }
    return chain.reverse();
  }

  /** Test seam: write a raw extra_json blob (used to prove corrupt rows are skipped). */
  unsafeSetSessionExtraJson(id: string, extraJson: string): void {
    this.db.prepare(`UPDATE studio_sessions SET extra_json = ? WHERE id = ?`).run(extraJson, id);
  }

  private getFolderRow(id: string): FolderRow | undefined {
    return this.db.prepare<[string], FolderRow>(`SELECT * FROM studio_folders WHERE id = ?`).get(id);
  }

  private getSessionRow(id: string): SessionRow | undefined {
    return this.db.prepare<[string], SessionRow>(`SELECT * FROM studio_sessions WHERE id = ?`).get(id);
  }

  private isAncestor(ancestorId: string, maybeDescendantId: string): boolean {
    let cursor: string | null = maybeDescendantId;
    const seen = new Set<string>();
    while (cursor !== null) {
      if (seen.has(cursor)) return false;
      seen.add(cursor);
      const row = this.getFolderRow(cursor);
      if (!row) return false;
      if (row.parent_id === ancestorId) return true;
      cursor = row.parent_id;
    }
    return false;
  }
}
