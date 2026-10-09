import {
  Day,
  dayKey,
  firstDayKey,
  lastDayKey,
  monthKey,
  parseDayKey,
  parseMonthKey,
  YearMonth,
} from '../core/dates';
import type { Budget, Category, Expense, IncomeEntry, SavingsGoal } from '../domain/models';
import type { Db, DbExecutor } from './db';

export const SettingKeys = {
  currency: 'currency',
  locale: 'locale',
  onboarded: 'onboarded',
  themeMode: 'theme_mode',
} as const;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function positive(v: number) {
  if (!Number.isInteger(v) || v <= 0) throw new ValidationError('Amount must be > 0');
}

function nonBlank(s: string, what: string): string {
  const t = s.trim();
  if (t === '') throw new ValidationError(`${what} is empty`);
  return t;
}

type CategoryRow = {
  id: number;
  key: string | null;
  name: string | null;
  icon_code: number;
  is_essential: number;
  archived: number;
};

const toCategory = (r: CategoryRow): Category => ({
  id: r.id,
  key: r.key,
  name: r.name,
  iconCode: r.icon_code,
  isEssential: r.is_essential === 1,
  archived: r.archived === 1,
});

/**
 * Single local repository for all user finance data. v1 is local-only and
 * single-profile (no accounts, no sync), so no cross-user data path exists.
 */
export class FinanceRepository {
  constructor(
    private readonly db: Db,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  private get nowUtc() {
    return this.clock().getTime();
  }

  close() {
    return this.db.close();
  }

  // -- settings --------------------------------------------------------------

  async loadSettings(): Promise<Record<string, string>> {
    const rows = await this.db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async setSetting(key: string, value: string, tx: DbExecutor = this.db) {
    await tx.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }

  /**
   * Currency, optional first income and the onboarded flag in ONE transaction,
   * so an interrupted onboarding can't leave income under a later-changed
   * currency.
   */
  completeOnboarding(args: {
    currencyCode: string;
    month: YearMonth;
    incomeMinor?: number | null;
    incomeLabel?: string;
  }): Promise<void> {
    return this.db.transaction(async (tx) => {
      await this.setSetting(SettingKeys.currency, args.currencyCode, tx);
      if (args.incomeMinor != null && args.incomeMinor > 0) {
        const existing = await tx.first<{ n: number }>(
          'SELECT COUNT(*) AS n FROM incomes WHERE month = ?',
          [monthKey(args.month)],
        );
        if ((existing?.n ?? 0) === 0) {
          const now = this.nowUtc;
          await tx.run(
            'INSERT INTO incomes (month, amount_minor, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            [monthKey(args.month), args.incomeMinor, (args.incomeLabel ?? '').trim(), now, now],
          );
        }
      }
      await this.setSetting(SettingKeys.onboarded, '1', tx);
    });
  }

  // -- categories ------------------------------------------------------------

  async categories(includeArchived = false): Promise<Category[]> {
    const rows = await this.db.all<CategoryRow>(
      `SELECT id, key, name, icon_code, is_essential, archived FROM categories
       ${includeArchived ? '' : 'WHERE archived = 0'} ORDER BY sort_order, id`,
    );
    return rows.map(toCategory);
  }

  async addCategory(name: string, iconCode = 11): Promise<number> {
    const n = nonBlank(name, 'Category name');
    const max = await this.db.first<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM categories');
    const r = await this.db.run(
      'INSERT INTO categories (name, icon_code, sort_order) VALUES (?, ?, ?)',
      [n, iconCode, (max?.m ?? 0) + 1],
    );
    return r.lastInsertRowId;
  }

  async renameCategory(id: number, name: string) {
    await this.db.run('UPDATE categories SET name = ? WHERE id = ?', [nonBlank(name, 'Category name'), id]);
  }

  /** Deletes an unused category; archives one with expenses. True if archived. */
  async removeCategory(id: number): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const used = await tx.first<{ n: number }>(
        'SELECT COUNT(*) AS n FROM expenses WHERE category_id = ?',
        [id],
      );
      if ((used?.n ?? 0) > 0) {
        await tx.run('UPDATE categories SET archived = 1 WHERE id = ?', [id]);
        await tx.run('DELETE FROM budgets WHERE category_id = ?', [id]);
        return true;
      }
      await tx.run('DELETE FROM categories WHERE id = ?', [id]);
      return false;
    });
  }

  // -- expenses --------------------------------------------------------------

  async expensesFor(month: YearMonth): Promise<Expense[]> {
    const rows = await this.db.all<{
      id: number;
      amount_minor: number;
      category_id: number;
      day: string;
      note: string;
    }>(
      `SELECT id, amount_minor, category_id, day, note FROM expenses
       WHERE day BETWEEN ? AND ? ORDER BY day DESC, id DESC`,
      [firstDayKey(month), lastDayKey(month)],
    );
    return rows.map((r) => ({
      id: r.id,
      amountMinor: r.amount_minor,
      categoryId: r.category_id,
      date: parseDayKey(r.day),
      note: r.note,
    }));
  }

  async addExpense(e: Omit<Expense, 'id'>): Promise<number> {
    positive(e.amountMinor);
    const now = this.nowUtc;
    const r = await this.db.run(
      `INSERT INTO expenses (amount_minor, category_id, day, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [e.amountMinor, e.categoryId, dayKey(e.date), e.note.trim(), now, now],
    );
    return r.lastInsertRowId;
  }

  async updateExpense(e: Expense) {
    positive(e.amountMinor);
    await this.db.run(
      `UPDATE expenses SET amount_minor = ?, category_id = ?, day = ?, note = ?, updated_at = ?
       WHERE id = ?`,
      [e.amountMinor, e.categoryId, dayKey(e.date), e.note.trim(), this.nowUtc, e.id],
    );
  }

  async deleteExpense(id: number) {
    await this.db.run('DELETE FROM expenses WHERE id = ?', [id]);
  }

  // -- income ----------------------------------------------------------------

  async incomesFor(month: YearMonth): Promise<IncomeEntry[]> {
    const rows = await this.db.all<{ id: number; month: string; amount_minor: number; label: string }>(
      'SELECT id, month, amount_minor, label FROM incomes WHERE month = ? ORDER BY id',
      [monthKey(month)],
    );
    return rows.map((r) => ({
      id: r.id,
      month: parseMonthKey(r.month),
      amountMinor: r.amount_minor,
      label: r.label,
    }));
  }

  async addIncome(month: YearMonth, amountMinor: number, label = ''): Promise<number> {
    positive(amountMinor);
    const now = this.nowUtc;
    const r = await this.db.run(
      'INSERT INTO incomes (month, amount_minor, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [monthKey(month), amountMinor, label.trim(), now, now],
    );
    return r.lastInsertRowId;
  }

  async updateIncome(e: IncomeEntry) {
    positive(e.amountMinor);
    await this.db.run(
      'UPDATE incomes SET amount_minor = ?, label = ?, updated_at = ? WHERE id = ?',
      [e.amountMinor, e.label.trim(), this.nowUtc, e.id],
    );
  }

  async deleteIncome(id: number) {
    await this.db.run('DELETE FROM incomes WHERE id = ?', [id]);
  }

  /** Copies `from`'s income into `to`. No-op if `to` already has income. */
  copyIncome(from: YearMonth, to: YearMonth): Promise<number> {
    return this.db.transaction(async (tx) => {
      const existing = await tx.first<{ n: number }>(
        'SELECT COUNT(*) AS n FROM incomes WHERE month = ?',
        [monthKey(to)],
      );
      if ((existing?.n ?? 0) > 0) return 0;
      const rows = await tx.all<{ amount_minor: number; label: string }>(
        'SELECT amount_minor, label FROM incomes WHERE month = ? ORDER BY id',
        [monthKey(from)],
      );
      const now = this.nowUtc;
      for (const r of rows) {
        await tx.run(
          'INSERT INTO incomes (month, amount_minor, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          [monthKey(to), r.amount_minor, r.label, now, now],
        );
      }
      return rows.length;
    });
  }

  // -- budgets ---------------------------------------------------------------

  async budgets(): Promise<Budget[]> {
    const rows = await this.db.all<{ category_id: number; limit_minor: number }>(
      'SELECT category_id, limit_minor FROM budgets',
    );
    return rows.map((r) => ({ categoryId: r.category_id, limitMinor: r.limit_minor }));
  }

  /** Sets (or with null, clears) a category's monthly limit. */
  async setBudget(categoryId: number, limitMinor: number | null) {
    if (limitMinor == null) {
      await this.db.run('DELETE FROM budgets WHERE category_id = ?', [categoryId]);
      return;
    }
    positive(limitMinor);
    await this.db.run(
      'INSERT OR REPLACE INTO budgets (category_id, limit_minor) VALUES (?, ?)',
      [categoryId, limitMinor],
    );
  }

  // -- goals -----------------------------------------------------------------

  async goals(): Promise<SavingsGoal[]> {
    const rows = await this.db.all<{
      id: number;
      name: string;
      target_minor: number;
      target_day: string;
      saved_minor: number;
    }>(`
      SELECT g.id, g.name, g.target_minor, g.target_day,
             COALESCE(SUM(c.amount_minor), 0) AS saved_minor
      FROM goals g LEFT JOIN goal_contributions c ON c.goal_id = g.id
      GROUP BY g.id ORDER BY g.target_day, g.id`);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      targetMinor: r.target_minor,
      savedMinor: r.saved_minor,
      targetDate: parseDayKey(r.target_day),
    }));
  }

  addGoal(args: {
    name: string;
    targetMinor: number;
    targetDate: Day;
    initialSavedMinor?: number;
    today: Day;
  }): Promise<number> {
    const name = nonBlank(args.name, 'Goal name');
    positive(args.targetMinor);
    const initial = args.initialSavedMinor ?? 0;
    if (!Number.isInteger(initial) || initial < 0) throw new ValidationError('Negative saved amount');
    const now = this.nowUtc;
    return this.db.transaction(async (tx) => {
      const r = await tx.run(
        'INSERT INTO goals (name, target_minor, target_day, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [name, args.targetMinor, dayKey(args.targetDate), now, now],
      );
      if (initial > 0) {
        await tx.run(
          'INSERT INTO goal_contributions (goal_id, amount_minor, day, created_at) VALUES (?, ?, ?, ?)',
          [r.lastInsertRowId, initial, dayKey(args.today), now],
        );
      }
      return r.lastInsertRowId;
    });
  }

  async updateGoal(args: { id: number; name: string; targetMinor: number; targetDate: Day }) {
    const name = nonBlank(args.name, 'Goal name');
    positive(args.targetMinor);
    await this.db.run(
      'UPDATE goals SET name = ?, target_minor = ?, target_day = ?, updated_at = ? WHERE id = ?',
      [name, args.targetMinor, dayKey(args.targetDate), this.nowUtc, args.id],
    );
  }

  async deleteGoal(id: number) {
    await this.db.run('DELETE FROM goals WHERE id = ?', [id]);
  }

  /** Deposit (positive) or withdrawal (negative); can't go below zero. */
  addContribution(goalId: number, amountMinor: number, date: Day): Promise<void> {
    if (!Number.isInteger(amountMinor) || amountMinor === 0) {
      throw new ValidationError('Contribution must be non-zero');
    }
    return this.db.transaction(async (tx) => {
      if (amountMinor < 0) {
        const s = await tx.first<{ s: number }>(
          'SELECT COALESCE(SUM(amount_minor), 0) AS s FROM goal_contributions WHERE goal_id = ?',
          [goalId],
        );
        if ((s?.s ?? 0) + amountMinor < 0) throw new ValidationError('Withdrawal exceeds saved amount');
      }
      await tx.run(
        'INSERT INTO goal_contributions (goal_id, amount_minor, day, created_at) VALUES (?, ?, ?, ?)',
        [goalId, amountMinor, dayKey(date), this.nowUtc],
      );
    });
  }
}
