import type { Db, DbExecutor } from './db';

/**
 * Schema versioning via `PRAGMA user_version`. Bump SCHEMA_VERSION and append
 * a step to MIGRATIONS for every change; never edit a shipped step.
 */
export const SCHEMA_VERSION = 2;

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

/**
 * v2 (Tharwati 2030): obligations (debts + payments), assets for net worth,
 * and pausing a goal. Additive only — no existing row is changed.
 */
async function v2(db: DbExecutor) {
  await db.exec(`
    ALTER TABLE goals ADD COLUMN paused INTEGER NOT NULL DEFAULT 0 CHECK (paused IN (0, 1));
    CREATE TABLE debts (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      name                  TEXT NOT NULL CHECK (length(trim(name)) > 0),
      -- Outstanding amount when recorded; remaining = original - payments.
      original_minor        INTEGER NOT NULL CHECK (original_minor > 0),
      -- Annual rate in basis points (4.25 % = 425); 0 = interest-free / unknown.
      annual_rate_bp        INTEGER NOT NULL DEFAULT 0 CHECK (annual_rate_bp BETWEEN 0 AND 10000),
      monthly_payment_minor INTEGER NOT NULL DEFAULT 0 CHECK (monthly_payment_minor >= 0),
      due_day               INTEGER CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31),
      created_at            INTEGER NOT NULL,
      updated_at            INTEGER NOT NULL
    );
    CREATE TABLE debt_payments (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      debt_id      INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      day          TEXT NOT NULL CHECK (length(day) = 10),
      created_at   INTEGER NOT NULL
    );
    CREATE INDEX idx_debt_payments_debt ON debt_payments(debt_id);
    CREATE TABLE assets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
      kind        TEXT NOT NULL CHECK (kind IN ('cash', 'bank', 'investment', 'gold', 'property', 'vehicle', 'other')),
      value_minor INTEGER NOT NULL CHECK (value_minor >= 0),
      is_estimate INTEGER NOT NULL DEFAULT 0 CHECK (is_estimate IN (0, 1)),
      updated_day TEXT NOT NULL CHECK (length(updated_day) = 10),
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );
  `);
}

const MIGRATIONS: Record<number, (db: DbExecutor) => Promise<void>> = { 1: v1, 2: v2 };

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
export function migrate(db: Db): Promise<void> {
  return migrateTo(db, SCHEMA_VERSION);
}

/** Migrate up to `target` (tests use it to build an older database first). */
export async function migrateTo(db: Db, target: number): Promise<void> {
  const row = await db.first<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > SCHEMA_VERSION) throw new NewerSchemaError(current);
  if (current >= target) return;
  await db.transaction(async (tx) => {
    for (let v = current + 1; v <= target; v++) {
      const step = MIGRATIONS[v];
      if (!step) throw new Error(`Missing migration to v${v}`);
      await step(tx);
    }
    await tx.exec(`PRAGMA user_version = ${target}`);
  });
}
