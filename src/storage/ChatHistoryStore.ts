import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import type { Message, ConversationSession, Role } from "../../modules/coding/chat/types.js";
import { escapeLikePattern } from "./likeEscape.js";
import { secureDbPermissions } from "./dbPermissions.js";
import { sanitizeFtsQuery } from "./embeddingUtils.js";
import { createFtsTableAndTriggers } from "./sqliteFts.js";
import {
  assertCanBranch,
  describeChain,
  installBranchDeleteGuards,
  NewerSchemaError,
} from "../../core/chat/branchPolicy.js";
import {
  assertNotHalfMigrated,
  clearMigrationPending,
  databaseFilePath,
  markMigrationPending,
  needsMigration,
  snapshotBeforeMigration,
  userVersion,
} from "../../core/storage/preMigrationSnapshot.js";

export { NewerSchemaError };

/**
 * Test-only. Set `fault` to throw inside the next schema migration so a
 * caller can prove the original rows survive a rollback.
 */
export const chatHistoryMigrationTest: { fault: (() => void) | null } = { fault: null };

interface SessionRow {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  forked_from_session_id?: string | null;
  forked_from_message_id?: string | null;
  active_leaf_session_id?: string | null;
}

// Schema version persisted via PRAGMA user_version. Bump when the schema or
// FTS configuration changes so the next cold start rebuilds the FTS index
// exactly once. Rebuilds on an unchanged DB are now a no-op.
// v0.9.0 Phase 2.8 (from v0.8.0 known-gaps 10.O.Y): bumped to 2 to add the
// `tool_call_bytes` table.
const SCHEMA_VERSION = 3;

/** Default cap on rows returned by searchSessions -- see 4.6. */
const DEFAULT_SEARCH_LIMIT = 100;

interface MessageRow {
  id: string;
  role: string;
  content: string;
  timestamp: number;
}

export class ChatHistoryStore {
  private readonly _db: Database.Database;

  constructor(dbPath: string) {
    this._db = new Database(dbPath);
    try {
      secureDbPermissions(dbPath);
      this._db.pragma("journal_mode = WAL");
      this._db.pragma("foreign_keys = ON");
      this._db.pragma("busy_timeout = 1000");
      this._initSchema();
    } catch (err) {
      this._db.close();
      throw err;
    }
  }

  private _initSchema(): void {
    const filePath = databaseFilePath(this._db);
    assertNotHalfMigrated(filePath);
    const version = userVersion(this._db);
    if (version > SCHEMA_VERSION) {
      throw new NewerSchemaError(
        `Database ${filePath ?? "(memory)"} was written by a newer version (user_version ${version}, this build expects ${SCHEMA_VERSION}). Refusing to open rather than downgrading.`,
      );
    }
    const pending = needsMigration(this._db, SCHEMA_VERSION);
    if (pending) {
      snapshotBeforeMigration(this._db, SCHEMA_VERSION);
      markMigrationPending(filePath);
    }
    const apply = (): void => {
      this._applySchema();
      if (chatHistoryMigrationTest.fault) {
        const fault = chatHistoryMigrationTest.fault;
        chatHistoryMigrationTest.fault = null;
        fault();
      }
      if (pending) this._db.pragma(`user_version = ${SCHEMA_VERSION}`);
    };
    if (pending) {
      const previousTimeout = Number(this._db.pragma("busy_timeout", { simple: true }) ?? 0);
      this._db.pragma("busy_timeout = 200");
      try {
        this._db.exec("BEGIN IMMEDIATE");
        apply();
        this._db.exec("COMMIT");
        clearMigrationPending(filePath);
      } catch (err) {
        try {
          this._db.exec("ROLLBACK");
        } catch {
          // A failed BEGIN has nothing to roll back.
        }
        throw err;
      } finally {
        this._db.pragma(`busy_timeout = ${previousTimeout}`);
      }
      return;
    }
    apply();
  }

  private _applySchema(): void {
    this._db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant')),
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, timestamp);
      -- v0.9.0 Phase 2.8 (from v0.8.0 known-gaps 10.O.Y): exact rendered
      -- bytes for each tool call. RegenerateFromSource / CompactionStrategy
      -- prefer stored bytes by call_id when available so replay re-emits
      -- the operator-visible output verbatim.
      CREATE TABLE IF NOT EXISTS tool_call_bytes (
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        call_id TEXT NOT NULL,
        bytes BLOB NOT NULL,
        ts INTEGER NOT NULL,
        PRIMARY KEY (session_id, call_id)
      );
      CREATE INDEX IF NOT EXISTS idx_tool_call_bytes_session ON tool_call_bytes(session_id, ts);
    `);
    this._addColumnIfMissing("sessions", "forked_from_session_id", "TEXT");
    this._addColumnIfMissing("sessions", "forked_from_message_id", "TEXT");
    this._addColumnIfMissing("sessions", "active_leaf_session_id", "TEXT");
    installBranchDeleteGuards(this._db, {
      sessionTable: "sessions",
      messageTable: "messages",
      parentSessionColumn: "forked_from_session_id",
      parentMessageColumn: "forked_from_message_id",
    });

    createFtsTableAndTriggers(this._db, {
      ftsTable: "messages_fts",
      contentTable: "messages",
      columns: ["content"],
      triggerPrefix: "messages_fts",
    });

    // Rebuild the FTS index only when the schema version changed. On a hot DB
    // this used to iterate every row on every cold start (review finding
    // #66); now it runs once per schema bump.
    if (needsMigration(this._db, SCHEMA_VERSION)) {
      try {
        this._db.exec("INSERT INTO messages_fts(messages_fts) VALUES('rebuild')");
      } catch {
        // Ignore rebuild errors on first creation.
      }
    }
  }

  createSession(title: string): ConversationSession {
    const id = randomUUID();
    const now = Date.now();
    this._db
      .prepare(
        "INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)"
      )
      .run(id, title, now, now);
    return {
      id,
      title,
      messages: [],
      createdAt: now,
      updatedAt: now,
      forkedFromSessionId: null,
      forkedFromMessageId: null,
      activeLeafSessionId: id,
      parentUnresolved: false,
    };
  }

  saveMessage(sessionId: string, message: Message): void {
    // Use explicit UPDATE-or-INSERT so the FTS5 AFTER UPDATE trigger fires on
    // re-saves. INSERT OR REPLACE bypasses DELETE/UPDATE triggers in SQLite,
    // which left the FTS index stale on edits (review finding #3).
    const existing = this._db
      .prepare("SELECT id FROM messages WHERE id = ?")
      .get(message.id) as { id: string } | undefined;
    if (existing) {
      this._db
        .prepare(
          "UPDATE messages SET session_id = ?, role = ?, content = ?, timestamp = ? WHERE id = ?"
        )
        .run(sessionId, message.role, message.content, message.timestamp, message.id);
    } else {
      this._db
        .prepare(
          "INSERT INTO messages (id, session_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)"
        )
        .run(message.id, sessionId, message.role, message.content, message.timestamp);
    }
    this._db
      .prepare("UPDATE sessions SET updated_at = ? WHERE id = ?")
      .run(Date.now(), sessionId);
  }

  updateSessionTitle(sessionId: string, title: string): void {
    this._db
      .prepare("UPDATE sessions SET title = ? WHERE id = ?")
      .run(title, sessionId);
  }

  getSession(sessionId: string): ConversationSession | null {
    const row = this._db
      .prepare(
        `SELECT id, title, created_at, updated_at,
                forked_from_session_id, forked_from_message_id, active_leaf_session_id
         FROM sessions WHERE id = ?`
      )
      .get(sessionId) as SessionRow | undefined;

    if (!row) return null;

    const msgRows = this._db
      .prepare(
        "SELECT id, role, content, timestamp FROM messages WHERE session_id = ? ORDER BY timestamp ASC"
      )
      .all(sessionId) as MessageRow[];

    const chain = this._chain(row.id);
    const root = this._sessionPointer(chain.rootId);
    const parentMissing = Boolean(
      row.forked_from_session_id && !this._sessionPointer(row.forked_from_session_id),
    );
    return {
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      forkedFromSessionId: row.forked_from_session_id ?? null,
      forkedFromMessageId: row.forked_from_message_id ?? null,
      activeLeafSessionId: root?.active_leaf_session_id ?? chain.rootId,
      parentUnresolved: parentMissing,
      messages: msgRows.map((m) => ({
        id: m.id,
        role: m.role as Role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    };
  }

  /**
   * Branch `sessionId` at `messageId`. The new session keeps the prefix
   * through that message and becomes the family's active leaf.
   */
  forkFromMessage(sessionId: string, messageId: string): ConversationSession {
    const source = this.getSession(sessionId);
    if (!source) throw new Error(`session not found: ${sessionId}`);
    const splitAt = source.messages.findIndex((message) => message.id === messageId);
    if (splitAt < 0) throw new Error(`message not found: ${messageId}`);
    assertCanBranch(sessionId, (id) => this._parentSessionId(id));
    const rootId = describeChain(sessionId, (id) => this._parentSessionId(id)).rootId;
    const id = randomUUID();
    const now = Date.now();
    const title = `${source.title} (branch)`;
    const prefix = source.messages.slice(0, splitAt + 1);
    this._immediate(() => {
      this._db
        .prepare(
          `INSERT INTO sessions (
             id, title, created_at, updated_at,
             forked_from_session_id, forked_from_message_id, active_leaf_session_id
           ) VALUES (?, ?, ?, ?, ?, ?, NULL)`,
        )
        .run(id, title, now, now, sessionId, messageId);
      const insert = this._db.prepare(
        "INSERT INTO messages (id, session_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)",
      );
      for (const message of prefix) {
        insert.run(randomUUID(), id, message.role, message.content, message.timestamp);
      }
      this._db
        .prepare("UPDATE sessions SET active_leaf_session_id = ?, updated_at = ? WHERE id = ?")
        .run(id, now, rootId);
    });
    const created = this.getSession(id);
    if (!created) throw new Error("branch was not persisted");
    return created;
  }

  setActiveLeaf(sessionId: string, leafSessionId: string): void {
    const rootId = describeChain(sessionId, (id) => this._parentSessionId(id)).rootId;
    const leafRoot = describeChain(leafSessionId, (id) => this._parentSessionId(id)).rootId;
    if (leafRoot !== rootId) throw new Error("active leaf is not in this thread family");
    this._db
      .prepare("UPDATE sessions SET active_leaf_session_id = ? WHERE id = ?")
      .run(leafSessionId, rootId);
  }

  listBranchFamily(sessionId: string): ConversationSession[] {
    const rootId = describeChain(sessionId, (id) => this._parentSessionId(id)).rootId;
    const rows = this._db
      .prepare("SELECT id, forked_from_session_id FROM sessions")
      .all() as Array<{ id: string; forked_from_session_id: string | null }>;
    const members: string[] = [];
    for (const row of rows) {
      try {
        const chain = describeChain(row.id, (id) => {
          const found = rows.find((candidate) => candidate.id === id);
          return found?.forked_from_session_id ?? null;
        });
        if (chain.rootId === rootId) members.push(row.id);
      } catch (err) {
        if (err instanceof Error && err.name === "BranchCycleError") throw err;
        throw err;
      }
    }
    return members
      .map((id) => this.getSession(id))
      .filter((session): session is ConversationSession => session !== null);
  }

  deleteMessage(messageId: string): void {
    this._db.prepare("DELETE FROM messages WHERE id = ?").run(messageId);
  }

  listSessions(limit = 50): ConversationSession[] {
    const rows = this._db
      .prepare(
        "SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC LIMIT ?"
      )
      .all(limit) as SessionRow[];

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      messages: [],
    }));
  }

  deleteSession(sessionId: string): void {
    this._db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  }

  searchSessions(query: string, limit = DEFAULT_SEARCH_LIMIT): ConversationSession[] {
    // Prefer FTS5 (indexed, milliseconds on 10k rows). Falls back to the
    // legacy LIKE join if the FTS query is unusable (empty after sanitize,
    // or FTS5 not available on the running SQLite build).
    const ftsQuery = sanitizeFtsQuery(query);
    if (ftsQuery) {
      try {
        const rows = this._db
          .prepare(
            `SELECT DISTINCT s.id, s.title, s.created_at, s.updated_at
             FROM sessions s
             JOIN messages m ON m.session_id = s.id
             JOIN messages_fts fts ON m.rowid = fts.rowid
             WHERE messages_fts MATCH ?
             ORDER BY s.updated_at DESC
             LIMIT ?`,
          )
          .all(ftsQuery, limit) as SessionRow[];
        return rows.map((r) => ({
          id: r.id,
          title: r.title,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          messages: [],
        }));
      } catch {
        // FTS5 unavailable -- fall through to LIKE.
      }
    }

    const likeQuery = `%${escapeLikePattern(query)}%`;
    const rows = this._db
      .prepare(
        `SELECT DISTINCT s.id, s.title, s.created_at, s.updated_at
         FROM sessions s
         JOIN messages m ON m.session_id = s.id
         WHERE m.content LIKE ? ESCAPE '\\'
         ORDER BY s.updated_at DESC
         LIMIT ?`
      )
      .all(likeQuery, limit) as SessionRow[];

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      messages: [],
    }));
  }

  /**
   * Full-text search across messages using FTS5 with BM25 ranking.
   * Falls back to LIKE search if the FTS5 query fails.
   */
  searchFts(
    query: string,
    limit = 20,
  ): Array<{ messageId: string; sessionId: string; content: string; rank: number }> {
    // Sanitize: quote each word to prevent FTS5 syntax errors.
    const ftsQuery = sanitizeFtsQuery(query);
    if (!ftsQuery) return [];

    try {
      const rows = this._db
        .prepare(
          `SELECT m.id, m.session_id, m.content, fts.rank
           FROM messages_fts fts
           JOIN messages m ON m.rowid = fts.rowid
           WHERE messages_fts MATCH ?
           ORDER BY fts.rank
           LIMIT ?`,
        )
        .all(ftsQuery, limit) as Array<{
        id: string;
        session_id: string;
        content: string;
        rank: number;
      }>;

      return rows.map((r) => ({
        messageId: r.id,
        sessionId: r.session_id,
        content: r.content,
        rank: r.rank,
      }));
    } catch {
      // Fallback to LIKE search.
      const likeQuery = `%${query}%`;
      const rows = this._db
        .prepare(
          `SELECT id, session_id, content FROM messages WHERE content LIKE ? LIMIT ?`,
        )
        .all(likeQuery, limit) as Array<{
        id: string;
        session_id: string;
        content: string;
      }>;

      return rows.map((r) => ({
        messageId: r.id,
        sessionId: r.session_id,
        content: r.content,
        rank: 0,
      }));
    }
  }

  /**
   * v0.9.0 Phase 2.8 (from v0.8.0 known-gaps 10.O.Y) -- persist the rendered
   * bytes for a tool call so subsequent replay / compaction surfaces the
   * exact same output. Upserts on (session_id, call_id).
   */
  saveToolCallBytes(sessionId: string, callId: string, bytes: string): void {
    this._db
      .prepare(
        `INSERT INTO tool_call_bytes (session_id, call_id, bytes, ts)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(session_id, call_id) DO UPDATE SET bytes = excluded.bytes, ts = excluded.ts`,
      )
      .run(sessionId, callId, bytes, Date.now());
  }

  /** v0.9.0 Phase 2.8 -- lookup. Returns null when the row does not exist. */
  getToolCallBytes(sessionId: string, callId: string): string | null {
    const row = this._db
      .prepare(
        "SELECT bytes FROM tool_call_bytes WHERE session_id = ? AND call_id = ?",
      )
      .get(sessionId, callId) as { bytes: string | Buffer } | undefined;
    if (!row) return null;
    return typeof row.bytes === "string" ? row.bytes : row.bytes.toString("utf-8");
  }

  /** v0.9.0 Phase 2.8 -- diagnostic count, used by tests + status reporter. */
  countToolCallBytes(sessionId?: string): number {
    if (sessionId) {
      const row = this._db
        .prepare("SELECT COUNT(*) AS n FROM tool_call_bytes WHERE session_id = ?")
        .get(sessionId) as { n: number };
      return row.n;
    }
    const row = this._db
      .prepare("SELECT COUNT(*) AS n FROM tool_call_bytes")
      .get() as { n: number };
    return row.n;
  }

  close(): void {
    this._db.close();
  }

  private _addColumnIfMissing(table: string, column: string, definition: string): void {
    const columns = this._db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (columns.some((entry) => entry.name === column)) return;
    this._db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }

  private _parentSessionId(sessionId: string): string | null {
    const row = this._sessionPointer(sessionId);
    return row?.forked_from_session_id ?? null;
  }

  private _sessionPointer(sessionId: string): SessionRow | undefined {
    return this._db
      .prepare(
        `SELECT id, title, created_at, updated_at,
                forked_from_session_id, forked_from_message_id, active_leaf_session_id
         FROM sessions WHERE id = ?`,
      )
      .get(sessionId) as SessionRow | undefined;
  }

  private _chain(sessionId: string): { rootId: string; depth: number } {
    return describeChain(sessionId, (id) => this._parentSessionId(id));
  }

  private _immediate(work: () => void): void {
    const previousTimeout = Number(this._db.pragma("busy_timeout", { simple: true }) ?? 0);
    this._db.pragma("busy_timeout = 200");
    try {
      this._db.exec("BEGIN IMMEDIATE");
      work();
      this._db.exec("COMMIT");
    } catch (err) {
      try {
        this._db.exec("ROLLBACK");
      } catch {
        // A failed BEGIN has nothing to roll back.
      }
      const message = err instanceof Error ? err.message : String(err);
      if (/SQLITE_BUSY|database is locked/i.test(message)) {
        throw new Error("another branch operation is in progress");
      }
      throw err;
    } finally {
      this._db.pragma(`busy_timeout = ${previousTimeout}`);
    }
  }
}
