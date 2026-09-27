/**
 * Shared rules for conversation branches.
 *
 * A branch is a new session row that cites a parent session and the message
 * it split from. These helpers are pure so both chat stores can enforce the
 * same depth, cycle, and delete rules.
 */

export const MAX_BRANCH_DEPTH = 8;

export class BranchCycleError extends Error {
  constructor(message = "branch cycle rejected") {
    super(message);
    this.name = "BranchCycleError";
  }
}

export class BranchDepthError extends Error {
  constructor(message = `branch depth exceeds ${MAX_BRANCH_DEPTH}`) {
    super(message);
    this.name = "BranchDepthError";
  }
}

export class NewerSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NewerSchemaError";
  }
}

export interface BranchChain {
  readonly rootId: string;
  readonly depth: number;
}

/**
 * Walk parent links iteratively. A repeated id is a cycle. A chain longer
 * than the depth cap is rejected rather than followed further.
 */
export function describeChain(
  startId: string,
  parentOf: (id: string) => string | null,
): BranchChain {
  const seen = new Set<string>();
  let current = startId;
  let depth = 0;
  for (;;) {
    if (seen.has(current)) {
      throw new BranchCycleError(`branch cycle rejected at ${current}`);
    }
    seen.add(current);
    const parent = parentOf(current);
    if (!parent) return { rootId: current, depth };
    depth += 1;
    if (depth > MAX_BRANCH_DEPTH) {
      throw new BranchDepthError();
    }
    current = parent;
  }
}

/** A new branch is one deeper than `parentId`. The parent must still be in range. */
export function assertCanBranch(
  parentId: string,
  parentOf: (id: string) => string | null,
): BranchChain {
  const chain = describeChain(parentId, parentOf);
  if (chain.depth >= MAX_BRANCH_DEPTH) {
    throw new BranchDepthError();
  }
  return chain;
}

interface SqlExec {
  exec(sql: string): void;
}

/**
 * Refuse to delete a session that still has branches, and refuse to delete
 * a message that is still a branch point. RESTRICT, not CASCADE: messages
 * already cascade from their session, and a self-referencing cascade would
 * delete every descendant when one row goes.
 *
 * Table and column names are fixed store identifiers, never user input.
 */
export function installBranchDeleteGuards(
  db: SqlExec,
  spec: {
    readonly sessionTable: string;
    readonly messageTable: string;
    readonly parentSessionColumn: string;
    readonly parentMessageColumn: string;
  },
): void {
  const { sessionTable, messageTable, parentSessionColumn, parentMessageColumn } = spec;
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS ${sessionTable}_branch_parent_restrict
    BEFORE DELETE ON ${sessionTable}
    WHEN EXISTS (
      SELECT 1 FROM ${sessionTable} AS child
      WHERE child.${parentSessionColumn} = OLD.id
    )
    BEGIN
      SELECT RAISE(ABORT, 'cannot delete a thread that still has branches');
    END;

    CREATE TRIGGER IF NOT EXISTS ${messageTable}_branch_point_restrict
    BEFORE DELETE ON ${messageTable}
    WHEN EXISTS (
      SELECT 1 FROM ${sessionTable} AS child
      WHERE child.${parentMessageColumn} = OLD.id
    )
    BEGIN
      SELECT RAISE(ABORT, 'cannot delete a message that is a branch point');
    END;
  `);
}
