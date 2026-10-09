import { monthOf, sameMonth } from '../core/dates';
import * as fe from '../domain/financeEngine';
import {
  averageSpending,
  daysLeftInMonth,
  daysUntilPayday,
  healthScore,
  HealthScore,
  MonthTotals,
  FIXED_CATEGORY_KEYS,
  projectMonthEndSpending,
  safeToSpendPerDay,
} from '../domain/analytics';
import { buildInsights, Insight } from '../domain/insights';
import { suggestPlan } from '../domain/profile';
import type { CategorySpend } from '../domain/models';
import type { AppState } from './appController';

export const incomeTotal = (s: AppState) => fe.sumMinor(s.incomes.map((i) => i.amountMinor));
export const expenseTotal = (s: AppState) => fe.sumMinor(s.expenses.map((e) => e.amountMinor));
export const netCashFlow = (s: AppState) => fe.netCashFlow(incomeTotal(s), expenseTotal(s));
export const savingsRate = (s: AppState) => fe.savingsRate(incomeTotal(s), expenseTotal(s));
export const totalBudget = (s: AppState) => fe.sumMinor(s.budgets.values());
export const isViewingCurrentMonth = (s: AppState) => sameMonth(s.month, monthOf(s.today));

/** Per-category spend incl. budgeted-but-unspent categories, largest first. */
export function spends(s: AppState): CategorySpend[] {
  const byCat = new Map<number, number>();
  for (const e of s.expenses) byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amountMinor);
  for (const id of s.budgets.keys()) if (!byCat.has(id)) byCat.set(id, 0);
  const out: CategorySpend[] = [];
  byCat.forEach((spent, id) => {
    const category = s.categoriesById.get(id);
    if (category) out.push({ category, spentMinor: spent, limitMinor: s.budgets.get(id) ?? null });
  });
  return out.sort((a, b) => b.spentMinor - a.spentMinor);
}

export function insights(s: AppState): Insight[] {
  return buildInsights({
    incomeMinor: incomeTotal(s),
    expensesMinor: expenseTotal(s),
    spends: spends(s),
    goals: [...s.goals],
    today: s.today,
    assessGoalFeasibility: isViewingCurrentMonth(s),
  });
}

// -- analytics ------------------------------------------------------------------

export const totalSaved = (s: AppState) => fe.sumMinor(s.goals.map((g) => Math.max(0, g.savedMinor)));

/** Previous month's totals from the trend (null if not loaded). */
export function previousMonthTotals(s: AppState): MonthTotals | null {
  return s.trend.length >= 2 ? s.trend[s.trend.length - 2] : null;
}

export function health(s: AppState): HealthScore {
  const sp = spends(s).filter((x) => x.limitMinor != null);
  return healthScore({
    incomeMinor: incomeTotal(s),
    expensesMinor: expenseTotal(s),
    budgetedCategories: sp.length,
    categoriesOverBudget: sp.filter((x) => x.spentMinor > (x.limitMinor ?? 0)).length,
    totalSavedMinor: totalSaved(s),
    monthlySpendingMinor: averageSpending([...s.trend]) ?? expenseTotal(s),
  });
}

export interface SafeToSpend {
  perDayMinor: number;
  daysLeft: number;
  untilPayday: boolean;
  plannedSavingMinor: number;
}

/**
 * Only for the current month with income recorded. Uses the payday from the
 * questionnaire when set, otherwise the days left in the month.
 */
export function safeToSpend(s: AppState): SafeToSpend | null {
  const income = incomeTotal(s);
  if (!isViewingCurrentMonth(s) || income === 0) return null;
  const payday = s.profile?.payday ?? null;
  const daysLeft = payday != null ? daysUntilPayday(s.today, payday) : daysLeftInMonth(s.today);
  const plannedSavingMinor = s.profile ? suggestPlan(s.profile, income, s.currency).monthlySavingMinor : 0;
  return {
    perDayMinor: safeToSpendPerDay({ incomeMinor: income, spentMinor: expenseTotal(s), plannedSavingMinor, daysLeft }),
    daysLeft,
    untilPayday: payday != null,
    plannedSavingMinor,
  };
}

/** Month-end spending forecast (current month only, once spending exists). */
export function monthEndForecast(s: AppState): number | null {
  const spent = expenseTotal(s);
  if (!isViewingCurrentMonth(s) || spent === 0) return null;
  const fixed = spends(s)
    .filter((x) => x.category.key != null && (FIXED_CATEGORY_KEYS as readonly string[]).includes(x.category.key))
    .reduce((a, x) => a + x.spentMinor, 0);
  return projectMonthEndSpending(spent - fixed, s.today, fixed);
}
