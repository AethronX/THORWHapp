import { monthOf, sameMonth } from '../core/dates';
import * as fe from '../domain/financeEngine';
import { buildInsights, Insight } from '../domain/insights';
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
