/**
 * Spending seasons ("المواسم"): Ramadan + Eid al-Fitr, and Eid al-Adha.
 *
 * Why (docs/BEHAVIORAL_STUDY.md): spending in the Gulf rises sharply around
 * Ramadan and the Eids, and a reminder tied to a SPECIFIC upcoming expense
 * raised savings more than a generic reminder in a field experiment
 * (Karlan et al., NBER w16205). So the app proposes a small "season fund"
 * a few months ahead, paid in monthly steps.
 *
 * Dates are the expected Umm al-Qura dates and are APPROXIMATE: the actual
 * start depends on the moon sighting announced in each country (±1–2 days).
 * The UI says so. Table needs extending before 2030 (test guards this).
 */
import { compareDays, Day } from '../core/dates';

export type SeasonKey = 'ramadan' | 'eidAdha';

export interface Season {
  key: SeasonKey;
  /** Expected first day (Ramadan) or Eid day. Approximate. */
  date: Day;
}

const d = (year: number, month: number, day: number): Day => ({ year, month, day });

/** Expected dates (Umm al-Qura calendar; subject to moon sighting). Sorted. */
export const SEASONS: readonly Season[] = [
  { key: 'ramadan', date: d(2026, 2, 18) },
  { key: 'eidAdha', date: d(2026, 5, 27) },
  { key: 'ramadan', date: d(2027, 2, 8) },
  { key: 'eidAdha', date: d(2027, 5, 16) },
  { key: 'ramadan', date: d(2028, 1, 28) },
  { key: 'eidAdha', date: d(2028, 5, 5) },
  { key: 'ramadan', date: d(2029, 1, 16) },
  { key: 'eidAdha', date: d(2029, 4, 24) },
];

/** Propose a season fund when the season is this close… */
export const SEASON_LOOKAHEAD_DAYS = 150;
/** …but not when it is too near to save meaningfully. */
export const SEASON_MIN_DAYS = 10;

const DAY_MS = 86_400_000;
export const daysBetween = (from: Day, to: Day) =>
  Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / DAY_MS);

/** The next season (if any) starting within the lookahead window. */
export function nextSeason(today: Day, table: readonly Season[] = SEASONS): (Season & { daysAway: number }) | null {
  for (const s of table) {
    if (compareDays(s.date, today) < 0) continue;
    const daysAway = daysBetween(today, s.date);
    if (daysAway < SEASON_MIN_DAYS) continue;
    return daysAway <= SEASON_LOOKAHEAD_DAYS ? { ...s, daysAway } : null;
  }
  return null;
}

/** Target date for the fund: one week before the season, when shopping starts. */
export function seasonFundDate(s: Season): Day {
  const t = new Date(Date.UTC(s.date.year, s.date.month - 1, s.date.day) - 7 * DAY_MS);
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}
