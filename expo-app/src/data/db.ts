/**
 * Minimal database contract used by the repository. Implemented by
 * `expoDb.ts` (expo-sqlite, on device / in Expo Go) and by a sql.js adapter in
 * tests, so all SQL is exercised against a real SQLite engine.
 */
export type SqlValue = string | number | null;

export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface DbExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<RunResult>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
}

export interface Db extends DbExecutor {
  /** Runs `fn` atomically: commits if it resolves, rolls back if it throws. */
  transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** Opens and permanently deletes the app database. */
export interface DbDriver {
  open(): Promise<Db>;
  /** Deletes the database file. The DB must be closed first. */
  destroy(): Promise<void>;
}
