/** @jest-environment node */
import { buildInsights } from '../src/domain/insights';
import type { Category, SavingsGoal } from '../src/domain/models';

const cat = (id: number, key: string): Category => ({
  id,
  key,
  name: null,
  iconCode: 1,
  isEssential: false,
  archived: false,
});
const food = cat(1, 'food');
const fun = cat(2, 'entertainment');
const today = { year: 2026, month: 10, day: 9 };
const kinds = (xs: { kind: string }[]) => xs.map((i) => i.kind);
const goal = (p: Partial<SavingsGoal>): SavingsGoal => ({
  id: 1,
  name: 'Car',
  targetMinor: 6000000,
  savedMinor: 0,
  targetDate: { year: 2027, month: 10, day: 9 },
  ...p,
});

test('healthy month has no alerts', () => {
  expect(
    buildInsights({
      incomeMinor: 1000000,
      expensesMinor: 400000,
      spends: [{ category: food, spentMinor: 100000, limitMinor: 200000 }],
      goals: [],
      today,
    }),
  ).toEqual([]);
});

test('negative cash flow is critical and first', () => {
  const r = buildInsights({
    incomeMinor: 500000,
    expensesMinor: 600000,
    spends: [{ category: food, spentMinor: 170000, limitMinor: 200000 }],
    goals: [],
    today,
  });
  expect(kinds(r)).toEqual(['negativeCashFlow', 'nearBudget']);
  expect(r[0].amountMinor).toBe(100000);
});

test('no income with expenses is info only', () => {
  expect(kinds(buildInsights({ incomeMinor: 0, expensesMinor: 10, spends: [], goals: [], today }))).toEqual([
    'noIncome',
  ]);
});

test('over budget amount; exactly at limit is near', () => {
  const r = buildInsights({
    incomeMinor: 1000000,
    expensesMinor: 300000,
    spends: [
      { category: food, spentMinor: 250000, limitMinor: 200000 },
      { category: fun, spentMinor: 50000, limitMinor: 50000 },
    ],
    goals: [],
    today,
  });
  expect(kinds(r)).toEqual(['overBudget', 'nearBudget']);
  expect(r.map((i) => i.amountMinor)).toEqual([50000, 0]);
});

test('goal at risk only when it exceeds this month\'s leftover', () => {
  const g = goal({});
  const atRisk = buildInsights({ incomeMinor: 800000, expensesMinor: 400000, spends: [], goals: [g], today });
  expect(kinds(atRisk)).toEqual(['goalAtRisk']);
  expect(atRisk[0].requiredMonthlyMinor).toBe(500000);
  expect(buildInsights({ incomeMinor: 1000000, expensesMinor: 400000, spends: [], goals: [g], today })).toEqual([]);
  expect(
    buildInsights({
      incomeMinor: 800000,
      expensesMinor: 400000,
      spends: [],
      goals: [g],
      today,
      assessGoalFeasibility: false,
    }),
  ).toEqual([]);
});

test('overdue reported, reached ignored', () => {
  const r = buildInsights({
    incomeMinor: 0,
    expensesMinor: 0,
    spends: [],
    goals: [
      goal({ id: 1, targetMinor: 1000, savedMinor: 400, targetDate: { year: 2026, month: 9, day: 1 } }),
      goal({ id: 2, targetMinor: 1000, savedMinor: 1000, targetDate: { year: 2026, month: 9, day: 1 } }),
    ],
    today,
  });
  expect(kinds(r)).toEqual(['goalOverdue']);
  expect(r[0].amountMinor).toBe(600);
});
