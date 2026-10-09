/** @jest-environment node */
import { FinanceRepository } from '../src/data/repository';
import { DEFAULT_CATEGORIES, migrate, NewerSchemaError, SCHEMA_VERSION } from '../src/data/schema';
import type { Db } from '../src/data/db';
import { SqlJsDriver } from './helpers/sqlJsDriver';

const oct = { year: 2026, month: 10 };
const d = (y: number, m: number, day: number) => ({ year: y, month: m, day });
const clock = () => new Date(2026, 9, 9, 12);

let driver: SqlJsDriver;
let db: Db;
let repo: FinanceRepository;

async function openRepo() {
  db = await driver.open();
  await migrate(db);
  repo = new FinanceRepository(db, clock);
}

beforeEach(async () => {
  driver = new SqlJsDriver();
  await openRepo();
});
afterEach(() => db.close());

const catId = async (key: string) => (await repo.categories()).find((c) => c.key === key)!.id;

describe('schema & migrations', () => {
  test('fresh install seeds default categories at current version', async () => {
    expect((await repo.categories()).map((c) => c.key)).toEqual(DEFAULT_CATEGORIES.map((c) => c[0]));
    expect((await db.first<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(SCHEMA_VERSION);
  });

  test('reopening does not re-seed or lose data', async () => {
    await repo.addIncome(oct, 900000, 'Salary');
    await db.close();
    await openRepo();
    expect(await repo.categories()).toHaveLength(DEFAULT_CATEGORIES.length);
    expect((await repo.incomesFor(oct))[0].amountMinor).toBe(900000);
  });

  test('a database from a newer app version is refused, not wiped', async () => {
    await repo.addIncome(oct, 1);
    await db.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 1}`);
    await expect(migrate(db)).rejects.toBeInstanceOf(NewerSchemaError);
    expect((await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM incomes'))?.n).toBe(1);
  });

  test('SQL constraints reject bad rows even if app checks are bypassed', async () => {
    const food = await catId('food');
    const ins = (amount: number, cat: number, day: string) =>
      db.run(
        'INSERT INTO expenses (amount_minor, category_id, day, note, created_at, updated_at) VALUES (?,?,?,?,?,?)',
        [amount, cat, day, '', 0, 0],
      );
    await expect(ins(0, food, '2026-10-09')).rejects.toThrow();
    await expect(ins(-5, food, '2026-10-09')).rejects.toThrow();
    await expect(ins(100, 9999, '2026-10-09')).rejects.toThrow(); // FK
    await expect(ins(100, food, '2026-1-9')).rejects.toThrow();
  });
});

describe('expenses', () => {
  test('CRUD and month filtering at month edges', async () => {
    const food = await catId('food');
    const id = await repo.addExpense({ amountMinor: 3500, categoryId: food, date: d(2026, 10, 31), note: '' });
    await repo.addExpense({ amountMinor: 1000, categoryId: food, date: d(2026, 11, 1), note: '' });
    await repo.addExpense({ amountMinor: 2000, categoryId: food, date: d(2026, 10, 1), note: '  lunch ' });
    let rows = await repo.expensesFor(oct);
    expect(rows.map((e) => e.amountMinor)).toEqual([3500, 2000]);
    expect(rows[1].note).toBe('lunch');
    await repo.updateExpense({ id, amountMinor: 4000, categoryId: food, date: d(2026, 10, 30), note: '' });
    expect((await repo.expensesFor(oct))[0].amountMinor).toBe(4000);
    await repo.deleteExpense(id);
    rows = await repo.expensesFor(oct);
    expect(rows.map((e) => e.id)).not.toContain(id);
  });

  test('rejects non-positive amounts', async () => {
    const food = await catId('food');
    await expect(repo.addExpense({ amountMinor: 0, categoryId: food, date: d(2026, 10, 1), note: '' })).rejects.toThrow();
  });
});

test('copyIncome copies once, never duplicates', async () => {
  const sep = { year: 2026, month: 9 };
  await repo.addIncome(sep, 800000, 'Salary');
  await repo.addIncome(sep, 50000, 'Side');
  expect(await repo.copyIncome(sep, oct)).toBe(2);
  expect(await repo.copyIncome(sep, oct)).toBe(0);
  expect((await repo.incomesFor(oct)).map((r) => [r.amountMinor, r.label])).toEqual([
    [800000, 'Salary'],
    [50000, 'Side'],
  ]);
});

describe('budgets & categories', () => {
  test('set, replace, clear budget', async () => {
    const food = await catId('food');
    await repo.setBudget(food, 150000);
    await repo.setBudget(food, 120000);
    expect(await repo.budgets()).toEqual([{ categoryId: food, limitMinor: 120000 }]);
    await repo.setBudget(food, null);
    expect(await repo.budgets()).toEqual([]);
  });

  test('unused custom category deleted; used one archived with history kept', async () => {
    const a = await repo.addCategory('  Coffee ');
    const b = await repo.addCategory('Gym');
    expect((await repo.categories()).find((c) => c.id === a)?.name).toBe('Coffee');
    await repo.addExpense({ amountMinor: 1500, categoryId: b, date: d(2026, 10, 2), note: '' });
    await repo.setBudget(b, 20000);
    expect(await repo.removeCategory(a)).toBe(false);
    expect(await repo.removeCategory(b)).toBe(true);
    expect((await repo.categories()).some((c) => c.id === a || c.id === b)).toBe(false);
    expect((await repo.categories(true)).find((c) => c.id === b)?.archived).toBe(true);
    expect((await repo.expensesFor(oct))[0].categoryId).toBe(b);
    expect(await repo.budgets()).toEqual([]);
  });

  test('blank names rejected', async () => {
    await expect(repo.addCategory('  ')).rejects.toThrow();
    await expect(repo.renameCategory(await catId('food'), ' ')).rejects.toThrow();
  });
});

describe('goals', () => {
  test('saved = sum of contributions; withdrawal bounded and rolled back', async () => {
    const id = await repo.addGoal({
      name: 'Car',
      targetMinor: 5000000,
      targetDate: d(2027, 10, 1),
      initialSavedMinor: 1000000,
      today: d(2026, 10, 9),
    });
    await repo.addContribution(id, 250000, d(2026, 10, 9));
    await repo.addContribution(id, -50000, d(2026, 10, 9));
    expect((await repo.goals())[0].savedMinor).toBe(1200000);
    await expect(repo.addContribution(id, -1200001, d(2026, 10, 9))).rejects.toThrow();
    expect((await repo.goals())[0].savedMinor).toBe(1200000);
  });

  test('update and cascade delete', async () => {
    const id = await repo.addGoal({ name: 'Trip', targetMinor: 300000, targetDate: d(2027, 1, 1), today: d(2026, 10, 9) });
    await repo.addContribution(id, 1000, d(2026, 10, 9));
    await repo.updateGoal({ id, name: 'Umrah', targetMinor: 400000, targetDate: d(2027, 3, 1) });
    const g = (await repo.goals())[0];
    expect([g.name, g.targetMinor, g.targetDate]).toEqual(['Umrah', 400000, d(2027, 3, 1)]);
    await repo.deleteGoal(id);
    expect(await repo.goals()).toEqual([]);
    expect((await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM goal_contributions'))?.n).toBe(0);
  });
});

test('onboarding is atomic and idempotent', async () => {
  await repo.completeOnboarding({ currencyCode: 'USD', month: oct, incomeMinor: 150000, incomeLabel: 'Salary' });
  await repo.completeOnboarding({ currencyCode: 'USD', month: oct, incomeMinor: 150000 });
  expect(await repo.loadSettings()).toMatchObject({ currency: 'USD', onboarded: '1' });
  expect(await repo.incomesFor(oct)).toHaveLength(1);
});
