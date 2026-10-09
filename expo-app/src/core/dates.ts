/**
 * Calendar-date helpers (DECISIONS D-006).
 * - A calendar day is stored as a local `YYYY-MM-DD` string and a month as
 *   `YYYY-MM`. They are never converted through a time zone.
 * - Audit timestamps are UTC epoch milliseconds.
 * - A "date" in memory is a `Day` value object, not a JS Date, so time zones
 *   can't leak into money logic.
 */

export interface Day {
  readonly year: number;
  readonly month: number; // 1..12
  readonly day: number; // 1..31
}

export interface YearMonth {
  readonly year: number;
  readonly month: number; // 1..12
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month = last day of this month (local calendar).
  return new Date(year, month, 0).getDate();
}

export function dayFromDate(d: Date): Day {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function dayToDate(d: Day): Date {
  return new Date(d.year, d.month - 1, d.day);
}

export function dayKey(d: Day): string {
  return `${pad(d.year, 4)}-${pad(d.month)}-${pad(d.day)}`;
}

export function parseDayKey(s: string): Day {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`Bad day key: ${s}`);
  return { year: +m[1], month: +m[2], day: +m[3] };
}

export function compareDays(a: Day, b: Day): number {
  return dayKey(a) < dayKey(b) ? -1 : dayKey(a) > dayKey(b) ? 1 : 0;
}

export function monthOf(d: Day): YearMonth {
  return { year: d.year, month: d.month };
}

export function monthKey(m: YearMonth): string {
  return `${pad(m.year, 4)}-${pad(m.month)}`;
}

export function parseMonthKey(s: string): YearMonth {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`Bad month key: ${s}`);
  return { year: +m[1], month: +m[2] };
}

export function addMonths(m: YearMonth, n: number): YearMonth {
  const total = m.year * 12 + (m.month - 1) + n;
  return { year: Math.floor(total / 12), month: (total % 12 + 12) % 12 + 1 };
}

export function sameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

export function firstDayKey(m: YearMonth): string {
  return `${monthKey(m)}-01`;
}

export function lastDayKey(m: YearMonth): string {
  return `${monthKey(m)}-${pad(daysInMonth(m.year, m.month))}`;
}

/**
 * Number of month-end deposits on or before `to`, starting with the end of
 * `from`'s month (matches the engine's end-of-month deposit rule, D-018).
 * From 2026-10-09: to 2027-04-01 => 6, to 2027-04-30 => 7, to 2026-10-31 => 1,
 * to 2026-10-20 => 0. Never negative.
 */
export function monthsUntil(from: Day, to: Day): number {
  let m = (to.year - from.year) * 12 + (to.month - from.month);
  if (to.day === daysInMonth(to.year, to.month)) m += 1;
  return m < 0 ? 0 : m;
}
