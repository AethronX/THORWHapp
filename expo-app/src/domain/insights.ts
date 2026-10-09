import { compareDays, Day, monthsUntil } from '../core/dates';
import { requiredMonthlySaving } from './financeEngine';
import { CategorySpend, isGoalReached, SavingsGoal } from './models';

/** Rule-based, explainable insights (coach v0). No AI, no network. */
export type InsightKind =
  | 'noIncome'
  | 'negativeCashFlow'
  | 'overBudget'
  | 'nearBudget'
  | 'goalAtRisk'
  | 'goalOverdue';

export type InsightSeverity = 'info' | 'warning' | 'critical';
const SEVERITY_RANK: Record<InsightSeverity, number> = { info: 0, warning: 1, critical: 2 };

export interface Insight {
  kind: InsightKind;
  severity: InsightSeverity;
  categoryId?: number;
  goal?: SavingsGoal;
  amountMinor?: number;
  requiredMonthlyMinor?: number;
}

export const NEAR_BUDGET_THRESHOLD = 0.8;

/** Insights for one month, most severe first. `today` is injected. */
export function buildInsights(args: {
  incomeMinor: number;
  expensesMinor: number;
  spends: CategorySpend[];
  goals: SavingsGoal[];
  today: Day;
  /** Only judge goal feasibility against the current month. */
  assessGoalFeasibility?: boolean;
}): Insight[] {
  const { incomeMinor, expensesMinor, spends, goals, today } = args;
  const assess = args.assessGoalFeasibility ?? true;
  const out: Insight[] = [];

  if (incomeMinor === 0 && expensesMinor > 0) {
    out.push({ kind: 'noIncome', severity: 'info' });
  } else if (expensesMinor > incomeMinor) {
    out.push({
      kind: 'negativeCashFlow',
      severity: 'critical',
      amountMinor: expensesMinor - incomeMinor,
    });
  }

  for (const s of spends) {
    const limit = s.limitMinor;
    if (limit == null || limit === 0) continue;
    if (s.spentMinor > limit) {
      out.push({
        kind: 'overBudget',
        severity: 'warning',
        categoryId: s.category.id,
        amountMinor: s.spentMinor - limit,
      });
    } else if (s.spentMinor >= limit * NEAR_BUDGET_THRESHOLD) {
      out.push({
        kind: 'nearBudget',
        severity: 'info',
        categoryId: s.category.id,
        amountMinor: limit - s.spentMinor,
      });
    }
  }

  const net = incomeMinor - expensesMinor;
  for (const g of goals) {
    if (isGoalReached(g)) continue;
    if (compareDays(g.targetDate, today) < 0) {
      out.push({
        kind: 'goalOverdue',
        severity: 'warning',
        goal: g,
        amountMinor: g.targetMinor - g.savedMinor,
      });
      continue;
    }
    const required = requiredMonthlySaving({
      targetMinor: g.targetMinor,
      savedMinor: g.savedMinor,
      months: monthsUntil(today, g.targetDate),
    });
    if (assess && incomeMinor > 0 && required > net) {
      out.push({ kind: 'goalAtRisk', severity: 'warning', goal: g, requiredMonthlyMinor: required });
    }
  }

  // Stable sort: equal severities keep rule order.
  return out
    .map((x, i) => ({ x, i }))
    .sort((a, b) => SEVERITY_RANK[b.x.severity] - SEVERITY_RANK[a.x.severity] || a.i - b.i)
    .map(({ x }) => x);
}
