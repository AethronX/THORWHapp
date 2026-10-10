/**
 * Guidance engine v1 — "your next step". Turns recorded data into a short,
 * ranked list of concrete steps. Every item:
 *  1. is built only from data the user actually recorded (and is skipped
 *     when there isn't enough of it),
 *  2. carries the numbers behind it, so the UI can say WHY,
 *  3. maps to one action the app can really perform,
 *  4. can be dismissed (per month) by the user.
 * Deterministic rules, no AI, no network. Not financial advice.
 * Tests: __tests__/guidance.test.ts. Money in integer minor units.
 */
import { Currency, minorPerMajor } from '../core/currency';
import { addMonths, Day, daysInMonth, monthOf, sameMonth, YearMonth, compareDays, monthsUntil } from '../core/dates';
import { FIXED_CATEGORY_KEYS } from './analytics';
import { requiredMonthlySaving } from './financeEngine';
import type { Category, CategorySpend, Expense, SavingsGoal } from './models';
import { isGoalReached } from './models';

export type GuidanceAction =
  | { type: 'addIncome' }
  | { type: 'reviewBudgets' }
  | { type: 'setBudget'; categoryId: number; suggestedLimitMinor: number }
  | { type: 'createGoal'; name: 'emergency'; targetMinor: number }
  | { type: 'openGoals' };

export type Guidance =
  | { id: 'addIncome'; kind: 'addIncome'; priority: number; action: GuidanceAction }
  | { id: 'overspending'; kind: 'overspending'; priority: number; amountMinor: number; action: GuidanceAction }
  | { id: string; kind: 'overBudget'; priority: number; categoryId: number; spentMinor: number; limitMinor: number; action: GuidanceAction }
  | { id: string; kind: 'goalAtRisk'; priority: number; goal: SavingsGoal; requiredMinor: number; netMinor: number; action: GuidanceAction }
  | {
      id: string;
      kind: 'categoryRising';
      priority: number;
      categoryId: number;
      currentMinor: number;
      previousMinor: number;
      /** Day of month compared up to (both months). */
      throughDay: number;
      pct: number;
      action: GuidanceAction;
    }
  | {
      id: 'emergencyFund';
      kind: 'emergencyFund';
      priority: number;
      monthlyEssentialMinor: number;
      monthsOfData: number;
      target3Minor: number;
      target6Minor: number;
      savedMinor: number;
      action: GuidanceAction;
    }
  | { id: string; kind: 'saveSurplus'; priority: number; netMinor: number; goal: SavingsGoal; action: GuidanceAction };

export type GuidanceKind = Guidance['kind'];

/** Rising-category rule: ≥ +25 % vs the same days last month… */
export const RISE_MIN_RATIO = 1.25;
/** …and a material difference: ≥ 3 % of the month's income (or 10 currency units without income). */
export const RISE_MIN_SHARE_OF_INCOME = 0.03;
/** Not before this day of the month (too little data). */
export const RISE_MIN_DAY = 5;
/** Emergency fund nudge until savings cover this many months of essentials. */
export const EMERGENCY_MONTHS = 3;

const roundUpToUnit = (minor: number, unit: number) => Math.ceil(minor / unit) * unit;

export function buildGuidance(args: {
  today: Day;
  incomeMinor: number;
  expensesMinor: number;
  /** Current-month spending per category, with limits. */
  spends: readonly CategorySpend[];
  /** Expenses of the current month and the 3 before it. */
  history: readonly Expense[];
  categories: readonly Category[];
  goals: readonly SavingsGoal[];
  currency: Currency;
  /** Name given to the emergency goal the app creates (to find it again). */
  emergencyGoalName: string;
}): Guidance[] {
  const { today, incomeMinor, expensesMinor, history, currency } = args;
  const unit = minorPerMajor(currency);
  const month = monthOf(today);
  const out: Guidance[] = [];
  const net = incomeMinor - expensesMinor;

  // 1. Without income nothing else can be judged.
  if (incomeMinor === 0) out.push({ id: 'addIncome', kind: 'addIncome', priority: 100, action: { type: 'addIncome' } });

  // 2. Spending above income.
  if (incomeMinor > 0 && expensesMinor > incomeMinor) {
    out.push({ id: 'overspending', kind: 'overspending', priority: 90, amountMinor: expensesMinor - incomeMinor, action: { type: 'reviewBudgets' } });
  }

  // 3. Over a category budget (largest overrun first).
  for (const sp of args.spends) {
    if (sp.limitMinor == null || sp.limitMinor === 0 || sp.spentMinor <= sp.limitMinor) continue;
    out.push({
      id: `overBudget:${sp.category.id}`,
      kind: 'overBudget',
      priority: 80 + Math.min(9, (sp.spentMinor - sp.limitMinor) / sp.limitMinor),
      categoryId: sp.category.id,
      spentMinor: sp.spentMinor,
      limitMinor: sp.limitMinor,
      action: { type: 'setBudget', categoryId: sp.category.id, suggestedLimitMinor: sp.limitMinor },
    });
  }

  // 4. A goal that this month's recorded net can't keep on schedule.
  if (incomeMinor > 0) {
    for (const g of args.goals) {
      if (g.paused || isGoalReached(g) || compareDays(g.targetDate, today) < 0) continue;
      const required = requiredMonthlySaving({ targetMinor: g.targetMinor, savedMinor: g.savedMinor, months: monthsUntil(today, g.targetDate) });
      if (required > Math.max(0, net)) {
        out.push({ id: `goalAtRisk:${g.id}`, kind: 'goalAtRisk', priority: 70, goal: g, requiredMinor: required, netMinor: net, action: { type: 'openGoals' } });
      }
    }
  }

  // 5. Everyday category rising vs the SAME days of last month (no budget set yet).
  const byId = new Map(args.categories.map((c) => [c.id, c]));
  const fixed = new Set(FIXED_CATEGORY_KEYS as readonly string[]);
  if (today.day >= RISE_MIN_DAY) {
    const prevMonth = addMonths(month, -1);
    const through = Math.min(today.day, daysInMonth(prevMonth.year, prevMonth.month));
    const minDelta = incomeMinor > 0 ? Math.round(incomeMinor * RISE_MIN_SHARE_OF_INCOME) : 10 * unit;
    const cur = new Map<number, number>();
    const prev = new Map<number, number>();
    const prevFull = new Map<number, number>();
    for (const e of history) {
      const m = monthOf(e.date);
      if (sameMonth(m, month) && e.date.day <= today.day) cur.set(e.categoryId, (cur.get(e.categoryId) ?? 0) + e.amountMinor);
      if (sameMonth(m, prevMonth)) {
        prevFull.set(e.categoryId, (prevFull.get(e.categoryId) ?? 0) + e.amountMinor);
        if (e.date.day <= through) prev.set(e.categoryId, (prev.get(e.categoryId) ?? 0) + e.amountMinor);
      }
    }
    const budgeted = new Set(args.spends.filter((x) => x.limitMinor != null).map((x) => x.category.id));
    for (const [id, c] of cur) {
      const cat = byId.get(id);
      const p = prev.get(id) ?? 0;
      if (!cat || cat.archived || budgeted.has(id) || (cat.key && fixed.has(cat.key)) || p <= 0) continue;
      if (c < p * RISE_MIN_RATIO || c - p < minDelta) continue;
      const pct = (c - p) / p;
      out.push({
        id: `categoryRising:${id}`,
        kind: 'categoryRising',
        priority: 60 + Math.min(9, pct),
        categoryId: id,
        currentMinor: c,
        previousMinor: p,
        throughDay: Math.min(today.day, through),
        pct,
        // Never below what is already spent this month (or the limit would be broken on day one).
        action: { type: 'setBudget', categoryId: id, suggestedLimitMinor: roundUpToUnit(Math.max(prevFull.get(id) ?? p, c), unit) },
      });
    }
  }

  // 6. Emergency fund from recorded ESSENTIAL spending of the last 3 months.
  const essential = new Set(args.categories.filter((c) => c.isEssential).map((c) => c.id));
  const monthTotals = [1, 2, 3].map((k) => {
    const m = addMonths(month, -k);
    return history.filter((e) => essential.has(e.categoryId) && sameMonth(monthOf(e.date), m)).reduce((t, e) => t + e.amountMinor, 0);
  });
  const withData = monthTotals.filter((t) => t > 0);
  if (withData.length >= 2) {
    const monthly = Math.round(withData.reduce((a, b) => a + b, 0) / withData.length);
    const emergencyGoal = args.goals.find((g) => g.name.trim() === args.emergencyGoalName.trim());
    const saved = emergencyGoal ? Math.max(0, emergencyGoal.savedMinor) : args.goals.reduce((t, g) => t + Math.max(0, g.savedMinor), 0);
    if (monthly > 0 && saved < monthly * EMERGENCY_MONTHS) {
      const target3 = roundUpToUnit(monthly * 3, unit);
      out.push({
        id: 'emergencyFund',
        kind: 'emergencyFund',
        priority: 50,
        monthlyEssentialMinor: monthly,
        monthsOfData: withData.length,
        target3Minor: target3,
        target6Minor: roundUpToUnit(monthly * 6, unit),
        savedMinor: saved,
        action: emergencyGoal ? { type: 'openGoals' } : { type: 'createGoal', name: 'emergency', targetMinor: target3 },
      });
    }
  }

  // 7. Late in the month with a positive net and an open goal: suggest putting some aside.
  const open = args.goals.find((g) => !g.paused && !isGoalReached(g) && compareDays(g.targetDate, today) >= 0);
  if (incomeMinor > 0 && net > 0 && open && today.day >= 20) {
    out.push({ id: `saveSurplus:${open.id}`, kind: 'saveSurplus', priority: 20, netMinor: net, goal: open, action: { type: 'openGoals' } });
  }

  return out.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

/** Remove items the user dismissed this month. `dismissed`: id → "YYYY-MM". */
export function withoutDismissed(items: Guidance[], dismissed: Readonly<Record<string, string>>, month: YearMonth): Guidance[] {
  const key = `${month.year}-${String(month.month).padStart(2, '0')}`;
  return items.filter((g) => dismissed[g.id] !== key);
}
