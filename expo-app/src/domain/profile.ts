/**
 * First-run questionnaire → personal plan.
 *
 * Research behind the design (docs/COMPETITIVE_ANALYSIS.md §5): a quiz is
 * only worth the user's time if the answers change what they see next.
 * Every answer here changes the plan, the dashboard or the insights.
 */
import { minorPerMajor, Currency } from '../core/currency';
import { CATEGORY_KEYS, type CategoryKey } from './models';

export type MainGoal = 'emergency' | 'control' | 'debt' | 'purchase' | 'track';
export type IncomeType = 'salary' | 'irregular' | 'allowance' | 'none';
export type SavingHabit = 'rarely' | 'sometimes' | 'regularly';

export interface Profile {
  goal: MainGoal;
  incomeType: IncomeType;
  /** Day of month the salary arrives (1..31); null when not fixed. */
  payday: number | null;
  /** Category the user worries about most; null = not sure. */
  focusCategory: CategoryKey | null;
  savingHabit: SavingHabit;
}

export const DEFAULT_PROFILE: Profile = {
  goal: 'track',
  incomeType: 'salary',
  payday: null,
  focusCategory: null,
  savingHabit: 'sometimes',
};

/** Validates untrusted JSON (from storage) into a Profile; falls back safely. */
export function parseProfile(json: string | undefined | null): Profile | null {
  if (!json) return null;
  try {
    const p = JSON.parse(json) as Partial<Profile>;
    const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
      allowed.includes(v as T) ? (v as T) : d;
    return {
      goal: pick(p.goal, ['emergency', 'control', 'debt', 'purchase', 'track'] as const, DEFAULT_PROFILE.goal),
      incomeType: pick(p.incomeType, ['salary', 'irregular', 'allowance', 'none'] as const, DEFAULT_PROFILE.incomeType),
      payday: typeof p.payday === 'number' && p.payday >= 1 && p.payday <= 31 ? Math.round(p.payday) : null,
      focusCategory: (CATEGORY_KEYS as readonly string[]).includes(p.focusCategory as string) ? (p.focusCategory as CategoryKey) : null,
      savingHabit: pick(p.savingHabit, ['rarely', 'sometimes', 'regularly'] as const, DEFAULT_PROFILE.savingHabit),
    };
  } catch {
    return null;
  }
}

export interface PersonalPlan {
  /** Suggested savings share of income (fraction). */
  savingsRate: number;
  /** Suggested monthly saving, minor units (0 without income). */
  monthlySavingMinor: number;
  /** Suggested first goal, if the main goal implies one. */
  goal: { kind: 'emergency' | 'purchase'; targetMinor: number; months: number } | null;
  /** Suggested limit for the category the user worries about. */
  focusBudget: { category: CategoryKey; limitMinor: number } | null;
}

/** Round to whole major units (e.g. 237.6 OMR -> 238 OMR). */
function roundMajor(minor: number, c: Currency): number {
  const per = minorPerMajor(c);
  return Math.round(minor / per) * per;
}

/**
 * Builds a starting plan from the answers. Rules of thumb, clearly labelled
 * as such in the UI — a starting point the user can edit, not advice:
 * - Savings rate starts where the user is: rarely 10 %, sometimes 15 %,
 *   regularly 20 % (the 50/30/20 guideline's savings share).
 * - Emergency fund: 3 months of essentials, estimating essentials as 50 % of
 *   income ⇒ 1.5 × monthly income, over 12 months.
 * - Purchase goal: placeholder of 6 months of the suggested saving.
 * - Focus-category limit: 10 % of income.
 */
export function suggestPlan(profile: Profile, monthlyIncomeMinor: number, currency: Currency): PersonalPlan {
  const savingsRate = profile.savingHabit === 'regularly' ? 0.2 : profile.savingHabit === 'sometimes' ? 0.15 : 0.1;
  const income = Math.max(0, monthlyIncomeMinor);
  const monthlySavingMinor = roundMajor(income * savingsRate, currency);

  let goal: PersonalPlan['goal'] = null;
  if (income > 0 && profile.goal === 'emergency') {
    goal = { kind: 'emergency', targetMinor: roundMajor(income * 1.5, currency), months: 12 };
  } else if (income > 0 && profile.goal === 'purchase' && monthlySavingMinor > 0) {
    goal = { kind: 'purchase', targetMinor: monthlySavingMinor * 6, months: 6 };
  }

  const focusBudget =
    income > 0 && profile.focusCategory
      ? { category: profile.focusCategory, limitMinor: Math.max(minorPerMajor(currency), roundMajor(income * 0.1, currency)) }
      : null;

  return { savingsRate, monthlySavingMinor, goal, focusBudget };
}
