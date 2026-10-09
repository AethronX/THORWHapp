/**
 * Analytics & "smart" features — deterministic, explainable rules (no AI,
 * no network). Every number here can be explained to the user in one
 * sentence, and every function is unit-tested (__tests__/analytics.test.ts).
 *
 * Money is integer minor units. Results are rounded toward the safe side:
 * "safe to spend" rounds DOWN, projections round to nearest.
 */
import { Day, daysInMonth, YearMonth } from '../core/dates';
import type { CategoryKey, CategorySpend } from './models';

// -----------------------------------------------------------------------------
// Category breakdown (donut chart)
// -----------------------------------------------------------------------------

export interface BreakdownSlice {
  /** null = the grouped "everything else" slice. */
  categoryId: number | null;
  amountMinor: number;
  /** 0..1 of total spending. */
  share: number;
}

/** Largest `topN` categories, the rest grouped into one slice. */
export function categoryBreakdown(spends: CategorySpend[], topN = 5): BreakdownSlice[] {
  const positive = spends.filter((s) => s.spentMinor > 0).sort((a, b) => b.spentMinor - a.spentMinor);
  const total = positive.reduce((a, s) => a + s.spentMinor, 0);
  if (total === 0) return [];
  const head = positive.slice(0, topN).map((s) => ({
    categoryId: s.category.id,
    amountMinor: s.spentMinor,
    share: s.spentMinor / total,
  }));
  const restAmount = positive.slice(topN).reduce((a, s) => a + s.spentMinor, 0);
  return restAmount > 0 ? [...head, { categoryId: null, amountMinor: restAmount, share: restAmount / total }] : head;
}

// -----------------------------------------------------------------------------
// Comparisons
// -----------------------------------------------------------------------------

export interface Change {
  deltaMinor: number;
  /** Fractional change vs previous; null when previous is 0. */
  pct: number | null;
}

export function change(current: number, previous: number): Change {
  return { deltaMinor: current - previous, pct: previous === 0 ? null : (current - previous) / previous };
}

// -----------------------------------------------------------------------------
// Pace & payday
// -----------------------------------------------------------------------------

/**
 * Categories paid about once a month (rent, bills, instalments). Extrapolating
 * them by day would turn rent paid on the 1st into 30× rent, so the forecast
 * counts them once and only extrapolates everyday spending.
 */
export const FIXED_CATEGORY_KEYS: readonly CategoryKey[] = ['housing', 'utilities', 'telecom', 'education', 'debt'];

/**
 * Month-end spending forecast: fixed bills as paid so far + everyday spending
 * extrapolated linearly over the month.
 */
export function projectMonthEndSpending(variableMinor: number, today: Day, fixedMinor = 0): number {
  const elapsed = Math.max(1, today.day);
  return fixedMinor + Math.round((variableMinor / elapsed) * daysInMonth(today.year, today.month));
}

/**
 * Days until the next payday (1..31). If payday falls after the last day of a
 * short month, it is paid on that month's last day. Payday today => 0.
 */
export function daysUntilPayday(today: Day, payday: number): number {
  const pd = Math.min(Math.max(1, Math.round(payday)), 31);
  const thisMonthPay = Math.min(pd, daysInMonth(today.year, today.month));
  if (thisMonthPay >= today.day) return thisMonthPay - today.day;
  const nm = today.month === 12 ? { year: today.year + 1, month: 1 } : { year: today.year, month: today.month + 1 };
  const nextPay = Math.min(pd, daysInMonth(nm.year, nm.month));
  return daysInMonth(today.year, today.month) - today.day + nextPay;
}

/**
 * Daily amount the user can spend without touching this month's savings
 * plan: (income − spent − planned saving) ÷ days left until payday
 * (or month end when no payday is set). Never negative; rounded DOWN.
 */
export function safeToSpendPerDay(args: {
  incomeMinor: number;
  spentMinor: number;
  plannedSavingMinor: number;
  daysLeft: number;
}): number {
  const left = args.incomeMinor - args.spentMinor - args.plannedSavingMinor;
  if (left <= 0) return 0;
  return Math.floor(left / Math.max(1, args.daysLeft));
}

/** Days left in the month including today (1..31). */
export function daysLeftInMonth(today: Day): number {
  return daysInMonth(today.year, today.month) - today.day + 1;
}

// -----------------------------------------------------------------------------
// Financial health score
// -----------------------------------------------------------------------------

export type HealthComponentKey = 'savings' | 'budgets' | 'cushion' | 'tracking';

export interface HealthComponent {
  key: HealthComponentKey;
  points: number;
  max: number;
}

export interface HealthScore {
  score: number; // 0..100
  grade: 'excellent' | 'good' | 'fair' | 'needsWork';
  components: HealthComponent[];
  /** The component with the most points left to gain — the next best step. */
  focus: HealthComponentKey;
}

/**
 * Transparent 0–100 score. Weights (documented in docs/ANALYTICS.md):
 * - savings  40: savings rate; 20 %+ = full marks, linear below, 0 if ≤ 0.
 * - budgets  25: share of budgeted categories within their limit. With no
 *                budgets set: 10 (neutral — the tip is to set some).
 * - cushion  25: money set aside in goals ÷ monthly spending; 6 months = full.
 * - tracking 10: income recorded (5) + at least one expense recorded (5).
 * A planning aid, not a credit score or financial advice.
 */
export function healthScore(args: {
  incomeMinor: number;
  expensesMinor: number;
  budgetedCategories: number;
  categoriesOverBudget: number;
  totalSavedMinor: number;
  monthlySpendingMinor: number;
}): HealthScore {
  const { incomeMinor, expensesMinor } = args;
  const rate = incomeMinor > 0 ? (incomeMinor - expensesMinor) / incomeMinor : 0;
  const savings = Math.round(40 * Math.min(1, Math.max(0, rate / 0.2)));

  const budgets =
    args.budgetedCategories === 0
      ? 10
      : Math.round(25 * ((args.budgetedCategories - args.categoriesOverBudget) / args.budgetedCategories));

  const months = args.monthlySpendingMinor > 0 ? args.totalSavedMinor / args.monthlySpendingMinor : args.totalSavedMinor > 0 ? 6 : 0;
  const cushion = Math.round(25 * Math.min(1, months / 6));

  const tracking = (incomeMinor > 0 ? 5 : 0) + (expensesMinor > 0 ? 5 : 0);

  const components: HealthComponent[] = [
    { key: 'savings', points: savings, max: 40 },
    { key: 'budgets', points: budgets, max: 25 },
    { key: 'cushion', points: cushion, max: 25 },
    { key: 'tracking', points: tracking, max: 10 },
  ];
  const score = components.reduce((a, c) => a + c.points, 0);
  const grade = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'needsWork';
  const focus = components.reduce((best, c) => (c.max - c.points > best.max - best.points ? c : best)).key;
  return { score, grade, components, focus };
}

// -----------------------------------------------------------------------------
// Monthly trend
// -----------------------------------------------------------------------------

export interface MonthTotals {
  month: YearMonth;
  incomeMinor: number;
  expensesMinor: number;
}

/** Average monthly spending over months that have any data (null if none). */
export function averageSpending(trend: MonthTotals[]): number | null {
  const withData = trend.filter((m) => m.expensesMinor > 0 || m.incomeMinor > 0);
  if (withData.length === 0) return null;
  return Math.round(withData.reduce((a, m) => a + m.expensesMinor, 0) / withData.length);
}
