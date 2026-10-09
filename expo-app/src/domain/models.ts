import type { Day, YearMonth } from '../core/dates';

/** Built-in categories have a stable `key` (localised in the UI) and no name. */
export interface Category {
  id: number;
  key: string | null;
  name: string | null;
  iconCode: number;
  /** Counts toward essential spending (emergency-fund estimate). */
  isEssential: boolean;
  archived: boolean;
}

export interface Expense {
  id: number;
  amountMinor: number;
  categoryId: number;
  date: Day;
  note: string;
}

export interface IncomeEntry {
  id: number;
  month: YearMonth;
  amountMinor: number;
  label: string;
}

export interface Budget {
  categoryId: number;
  limitMinor: number;
}

export interface SavingsGoal {
  id: number;
  name: string;
  targetMinor: number;
  /** Sum of recorded contributions. */
  savedMinor: number;
  targetDate: Day;
}

export const isGoalReached = (g: SavingsGoal) => g.savedMinor >= g.targetMinor;

export interface CategorySpend {
  category: Category;
  spentMinor: number;
  limitMinor: number | null;
}

export function spendUsage(s: CategorySpend): number | null {
  return s.limitMinor == null || s.limitMinor === 0 ? null : s.spentMinor / s.limitMinor;
}
