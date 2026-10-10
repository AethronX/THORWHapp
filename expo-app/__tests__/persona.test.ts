import { FIXED_CATEGORY_KEYS } from '../src/domain/analytics';
import type { Category, CategoryKey, Expense } from '../src/domain/models';
import { daysSincePayday, MIN_EXPENSES, readPersona, weekendDays } from '../src/domain/persona';

const KEYS: CategoryKey[] = ['housing', 'food', 'transport', 'utilities', 'telecom', 'health', 'education', 'family', 'shopping', 'entertainment', 'debt', 'other'];
const cats: Category[] = KEYS.map((key, i) => ({ id: i + 1, key, name: '', iconCode: i, isEssential: false, archived: false }));
const id = (k: CategoryKey) => KEYS.indexOf(k) + 1;
let n = 1;
const ex = (k: CategoryKey, omr: number, month: number, day: number): Expense => ({ id: n++, amountMinor: omr * 1000, categoryId: id(k), date: { year: 2026, month, day }, note: '' });
const base = { categories: cats, currencyCode: 'OMR', payday: 25 as number | null };

test('no verdict without enough data', () => {
  const few = Array.from({ length: 5 }, (_, i) => ex('food', 1, 10, i + 1));
  expect(readPersona({ ...base, history: few })).toEqual({ status: 'needsData', expenses: 5, days: 5 });
  // Enough expenses but all in one week: still not enough span.
  const dense = Array.from({ length: MIN_EXPENSES + 2 }, (_, i) => ex('food', 1, 10, 1 + (i % 5)));
  expect(readPersona({ ...base, history: dense }).status).toBe('needsData');
});

test('fixed bills are excluded from "everyday" spending', () => {
  expect(FIXED_CATEGORY_KEYS).toContain('housing');
  const history = [...Array.from({ length: MIN_EXPENSES + 1 }, (_, i) => ex('food', 1, 9, 1 + i)), ex('housing', 500, 9, 1), ex('food', 1, 10, 5)];
  const r = readPersona({ ...base, history });
  expect(r.status).toBe('ready');
  if (r.status === 'ready') expect(r.everydayMinor).toBe((MIN_EXPENSES + 2) * 1000);
});

test('weekend differs by country: UAE Sat–Sun, Oman and Saudi Fri–Sat', () => {
  expect(weekendDays('AED')).toEqual([6, 0]);
  expect(weekendDays('OMR')).toEqual([5, 6]);
  expect(weekendDays('SAR')).toEqual([5, 6]);
});

test('days since payday crosses the month boundary', () => {
  expect(daysSincePayday({ year: 2026, month: 10, day: 25 }, 25)).toBe(0);
  expect(daysSincePayday({ year: 2026, month: 10, day: 28 }, 25)).toBe(3);
  // 2 October with payday 25: 30 September was the payday → 30, 1, 2 = 2 days.
  expect(daysSincePayday({ year: 2026, month: 10, day: 2 }, 25)).toBe(7);
  // Payday 31 in a 30-day month clamps to the last day.
  expect(daysSincePayday({ year: 2026, month: 9, day: 30 }, 31)).toBe(0);
});

test('payday sprinter: most of the money goes in the week after the salary', () => {
  const history = [...Array.from({ length: 10 }, (_, i) => ex('shopping', 20, 9, 25 + (i % 5))), ...Array.from({ length: 10 }, (_, i) => ex('food', 1, 10, 10 + i))];
  const r = readPersona({ ...base, history });
  expect(r.status === 'ready' && r.key).toBe('paydaySprinter');
  const t = r.status === 'ready' && r.traits.find((x) => x.key === 'paydayRush');
  expect(t && t.strong).toBe(true);
});

test('no payday recorded: no payday trait, and the persona uses the rest', () => {
  const history = Array.from({ length: 20 }, (_, i) => ex('food', 1, 9, 1 + i));
  const r = readPersona({ ...base, payday: null, history });
  expect(r.status === 'ready' && r.traits.some((x) => x.key === 'paydayRush')).toBe(false);
});

test('one dominant category makes a "focused" persona; an even spread is "steady"', () => {
  // Fridays/Saturdays left out of it: spread over weekdays across a month.
  const spread = (k: CategoryKey, omr: number) => Array.from({ length: 10 }, (_, i) => ex(k, omr, 9, 1 + i * 3));
  const focused = readPersona({ ...base, payday: null, history: [...spread('shopping', 20), ...spread('food', 1)] });
  expect(focused.status === 'ready' && focused.key).toBe('focused');
  const steady = readPersona({ ...base, payday: null, history: [...spread('shopping', 2), ...spread('food', 2), ...spread('other', 2)] });
  expect(steady.status === 'ready' && steady.key).toBe('steady');
});
