import * as SQLite from 'expo-sqlite';

import type { Db, DbDriver, DbExecutor, SqlValue } from './db';

export const DATABASE_NAME = 'tharwati.db';

function wrap(db: SQLite.SQLiteDatabase): DbExecutor {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params: SqlValue[] = []) => {
      const r = await db.runAsync(sql, params);
      return { lastInsertRowId: r.lastInsertRowId, changes: r.changes };
    },
    all: <T>(sql: string, params: SqlValue[] = []) => db.getAllAsync<T>(sql, params),
    first: <T>(sql: string, params: SqlValue[] = []) => db.getFirstAsync<T>(sql, params),
  };
}

/** expo-sqlite driver (works in Expo Go and in standalone builds). */
export const expoDbDriver: DbDriver = {
  async open(): Promise<Db> {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await db.execAsync('PRAGMA foreign_keys = ON;');
    return {
      ...wrap(db),
      async transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
        let result: T | undefined;
        // Exclusive: queries inside run on `txn` only, so nothing else can
        // interleave with the transaction.
        await db.withExclusiveTransactionAsync(async (txn) => {
          result = await fn(wrap(txn));
        });
        return result as T;
      },
      close: () => db.closeAsync(),
    };
  },
  destroy: () => SQLite.deleteDatabaseAsync(DATABASE_NAME),
};
