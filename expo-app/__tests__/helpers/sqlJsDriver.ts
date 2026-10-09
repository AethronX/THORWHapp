import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

import type { Db, DbDriver, DbExecutor, SqlValue } from '../../src/data/db';

let SQL: SqlJsStatic | null = null;

async function sqlJs(): Promise<SqlJsStatic> {
  if (!SQL) SQL = await initSqlJs();
  return SQL;
}

function executor(db: Database): DbExecutor {
  const all = async <T>(sql: string, params: SqlValue[] = []): Promise<T[]> => {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  };
  return {
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params = []) => {
      db.run(sql, params);
      const id = db.exec('SELECT last_insert_rowid() AS id, changes() AS c')[0].values[0];
      return { lastInsertRowId: Number(id[0]), changes: Number(id[1]) };
    },
    all,
    first: async <T>(sql: string, params: SqlValue[] = []) => (await all<T>(sql, params))[0] ?? null,
  };
}

/**
 * In-memory SQLite (real engine, compiled to wasm) behind the app's DbDriver
 * contract. The database survives close()/open() — like a file on disk — so
 * tests can simulate restarting the app. `destroy()` deletes it.
 */
export class SqlJsDriver implements DbDriver {
  bytes: Uint8Array | null = null;
  openCount = 0;
  failDestroy = false;

  async open(): Promise<Db> {
    const S = await sqlJs();
    const db = new S.Database(this.bytes ?? undefined);
    db.exec('PRAGMA foreign_keys = ON;');
    this.openCount++;
    const ex = executor(db);
    let closed = false;
    return {
      ...ex,
      transaction: async <T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> => {
        db.exec('BEGIN');
        try {
          const r = await fn(ex);
          db.exec('COMMIT');
          return r;
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      },
      close: async () => {
        if (closed) return;
        closed = true;
        this.bytes = db.export();
        db.close();
      },
    };
  }

  async destroy() {
    if (this.failDestroy) throw new Error('simulated delete failure');
    this.bytes = null;
  }
}
