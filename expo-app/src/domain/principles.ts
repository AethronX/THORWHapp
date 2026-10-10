/**
 * "Wealth principles" — well-known ideas from popular money books, each
 * checked against the user's OWN recorded data, with one action.
 *
 * Rules (D-040): the ideas are summarised in our own words (no quotes, no
 * affiliation); a principle only gets a verdict when the data supports one
 * ("needsData" otherwise); thresholds come from the book itself (Clason's
 * one tenth) or from the app's existing, documented rules (3 months of
 * essentials); no investment product advice, no promised returns.
 * Tests: __tests__/principles.test.ts. Money in integer minor units.
 */
import { addMonths, Day, monthOf, sameMonth, YearMonth } from '../core/dates';
import { FIXED_CATEGORY_KEYS } from './analytics';
import type { Asset, Category, CategorySpend, Debt, Expense, SavingsGoal } from './models';

export type PrincipleKey = 'payYourselfFirst' | 'roomForError' | 'measureWealth' | 'assetsVsLiabilities' | 'debtFocus' | 'consciousSpending';
export type PrincipleStatus = 'good' | 'opportunity' | 'needsData';

export type PrincipleAction =
  | { type: 'openGoals' }
  | { type: 'openWealth' }
  | { type: 'addIncome' }
  | { type: 'reviewBudgets' }
  | { type: 'setBudget'; categoryId: number };

export type PrincipleResult =
  | { key: 'payYourselfFirst'; status: PrincipleStatus; rate: number | null; action: PrincipleAction }
  | { key: 'roomForError'; status: PrincipleStatus; months: number | null; liquidMinor: number; monthlyEssentialMinor: number; action: PrincipleAction }
  | { key: 'measureWealth'; status: PrincipleStatus; netMinor: number | null; action: PrincipleAction }
  | { key: 'assetsVsLiabilities'; status: PrincipleStatus; paymentsMinor: number; share: number | null; action: PrincipleAction }
  | {
      key: 'debtFocus';
      status: PrincipleStatus;
      openDebts: number;
      /** Smallest balance first (Ramsey's "snowball"). */
      snowball: Debt | null;
      /** Highest rate first ("avalanche" — least interest). */
      avalanche: Debt | null;
      action: PrincipleAction;
    }
  | { key: 'consciousSpending'; status: PrincipleStatus; categoryId: number | null; spentMinor: number; share: number; action: PrincipleAction };

/** Clason, "The Richest Man in Babylon": keep at least one tenth of what you earn. */
export const PAY_FIRST_RATE = 0.1;
/** Same 3-month buffer the guidance engine uses (EMERGENCY_MONTHS). */
export const ROOM_FOR_ERROR_MONTHS = 3;
/** Conscious spending only flags a category that is a material share of spending. */
export const CONSCIOUS_MIN_SHARE = 0.05;
/** Liquid = what can be used quickly. */
const LIQUID_KINDS = new Set<Asset['kind']>(['cash', 'bank']);

/** Recorded essential spending of each of the 3 months before `month` that has any (0–3 values). */
export function essentialMonthTotals(history: readonly Expense[], categories: readonly Category[], month: YearMonth): number[] {
  const essential = new Set(categories.filter((c) => c.isEssential).map((c) => c.id));
  return [1, 2, 3]
    .map((k) => addMonths(month, -k))
    .map((m) => history.filter((e) => essential.has(e.categoryId) && sameMonth(monthOf(e.date), m)).reduce((t, e) => t + e.amountMinor, 0))
    .filter((t) => t > 0);
}

/** Money usable quickly: goal savings + cash/bank assets. */
export function liquidSavings(goals: readonly SavingsGoal[], assets: readonly Asset[]): number {
  return goals.reduce((t, g) => t + Math.max(0, g.savedMinor), 0) + assets.filter((a) => LIQUID_KINDS.has(a.kind)).reduce((t, a) => t + a.valueMinor, 0);
}

export function evaluatePrinciples(args: {
  today: Day;
  incomeMinor: number;
  /** Month-end forecast when available, else spending so far. */
  expensesMinor: number;
  /** Current month and the 3 before it. */
  history: readonly Expense[];
  categories: readonly Category[];
  spends: readonly CategorySpend[];
  goals: readonly SavingsGoal[];
  debts: readonly Debt[];
  assets: readonly Asset[];
}): PrincipleResult[] {
  const { incomeMinor, expensesMinor } = args;
  const month = monthOf(args.today);
  const out: PrincipleResult[] = [];

  // 1. Pay yourself first.
  if (incomeMinor <= 0) out.push({ key: 'payYourselfFirst', status: 'needsData', rate: null, action: { type: 'addIncome' } });
  else {
    const rate = (incomeMinor - expensesMinor) / incomeMinor;
    out.push({ key: 'payYourselfFirst', status: rate >= PAY_FIRST_RATE ? 'good' : 'opportunity', rate, action: rate >= PAY_FIRST_RATE ? { type: 'openGoals' } : { type: 'reviewBudgets' } });
  }

  // 2. Room for error: liquid savings vs monthly essential spending (needs ≥ 2 months of data).
  const totals = essentialMonthTotals(args.history, args.categories, month);
  const liquid = liquidSavings(args.goals, args.assets);
  if (totals.length < 2) out.push({ key: 'roomForError', status: 'needsData', months: null, liquidMinor: liquid, monthlyEssentialMinor: 0, action: { type: 'openGoals' } });
  else {
    const monthly = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
    const months = liquid / monthly;
    out.push({ key: 'roomForError', status: months >= ROOM_FOR_ERROR_MONTHS ? 'good' : 'opportunity', months, liquidMinor: liquid, monthlyEssentialMinor: monthly, action: { type: 'openGoals' } });
  }

  // 3. Measure wealth, not income.
  const open = args.debts.filter((d) => d.remainingMinor > 0);
  if (args.assets.length === 0 && args.debts.length === 0) out.push({ key: 'measureWealth', status: 'needsData', netMinor: null, action: { type: 'openWealth' } });
  else {
    const net = args.assets.reduce((t, a) => t + a.valueMinor, 0) - open.reduce((t, d) => t + d.remainingMinor, 0);
    out.push({ key: 'measureWealth', status: 'good', netMinor: net, action: { type: 'openWealth' } });
  }

  // 4. Assets put money in, liabilities take it out: share of income going to obligations.
  const payments = open.reduce((t, d) => t + d.monthlyPaymentMinor, 0);
  if (open.length === 0) out.push({ key: 'assetsVsLiabilities', status: args.debts.length > 0 || args.assets.length > 0 ? 'good' : 'needsData', paymentsMinor: 0, share: null, action: { type: 'openWealth' } });
  else out.push({ key: 'assetsVsLiabilities', status: 'opportunity', paymentsMinor: payments, share: incomeMinor > 0 ? payments / incomeMinor : null, action: { type: 'openWealth' } });

  // 5. One debt at a time: snowball (smallest balance) vs avalanche (highest rate).
  if (open.length === 0) out.push({ key: 'debtFocus', status: args.debts.length > 0 || args.assets.length > 0 ? 'good' : 'needsData', openDebts: 0, snowball: null, avalanche: null, action: { type: 'openWealth' } });
  else {
    const snowball = [...open].sort((a, b) => a.remainingMinor - b.remainingMinor || a.id - b.id)[0];
    const avalanche = [...open].sort((a, b) => b.annualRatePercent - a.annualRatePercent || a.remainingMinor - b.remainingMinor || a.id - b.id)[0];
    out.push({ key: 'debtFocus', status: 'opportunity', openDebts: open.length, snowball, avalanche, action: { type: 'openWealth' } });
  }

  // 6. Conscious spending: the biggest everyday (non-essential, non-fixed) category without a limit,
  //    if it is at least 5 % of this month's spending (smaller ones aren't worth a decision).
  const fixed = new Set(FIXED_CATEGORY_KEYS as readonly string[]);
  const total = args.spends.reduce((t, x) => t + x.spentMinor, 0);
  const free = args.spends
    .filter((x) => x.spentMinor > 0 && !x.category.isEssential && !(x.category.key && fixed.has(x.category.key)))
    .sort((a, b) => b.spentMinor - a.spentMinor || a.category.id - b.category.id);
  if (free.length === 0) out.push({ key: 'consciousSpending', status: 'needsData', categoryId: null, spentMinor: 0, share: 0, action: { type: 'reviewBudgets' } });
  else {
    const open1 = free.find((x) => x.limitMinor == null && total > 0 && x.spentMinor / total >= CONSCIOUS_MIN_SHARE);
    if (!open1) out.push({ key: 'consciousSpending', status: 'good', categoryId: null, spentMinor: 0, share: 0, action: { type: 'reviewBudgets' } });
    else
      out.push({
        key: 'consciousSpending',
        status: 'opportunity',
        categoryId: open1.category.id,
        spentMinor: open1.spentMinor,
        share: total > 0 ? open1.spentMinor / total : 0,
        action: { type: 'setBudget', categoryId: open1.category.id },
      });
  }

  return out;
}

/** How many principles the user is already applying (of those with enough data). */
export function principleScore(results: readonly PrincipleResult[]): { good: number; judged: number; total: number } {
  return {
    good: results.filter((r) => r.status === 'good').length,
    judged: results.filter((r) => r.status !== 'needsData').length,
    total: results.length,
  };
}
