/** @jest-environment node */
import { currencyFromCode } from '../src/core/currency';
import { AppController } from '../src/state/appController';
import { expenseTotal, incomeTotal, insights, monthEndForecast, netCashFlow } from '../src/state/selectors';
import { SqlJsDriver } from './helpers/sqlJsDriver';

const OMR = currencyFromCode('OMR');
let now: Date;
let driver: SqlJsDriver;
let app: AppController;

beforeEach(async () => {
  now = new Date(2026, 9, 31, 23, 50);
  driver = new SqlJsDriver();
  app = new AppController(driver, () => now);
  await app.init();
});
afterEach(() => app.dispose());

const s = () => app.getState();

test('starts ready, not onboarded, Arabic, current month', () => {
  expect(s().status).toBe('ready');
  expect(s().onboarded).toBe(false);
  expect(s().locale).toBe('ar');
  expect(s().month).toEqual({ year: 2026, month: 10 });
});

test('MVP journey persists across an app restart', async () => {
  await app.completeOnboarding({ currency: OMR, monthlyIncomeMinor: 800000, incomeLabel: 'Salary' });
  const food = s().categories.find((c) => c.key === 'food')!.id;
  await app.addExpense({ amountMinor: 12500, categoryId: food, date: { year: 2026, month: 10, day: 9 }, note: '' });
  await app.setBudget(food, 10000);
  await app.addGoal({ name: 'سيارة', targetMinor: 1200000, targetDate: { year: 2027, month: 10, day: 1 }, initialSavedMinor: 200000 });
  expect(netCashFlow(s())).toBe(787500);
  expect(insights(s()).map((i) => i.kind)).toContain('overBudget');

  // Restart: new controller on the same database.
  await app.dispose();
  app = new AppController(driver, () => now);
  await app.init();
  expect(s().onboarded).toBe(true);
  expect(incomeTotal(s())).toBe(800000);
  expect(expenseTotal(s())).toBe(12500);
  expect(s().budgets.get(food)).toBe(10000);
  expect(s().goals[0].name).toBe('سيارة');
  expect(s().goals[0].savedMinor).toBe(200000);
});

test('snapshot identity changes on every update (React re-renders)', async () => {
  const before = s();
  let calls = 0;
  const unsub = app.subscribe(() => calls++);
  await app.addIncome(1000);
  expect(s()).not.toBe(before);
  expect(calls).toBeGreaterThan(0);
  unsub();
});

test('resume in a new month follows it only when viewing the current month', async () => {
  await app.completeOnboarding({ currency: OMR });
  now = new Date(2026, 10, 1, 8);
  await app.onResumed();
  expect(s().month).toEqual({ year: 2026, month: 11 });

  await app.setMonth({ year: 2026, month: 8 });
  now = new Date(2026, 11, 1, 8);
  await app.onResumed();
  expect(s().month).toEqual({ year: 2026, month: 8 });
});

test('past months do not raise goal-at-risk', async () => {
  now = new Date(2026, 9, 9);
  await app.completeOnboarding({ currency: OMR });
  await app.addGoal({ name: 'Car', targetMinor: 6000000, targetDate: { year: 2027, month: 10, day: 1 } });
  await app.setMonth({ year: 2026, month: 9 });
  await app.addIncome(100000);
  expect(insights(s()).map((i) => i.kind)).not.toContain('goalAtRisk');
  await app.setMonth({ year: 2026, month: 10 });
  await app.addIncome(100000);
  expect(insights(s()).map((i) => i.kind)).toContain('goalAtRisk');
});

test('copy last month income', async () => {
  await app.completeOnboarding({ currency: OMR, monthlyIncomeMinor: 500000 });
  await app.setMonth({ year: 2026, month: 11 });
  expect(s().previousMonthHasIncome).toBe(true);
  await app.copyIncomeFromPreviousMonth();
  expect(incomeTotal(s())).toBe(500000);
  expect(s().previousMonthHasIncome).toBe(false);
});

test('delete all resets to first run', async () => {
  await app.completeOnboarding({ currency: currencyFromCode('KWD'), monthlyIncomeMinor: 1000 });
  await app.setLocale('en');
  await app.deleteAllData();
  expect(s().status).toBe('ready');
  expect(s().onboarded).toBe(false);
  expect(s().currency.code).toBe('OMR');
  expect(s().locale).toBe('ar');
  expect(s().incomes).toEqual([]);
});

test('a failed delete-all still leaves a working app with data intact', async () => {
  await app.completeOnboarding({ currency: OMR, monthlyIncomeMinor: 1000 });
  driver.failDestroy = true;
  await expect(app.deleteAllData()).rejects.toThrow();
  expect(s().status).toBe('ready');
  expect(incomeTotal(s())).toBe(1000);
});

test('"vs last month" uses the same days of last month (clamped to its length)', async () => {
  await app.completeOnboarding({ currency: OMR, monthlyIncomeMinor: 500000 });
  const food = s().categories.find((c) => c.key === 'food')!.id;
  now = new Date(2026, 2, 30, 12); // Mar 30 — February has only 28 days
  await app.setMonth({ year: 2026, month: 2 });
  await app.addExpense({ amountMinor: 100000, categoryId: food, date: { year: 2026, month: 2, day: 10 }, note: '' });
  await app.addExpense({ amountMinor: 50000, categoryId: food, date: { year: 2026, month: 2, day: 28 }, note: '' });
  await app.setMonth({ year: 2026, month: 3 });
  expect(s().previousSamePeriodExpensesMinor).toBe(150000);
  now = new Date(2026, 2, 9, 12); // Mar 9 → Feb 1..9
  await app.setMonth({ year: 2026, month: 3 });
  expect(s().previousSamePeriodExpensesMinor).toBe(0);
  // Past months: no same-period figure (full months are compared).
  await app.setMonth({ year: 2026, month: 2 });
  expect(s().previousSamePeriodExpensesMinor).toBeNull();
});

test('month-end forecast counts rent once and extrapolates only everyday spending', async () => {
  now = new Date(2026, 9, 10, 12); // Oct 10
  await app.completeOnboarding({ currency: OMR, monthlyIncomeMinor: 800000 });
  const id = (k: string) => s().categories.find((c) => c.key === k)!.id;
  await app.addExpense({ amountMinor: 350000, categoryId: id('housing'), date: { year: 2026, month: 10, day: 1 }, note: '' });
  await app.addExpense({ amountMinor: 31000, categoryId: id('food'), date: { year: 2026, month: 10, day: 5 }, note: '' });
  // 350.000 + 31.000 / 10 days × 31 = 350.000 + 96.100 (naive linear would say 1,181.100)
  expect(monthEndForecast(s())).toBe(446100);
});
