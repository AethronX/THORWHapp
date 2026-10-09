import type { Db, DbExecutor } from './db';

/**
 * Schema versioning via `PRAGMA user_version`. Bump SCHEMA_VERSION and append
 * a step to MIGRATIONS for every change; never edit a shipped step.
 */
export const SCHEMA_VERSION = 1;

/** [key, iconCode, isEssential] — key is localised in the UI. */
export const DEFAULT_CATEGORIES: ReadonlyArray<[string, number, boolean]> = [
  ['housing', 0, true],
  ['food', 1, true],
  ['transport', 2, true],
  ['utilities', 3, true],
  ['telecom', 4, true],
  ['health', 5, true],
  ['education', 6, false],
  ['family', 7, false],
  ['shopping', 8, false],
  ['entertainment', 9, false],
  ['debt', 10, true],
  ['other', 11, false],
];

async function v1(db: DbExecutor) {
  await db.exec(`
    CREATE TABLE settings (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE categories (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      key          TEXT UNIQUE,
      name         TEXT,
      icon_code    INTEGER NOT NULL DEFAULT 11,
      is_essential INTEGER NOT NULL DEFAULT 0 CHECK (is_essential IN (0, 1)),
      archived     INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
      sort_order   INTEGER NOT NULL DEFAULT 0,
      CHECK (key IS NOT NULL OR (name IS NOT NULL AND length(trim(name)) > 0))
    );
    CREATE TABLE expenses (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      day          TEXT NOT NULL CHECK (length(day) = 10),
      note         TEXT NOT NULL DEFAULT '',
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );
    CREATE INDEX idx_expenses_day ON expenses(day);
    CREATE INDEX idx_expenses_category ON expenses(category_id);
    CREATE TABLE incomes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      month        TEXT NOT NULL CHECK (length(month) = 7),
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      label        TEXT NOT NULL DEFAULT '',
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );
    CREATE INDEX idx_incomes_month ON incomes(month);
    CREATE TABLE budgets (
      category_id INTEGER PRIMARY KEY NOT NULL
                  REFERENCES categories(id) ON DELETE CASCADE,
      limit_minor INTEGER NOT NULL CHECK (limit_minor > 0)
    );
    CREATE TABLE goals (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL CHECK (length(trim(name)) > 0),
      target_minor INTEGER NOT NULL CHECK (target_minor > 0),
      target_day   TEXT NOT NULL CHECK (length(target_day) = 10),
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );
    CREATE TABLE goal_contributions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id      INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      amount_minor INTEGER NOT NULL CHECK (amount_minor <> 0),
      day          TEXT NOT NULL CHECK (length(day) = 10),
      created_at   INTEGER NOT NULL
    );
    CREATE INDEX idx_contrib_goal ON goal_contributions(goal_id);
  `);
  let order = 0;
  for (const [key, icon, essential] of DEFAULT_CATEGORIES) {
    await db.run(
      'INSERT INTO categories (key, icon_code, is_essential, sort_order) VALUES (?, ?, ?, ?)',
      [key, icon, essential ? 1 : 0, order++],
    );
  }
}

const MIGRATIONS: Record<number, (db: DbExecutor) => Promise<void>> = { 1: v1 };

export class NewerSchemaError extends Error {
  constructor(readonly found: number) {
    super(`Database schema v${found} is newer than this app (v${SCHEMA_VERSION}).`);
    this.name = 'NewerSchemaError';
  }
}

/**
 * Brings the database to SCHEMA_VERSION inside one transaction. A database
 * written by a newer app version is refused, never wiped.
 */
export async function migrate(db: Db): Promise<void> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > SCHEMA_VERSION) throw new NewerSchemaError(current);
  if (current === SCHEMA_VERSION) return;
  await db.transaction(async (tx) => {
    for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
      const step = MIGRATIONS[v];
      if (!step) throw new Error(`Missing migration to v${v}`);
      await step(tx);
    }
    await tx.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
}
