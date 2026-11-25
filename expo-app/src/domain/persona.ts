/**
 * "Your money personality" (D-045): how the user actually spends, read
 * from their OWN recorded everyday expenses (fixed bills excluded), with
 * each trait compared to what an even spread would give.
 *
 * Honesty rules: no verdict below a minimum of data; every number shown is
 * computed from the user's records; nothing is compared with "other users"
 * (we have no such data). Gulf weekends differ by country, so the weekend
 * follows the currency: UAE Sat–Sun (since 2022); Saudi Arabia, Oman,
 * Qatar, Kuwait, Bahrain, Jordan, Egypt Fri–Sat.
 * Tests: __tests__/persona.test.ts.
 */
import { weekendOf } from '../core/countries';
import { addDays, Day, dayKey, dayToDate, daysInMonth } from '../core/dates';
import { FIXED_CATEGORY_KEYS } from './analytics';
import type { Category, Expense } from './models';

export type TraitKey = 'paydayRush' | 'weekend' | 'focus';
export type PersonaKey = 'paydaySprinter' | 'weekender' | 'focused' | 'steady';

export interface Trait {
  key: TraitKey;
  /** Share of everyday spending (0..1). */
  share: number;
  /** What an even spread would give (0..1). */
  baseline: number;
  /** share ≥ STRONG_LIFT × baseline. */
  strong: boolean;
  /** focus: the category; otherwise null. */
  categoryId: number | null;
}

export type Persona =
  | { status: 'needsData'; expenses: number; days: number }
  /** Enough to show a shape, not enough to call it settled: traits are labelled provisional. */
  | { status: 'provisional'; key: PersonaKey; traits: Trait[]; everydayMinor: number; expenses: number; days: number }
  | { status: 'ready'; key: PersonaKey; traits: Trait[]; everydayMinor: number; expenses: number; days: number };

/**
 * Two gates instead of one wall (D-052). A reading needs enough days to see a
 * weekly rhythm and a pay cycle, and enough entries for shares to mean
 * anything — but a user recording a few things a day should see a shape within
 * two weeks, not stare at "record a little more" for a month.
 */
export const MIN_EXPENSES = 15;
export const MIN_SPAN_DAYS = 21;
/** Provisional reading: the same traits, shown as "early days" rather than settled. */
export const EARLY_EXPENSES = 8;
export const EARLY_SPAN_DAYS = 10;
export const STRONG_LIFT = 1.5;
/** "Right after payday" = the payday and the 6 days after it. */
export const RUSH_DAYS = 7;
/** A single category only defines the persona when it is close to half of everyday spending. */
export const FOCUS_MIN_SHARE = 0.45;

/**
 * Weekend days as JS getDay() numbers (0 Sun … 5 Fri, 6 Sat).
 * Taken from the user's country, not their currency: a currency says nothing
 * about where someone lives, and several Arab countries share one (D-055).
 */
export function weekendDays(countryCode: string | null | undefined, currencyCode: string): readonly number[] {
  return weekendOf(countryCode, currencyCode);
}

/** Days since the most recent payday on or before `d` (0 = payday itself). */
export function daysSincePayday(d: Day, payday: number): number {
  const pd = (y: number, m: number) => Math.min(Math.max(1, Math.round(payday)), daysInMonth(y, m));
  const here = pd(d.year, d.month);
  if (d.day >= here) return d.day - here;
  const pm = d.month === 1 ? { y: d.year - 1, m: 12 } : { y: d.year, m: d.month - 1 };
  return daysInMonth(pm.y, pm.m) - pd(pm.y, pm.m) + d.day;
}

export function readPersona(args: { history: readonly Expense[]; categories: readonly Category[]; currencyCode: string; countryCode?: string | null; payday: number | null }): Persona {
  const fixedKeys = new Set(FIXED_CATEGORY_KEYS as readonly string[]);
  const fixed = new Set(args.categories.filter((c) => c.key && fixedKeys.has(c.key)).map((c) => c.id));
  const items = args.history.filter((e) => e.amountMinor > 0 && !fixed.has(e.categoryId));
  const times = items.map((e) => dayToDate(e.date).getTime());
  const days = times.length ? Math.round((Math.max(...times) - Math.min(...times)) / 86400000) + 1 : 0;
  if (items.length < EARLY_EXPENSES || days < EARLY_SPAN_DAYS) return { status: 'needsData', expenses: items.length, days };
  const settled = items.length >= MIN_EXPENSES && days >= MIN_SPAN_DAYS;

  const total = items.reduce((t, e) => t + e.amountMinor, 0);
  const share = (pred: (e: Expense) => boolean) => items.filter(pred).reduce((t, e) => t + e.amountMinor, 0) / total;
  const trait = (key: TraitKey, s: number, baseline: number, categoryId: number | null = null): Trait => ({ key, share: s, baseline, strong: s >= baseline * STRONG_LIFT, categoryId });
  const traits: Trait[] = [];

  const payday = args.payday;
  if (payday != null)
    traits.push(
      trait(
        'paydayRush',
        share((e) => daysSincePayday(e.date, payday) < RUSH_DAYS),
        RUSH_DAYS / 30,
      ),
    );

  const wk = weekendDays(args.countryCode, args.currencyCode);
  traits.push(
    trait(
      'weekend',
      share((e) => wk.includes(dayToDate(e.date).getDay())),
      wk.length / 7,
    ),
  );

  const byCat = new Map<number, number>();
  for (const e of items) byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amountMinor);
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  if (cats.length >= 2) traits.push(trait('focus', cats[0][1] / total, 1 / cats.length, cats[0][0]));

  // Persona = the strongest trait by lift over its baseline.
  const candidates = traits.filter((t) => t.strong && (t.key !== 'focus' || t.share >= FOCUS_MIN_SHARE)).sort((a, b) => b.share / b.baseline - a.share / a.baseline);
  const map: Record<TraitKey, PersonaKey> = { paydayRush: 'paydaySprinter', weekend: 'weekender', focus: 'focused' };
  return { status: settled ? 'ready' : 'provisional', key: candidates.length ? map[candidates[0].key] : 'steady', traits, everydayMinor: total, expenses: items.length, days };
}

/**
 * Consecutive days, counting back from today, on which something was
 * recorded (D-051). A habit signal, not a score: it is shown only while it
 * is running, never as a failure, and today not being recorded yet does not
 * break it — the streak then counts back from yesterday.
 */
export function recordingStreak(history: readonly Expense[], today: Day): number {
  // Calendar days, not 24-hour blocks: millisecond stepping skips a day across
  // a daylight-saving transition and read the streak one day short (D-054).
  const days = new Set(history.map((e) => dayKey(e.date)));
  const has = (offset: number) => days.has(dayKey(addDays(today, -offset)));
  let start = has(0) ? 0 : has(1) ? 1 : -1;
  if (start < 0) return 0;
  let n = 0;
  while (has(start + n)) n += 1;
  return n;
}
