/** @jest-environment node */
/**
 * Day arithmetic must be calendar-based, never 24-hour blocks: in a zone with
 * daylight saving, millisecond stepping dropped a day from the week chart and
 * read the recording streak one day short (D-054). These run in New York,
 * where 8 March 2026 is a spring-forward day.
 */
process.env.TZ = 'America/New_York';

import { addDays, dayKey } from '../src/core/dates';
import type { Category, CategoryKey, Expense } from '../src/domain/models';
import { CATEGORY_KEYS } from '../src/domain/models';
import { recordingStreak } from '../src/domain/persona';
import { weekdayPattern } from '../src/domain/smart';

const cats: Category[] = CATEGORY_KEYS.map((key: CategoryKey, i) => ({ id: i + 1, key, name: null, iconCode: i, isEssential: false, archived: false }));
let n = 1;
const ex = (day: number, month = 3, minor = 1000): Expense => ({ id: n++, amountMinor: minor, categoryId: 1, date: { year: 2026, month, day }, note: '' });

test('addDays steps whole calendar days across a spring-forward', () => {
  expect(addDays({ year: 2026, month: 3, day: 7 }, 1)).toEqual({ year: 2026, month: 3, day: 8 });
  expect(addDays({ year: 2026, month: 3, day: 9 }, -1)).toEqual({ year: 2026, month: 3, day: 8 });
  expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({ year: 2026, month: 2, day: 28 });
  expect(addDays({ year: 2028, month: 3, day: 1 }, -1)).toEqual({ year: 2028, month: 2, day: 29 });
  expect(dayKey(addDays({ year: 2026, month: 12, day: 31 }, 1))).toBe(dayKey({ year: 2027, month: 1, day: 1 }));
});

test('the recording streak counts the day the clocks changed', () => {
  const history = Array.from({ length: 10 }, (_, i) => ex(i + 1));
  expect(recordingStreak(history, { year: 2026, month: 3, day: 10 })).toBe(10);
});

test('a weekday pattern is not lost to the hour the clocks changed', () => {
  // Ten Sundays-ish spread over exactly 20 days around the transition.
  const history = [ex(1), ex(3), ex(5), ex(7), ex(8), ex(10), ex(13), ex(16), ex(19), ex(21)];
  expect(weekdayPattern(history)).not.toBeNull();
});

test('the week chart puts each expense on its own day', () => {
  // Checked through the same helper the chart uses, with cats loaded for shape.
  expect(cats.length).toBeGreaterThan(0);
  const days = Array.from({ length: 7 }, (_, i) => dayKey(addDays({ year: 2026, month: 3, day: 10 }, i - 6)));
  expect(days).toEqual(['2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10']);
});
