/** @jest-environment node */
import { FinanceRepository } from '../src/data/repository';
import { migrate, migrateTo, SCHEMA_VERSION } from '../src/data/schema';
import { SqlJsDriver } from './helpers/sqlJsDriver';

const clock = () => new Date(2026, 9, 9, 12);
const d = (y: number, m: number, day: number) => ({ year: y, month: m, day });

test('v1 → v2 keeps every existing row and adds debts, assets, goal pause', async () => {
  const driver = new SqlJsDriver();
  let db = await driver.open();
  await migrateTo(db, 1);
  // Write v1 data with v1 SQL only (the v1 app never knew about v2 columns).
  const now = clock().getTime();
  await db.run("INSERT INTO settings (key, value) VALUES ('currency', 'OMR')");
  await db.run("INSERT INTO expenses (amount_minor, category_id, day, note, created_at, updated_at) VALUES (12500, 2, '2026-10-01', 'لولو', ?, ?)", [now, now]);
  await db.run("INSERT INTO goals (name, target_minor, target_day, created_at, updated_at) VALUES ('سفر', 1200000, '2027-10-01', ?, ?)", [now, now]);
  await db.run("INSERT INTO goal_contributions (goal_id, amount_minor, day, created_at) VALUES (1, 200000, '2026-10-01', ?)", [now]);
  await db.close();

  db = await driver.open();
  await migrate(db);
  expect((await db.first<{ user_version: number }>('PRAGMA user_version'))?.user_version).toBe(SCHEMA_VERSION);
  const repo = new FinanceRepository(db, clock);
  expect(await repo.expensesFor({ year: 2026, month: 10 })).toEqual([{ id: 1, amountMinor: 12500, categoryId: 2, date: d(2026, 10, 1), note: 'لولو' }]);
  expect(await repo.goals()).toEqual([{ id: 1, name: 'سفر', targetMinor: 1200000, savedMinor: 200000, targetDate: d(2027, 10, 1), paused: false }]);
  expect(await repo.debts()).toEqual([]);
  expect(await repo.assets()).toEqual([]);
  await db.close();
});

describe('obligations, assets, goal pause', () => {
  let repo: FinanceRepository;
  let close: () => Promise<void>;
  beforeEach(async () => {
    const db = await new SqlJsDriver().open();
    await migrate(db);
    repo = new FinanceRepository(db, clock);
    close = () => db.close();
  });
  afterEach(() => close());

  test('debt: remaining = original − payments; payment can be logged as an expense too', async () => {
    const id = await repo.addDebt({ name: 'قرض السيارة', remainingMinor: 5000000, annualRatePercent: 4.25, monthlyPaymentMinor: 150000, dueDay: 25 });
    await repo.addDebtPayment({ debtId: id, amountMinor: 150000, date: d(2026, 10, 9), alsoExpense: true, note: 'قسط السيارة' });
    await repo.addDebtPayment({ debtId: id, amountMinor: 50000, date: d(2026, 10, 9), alsoExpense: false, note: '' });
    expect(await repo.debts()).toEqual([
      { id, name: 'قرض السيارة', originalMinor: 5000000, paidMinor: 200000, remainingMinor: 4800000, annualRatePercent: 4.25, monthlyPaymentMinor: 150000, dueDay: 25 },
    ]);
    const exp = await repo.expensesFor({ year: 2026, month: 10 });
    expect(exp).toHaveLength(1); // only the payment marked "also an expense"
    const debtCat = (await repo.categories()).find((c) => c.key === 'debt')!.id;
    expect(exp[0]).toMatchObject({ amountMinor: 150000, categoryId: debtCat, note: 'قسط السيارة' });
    // Overpaying is refused and nothing is written (transaction).
    await expect(repo.addDebtPayment({ debtId: id, amountMinor: 4800001, date: d(2026, 10, 9), alsoExpense: true, note: '' })).rejects.toThrow('exceeds');
    expect(await repo.expensesFor({ year: 2026, month: 10 })).toHaveLength(1);
    // Editing sets the CURRENT remaining amount; payments are kept.
    await repo.updateDebt({ id, name: 'قرض السيارة', remainingMinor: 4700000, annualRatePercent: 4.25, monthlyPaymentMinor: 150000, dueDay: 25 });
    expect((await repo.debts())[0]).toMatchObject({ remainingMinor: 4700000, paidMinor: 200000, originalMinor: 4900000 });
    await repo.deleteDebt(id);
    expect(await repo.debts()).toEqual([]);
  });

  test('debt validation', async () => {
    const base = { name: 'x', remainingMinor: 1000, annualRatePercent: 0, monthlyPaymentMinor: 0, dueDay: null };
    await expect(repo.addDebt({ ...base, name: '  ' })).rejects.toThrow();
    await expect(repo.addDebt({ ...base, remainingMinor: 0 })).rejects.toThrow();
    await expect(repo.addDebt({ ...base, annualRatePercent: 4.255 })).rejects.toThrow('2 decimals');
    await expect(repo.addDebt({ ...base, annualRatePercent: 101 })).rejects.toThrow();
    await expect(repo.addDebt({ ...base, dueDay: 32 })).rejects.toThrow();
  });

  test('assets: manual values, estimate flag, edit and delete', async () => {
    const a = await repo.addAsset({ name: 'حساب التوفير', kind: 'bank', valueMinor: 2500000, isEstimate: false, today: d(2026, 10, 9) });
    await repo.addAsset({ name: 'ذهب', kind: 'gold', valueMinor: 800000, isEstimate: true, today: d(2026, 10, 9) });
    expect((await repo.assets()).map((x) => [x.name, x.valueMinor, x.isEstimate])).toEqual([
      ['حساب التوفير', 2500000, false],
      ['ذهب', 800000, true],
    ]);
    await repo.updateAsset({ id: a, name: 'حساب التوفير', kind: 'bank', valueMinor: 2600000, isEstimate: false, today: d(2026, 10, 12) });
    expect((await repo.assets())[0]).toMatchObject({ valueMinor: 2600000, updatedDay: d(2026, 10, 12) });
    await repo.deleteAsset(a);
    expect(await repo.assets()).toHaveLength(1);
    await expect(repo.addAsset({ name: 'x', kind: 'cash', valueMinor: -1, isEstimate: false, today: d(2026, 10, 9) })).rejects.toThrow();
  });

  test('goal pause', async () => {
    const g = await repo.addGoal({ name: 'سفر', targetMinor: 1000, targetDate: d(2027, 1, 1), today: d(2026, 10, 9) });
    await repo.setGoalPaused(g, true);
    expect((await repo.goals())[0].paused).toBe(true);
    await repo.setGoalPaused(g, false);
    expect((await repo.goals())[0].paused).toBe(false);
  });
});
