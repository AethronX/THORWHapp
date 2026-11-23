/**
 * Performance budgets for the heaviest pure computations (#31 in the
 * performance review, D-048). These are DEV-MACHINE timings, not a phone:
 * they catch a regression (an accidental O(n²), a loop added inside a loop),
 * they do NOT prove the app is fast on a real device.
 * Budgets are deliberately generous so the suite is not flaky on CI.
 */
import { currencyFromCode } from '../src/core/currency';
import type { Category, CategoryKey, Expense } from '../src/domain/models';
import { CATEGORY_KEYS } from '../src/domain/models';
import { evaluatePrinciples } from '../src/domain/principles';
import { readPersona } from '../src/domain/persona';
import { detectRecurring, dailyTotals, unusualExpense, weekdayPattern } from '../src/domain/smart';
import { filterExpenses } from '../src/domain/search';

const cats: Category[] = CATEGORY_KEYS.map((key: CategoryKey, i) => ({ id: i + 1, key, name: null, iconCode: i, isEssential: i < 6, archived: false }));
const NOTES = ['لولو', 'بنزين', 'مطعم', 'عمانتل', 'صيدلية', 'Lulu Hypermarket', 'قهوة'];
/** Four years of a heavy user: ~8 expenses a day. */
const BIG: Expense[] = Array.from({ length: 12000 }, (_, i) => ({
  id: i + 1,
  amountMinor: 500 + ((i * 137) % 50000),
  categoryId: (i % cats.length) + 1,
  date: { year: 2023 + Math.floor(i / 3000), month: (Math.floor(i / 250) % 12) + 1, day: (i % 28) + 1 },
  note: NOTES[i % NOTES.length],
}));

const ms = (f: () => unknown) => {
  const t = Date.now();
  f();
  return Date.now() - t;
};

test('principles over 12k expenses stay well under a second', () => {
  const t = ms(() =>
    evaluatePrinciples({
      today: { year: 2026, month: 11, day: 23 },
      incomeMinor: 1200000,
      expensesMinor: 900000,
      history: BIG,
      categories: cats,
      spends: [],
      goals: [],
      debts: [],
      assets: [],
    }),
  );
  expect(t).toBeLessThan(500);
});

test('the money personality over 12k expenses stays under a second', () => {
  expect(ms(() => readPersona({ history: BIG, categories: cats, currencyCode: 'OMR', payday: 25 }))).toBeLessThan(500);
});

test('recurring detection, daily totals, weekday pattern and anomalies stay under a second each', () => {
  expect(ms(() => detectRecurring(BIG, { year: 2026, month: 11 }))).toBeLessThan(500);
  expect(ms(() => dailyTotals(BIG, { year: 2026, month: 11 }))).toBeLessThan(500);
  expect(ms(() => weekdayPattern(BIG))).toBeLessThan(500);
  expect(ms(() => unusualExpense(BIG, { year: 2026, month: 11 }))).toBeLessThan(2000);
});

test('search over a heavy month stays instant (runs on every keystroke)', () => {
  const month = BIG.slice(0, 400);
  const name = (id: number) => `cat${id}`;
  expect(ms(() => filterExpenses(month, { query: 'لولو', categoryId: null }, name))).toBeLessThan(100);
});
