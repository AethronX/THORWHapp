/** @jest-environment node */
import { currencyFromCode } from '../src/core/currency';
import {
  averageSpending,
  categoryBreakdown,
  change,
  daysLeftInMonth,
  daysUntilPayday,
  healthScore,
  projectMonthEndSpending,
  safeToSpendPerDay,
} from '../src/domain/analytics';
import type { Category, CategorySpend } from '../src/domain/models';
import { parseProfile, suggestPlan, DEFAULT_PROFILE } from '../src/domain/profile';

const d = (year: number, month: number, day: number) => ({ year, month, day });
const cat = (id: number): Category => ({ id, key: null, name: `c${id}`, iconCode: 11, isEssential: false, archived: false });
const spend = (id: number, spentMinor: number): CategorySpend => ({ category: cat(id), spentMinor, limitMinor: null });
const OMR = currencyFromCode('OMR');

describe('categoryBreakdown', () => {
  test('top 5 plus one grouped slice; shares sum to 1', () => {
    const r = categoryBreakdown([spend(1, 100), spend(2, 700), spend(3, 50), spend(4, 300), spend(5, 200), spend(6, 400), spend(7, 0)]);
    expect(r.map((s) => s.categoryId)).toEqual([2, 6, 4, 5, 1, null]);
    expect(r[5].amountMinor).toBe(50);
    expect(r.reduce((a, s) => a + s.share, 0)).toBeCloseTo(1, 10);
  });
  test('no spending -> empty; few categories -> no "other" slice', () => {
    expect(categoryBreakdown([spend(1, 0)])).toEqual([]);
    expect(categoryBreakdown([spend(1, 10), spend(2, 30)]).map((s) => s.categoryId)).toEqual([2, 1]);
  });
});

test('change: delta and percentage, null when previous is 0', () => {
  expect(change(1200, 1000)).toEqual({ deltaMinor: 200, pct: 0.2 });
  expect(change(800, 1000)).toEqual({ deltaMinor: -200, pct: -0.2 });
  expect(change(500, 0)).toEqual({ deltaMinor: 500, pct: null });
});

describe('pace & payday', () => {
  test('linear month-end projection', () => {
    expect(projectMonthEndSpending(31000, d(2026, 10, 10))).toBe(96100);
    expect(projectMonthEndSpending(5000, d(2026, 2, 28))).toBe(5000);
  });

  test('fixed bills are counted once, not extrapolated', () => {
    // rent 350.000 + everyday 31.000 over 10 of 31 days → 350.000 + 96.100
    expect(projectMonthEndSpending(31000, d(2026, 10, 10), 350000)).toBe(446100);
    expect(projectMonthEndSpending(0, d(2026, 10, 1), 350000)).toBe(350000);
  });

  test('days until payday incl. short months and year end', () => {
    expect(daysUntilPayday(d(2026, 10, 9), 25)).toBe(16);
    expect(daysUntilPayday(d(2026, 10, 25), 25)).toBe(0);
    expect(daysUntilPayday(d(2026, 10, 26), 25)).toBe(30);
    expect(daysUntilPayday(d(2026, 2, 10), 31)).toBe(18); // paid on Feb 28
    expect(daysUntilPayday(d(2026, 1, 31), 30)).toBe(28); // next: Feb 28
    expect(daysUntilPayday(d(2026, 12, 20), 5)).toBe(16);
  });

  test('safe to spend per day rounds DOWN and never goes negative', () => {
    expect(safeToSpendPerDay({ incomeMinor: 800000, spentMinor: 300000, plannedSavingMinor: 120000, daysLeft: 16 })).toBe(23750);
    expect(safeToSpendPerDay({ incomeMinor: 1000, spentMinor: 0, plannedSavingMinor: 0, daysLeft: 3 })).toBe(333);
    expect(safeToSpendPerDay({ incomeMinor: 100, spentMinor: 200, plannedSavingMinor: 0, daysLeft: 5 })).toBe(0);
    expect(safeToSpendPerDay({ incomeMinor: 1000, spentMinor: 0, plannedSavingMinor: 0, daysLeft: 0 })).toBe(1000);
  });

  test('days left in month includes today', () => {
    expect(daysLeftInMonth(d(2026, 10, 9))).toBe(23);
    expect(daysLeftInMonth(d(2026, 10, 31))).toBe(1);
  });
});

describe('healthScore', () => {
  test('worked example from docs/ANALYTICS.md', () => {
    const h = healthScore({
      incomeMinor: 1000000,
      expensesMinor: 800000,
      budgetedCategories: 4,
      categoriesOverBudget: 1,
      totalSavedMinor: 2400000,
      monthlySpendingMinor: 800000,
    });
    expect(h.components.map((c) => c.points)).toEqual([40, 19, 13, 10]);
    expect(h.score).toBe(82);
    expect(h.grade).toBe('excellent');
    expect(h.focus).toBe('cushion');
  });

  test('empty state is low but not zero, and points to savings', () => {
    const h = healthScore({ incomeMinor: 0, expensesMinor: 0, budgetedCategories: 0, categoriesOverBudget: 0, totalSavedMinor: 0, monthlySpendingMinor: 0 });
    expect(h.score).toBe(10);
    expect(h.grade).toBe('needsWork');
    expect(h.focus).toBe('savings');
  });

  test('overspending gets no savings points; score stays within 0..100', () => {
    const h = healthScore({ incomeMinor: 500000, expensesMinor: 900000, budgetedCategories: 2, categoriesOverBudget: 2, totalSavedMinor: 99999999, monthlySpendingMinor: 900000 });
    expect(h.components[0].points).toBe(0);
    expect(h.components[1].points).toBe(0);
    expect(h.components[2].points).toBe(25);
    expect(h.score).toBeGreaterThanOrEqual(0);
    expect(h.score).toBeLessThanOrEqual(100);
  });
});

test('averageSpending ignores empty months', () => {
  const m = (month: number, inc: number, exp: number) => ({ month: { year: 2026, month }, incomeMinor: inc, expensesMinor: exp });
  expect(averageSpending([m(7, 0, 0), m(8, 1000, 300), m(9, 1000, 500)])).toBe(400);
  expect(averageSpending([m(7, 0, 0)])).toBeNull();
});

describe('questionnaire plan', () => {
  test('emergency saver who saves regularly, worried about food', () => {
    const plan = suggestPlan({ ...DEFAULT_PROFILE, goal: 'emergency', savingHabit: 'regularly', focusCategory: 'food' }, 800000, OMR);
    expect(plan.savingsRate).toBe(0.2);
    expect(plan.monthlySavingMinor).toBe(160000);
    expect(plan.goal).toEqual({ kind: 'emergency', targetMinor: 1200000, months: 12 });
    expect(plan.focusBudget).toEqual({ category: 'food', limitMinor: 80000 });
  });

  test('amounts rounded to whole currency units', () => {
    const plan = suggestPlan({ ...DEFAULT_PROFILE, savingHabit: 'sometimes' }, 650500, OMR);
    expect(plan.monthlySavingMinor).toBe(98000); // 97.575 -> 98 OMR
    expect(plan.goal).toBeNull();
  });

  test('purchase goal; no income -> no amounts', () => {
    expect(suggestPlan({ ...DEFAULT_PROFILE, goal: 'purchase', savingHabit: 'rarely' }, 500000, OMR).goal).toEqual({
      kind: 'purchase',
      targetMinor: 300000,
      months: 6,
    });
    const none = suggestPlan({ ...DEFAULT_PROFILE, goal: 'emergency', focusCategory: 'food' }, 0, OMR);
    expect([none.monthlySavingMinor, none.goal, none.focusBudget]).toEqual([0, null, null]);
  });

  test('stored profile is validated, never trusted', () => {
    expect(parseProfile(null)).toBeNull();
    expect(parseProfile('{not json')).toBeNull();
    expect(parseProfile('{"goal":"hack","payday":99,"focusCategory":"x","savingHabit":1}')).toEqual({
      ...DEFAULT_PROFILE,
      payday: null,
      focusCategory: null,
    });
    expect(parseProfile('{"goal":"debt","incomeType":"irregular","payday":25,"focusCategory":"food","savingHabit":"rarely"}')).toEqual({
      goal: 'debt',
      incomeType: 'irregular',
      payday: 25,
      focusCategory: 'food',
      savingHabit: 'rarely',
    });
  });
});

test('Arabic insights do not double the full stop after «ر.ع.»', () => {
  const { STRINGS } = require('../src/ui/i18n');
  const amount = '‎10.000‎ ر.ع.';
  expect(STRINGS.ar.insightNearBudget('السكن', amount)).toMatch(/ر\.ع\.$/);
  expect(STRINGS.ar.insightOverBudget('السكن', amount)).not.toMatch(/\.\.$/);
  expect(STRINGS.ar.insightNearBudget('السكن', '‎10‎ د.إ')).toMatch(/د\.إ\.$/);
});
