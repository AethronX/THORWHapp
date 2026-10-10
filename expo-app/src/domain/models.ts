import type { Day, YearMonth } from '../core/dates';

export type CategoryKey =
  | 'housing'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'telecom'
  | 'health'
  | 'education'
  | 'family'
  | 'shopping'
  | 'entertainment'
  | 'debt'
  | 'other';

/** Built-in category order — matches iconCode 0..11 in the database. */
export const CATEGORY_KEYS: readonly CategoryKey[] = [
  'housing', 'food', 'transport', 'utilities', 'telecom', 'health',
  'education', 'family', 'shopping', 'entertainment', 'debt', 'other',
];

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
  /** Paused goals are kept but left out of guidance and "at risk" checks. */
  paused: boolean;
}

/** An obligation (loan, card, instalments). remaining = original - paid. */
export interface Debt {
  id: number;
  name: string;
  originalMinor: number;
  paidMinor: number;
  remainingMinor: number;
  /** Annual rate in percent (0 = interest-free or unknown). */
  annualRatePercent: number;
  monthlyPaymentMinor: number;
  /** Day of month it is due (1..31) or null. */
  dueDay: number | null;
}

export const ASSET_KINDS = ['cash', 'bank', 'investment', 'gold', 'property', 'vehicle', 'other'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

/** Something the user owns, valued by the user (manual; may be an estimate). */
export interface Asset {
  id: number;
  name: string;
  kind: AssetKind;
  valueMinor: number;
  isEstimate: boolean;
  /** Day the value was last entered. */
  updatedDay: Day;
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
