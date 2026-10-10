import type { Expense } from '../src/domain/models';
import { filterExpenses, isFiltering, matchesQuery } from '../src/domain/search';

const ex = (id: number, categoryId: number, note: string): Expense => ({ id, amountMinor: 1000, categoryId, date: { year: 2026, month: 10, day: id }, note });
const names: Record<number, string> = { 1: 'السكن', 2: 'الطعام والبقالة', 5: 'الصحة' };
const name = (id: number) => names[id] ?? '';

test('Arabic letter forms, article and diacritics do not matter', () => {
  expect(matchesQuery('مستشفى الجامعة', 'مستشفي')).toBe(true);
  expect(matchesQuery('إيجار الشقة', 'ايجار')).toBe(true);
  expect(matchesQuery('الإيجار', 'إيجار')).toBe(true);
  expect(matchesQuery('شقّة', 'شقه')).toBe(true);
  expect(matchesQuery('Lulu Hypermarket', 'lulu')).toBe(true);
  expect(matchesQuery('Lulu Hypermarket', 'hyper')).toBe(true); // word prefix
  expect(matchesQuery('لولو', 'كارفور')).toBe(false);
  expect(matchesQuery('anything', '   ')).toBe(true);
});

test('all query words must match, across note and category name', () => {
  const list = [ex(1, 2, 'لولو'), ex(2, 2, 'مطعم'), ex(3, 5, 'صيدلية'), ex(4, 1, '')];
  expect(filterExpenses(list, { query: 'لولو', categoryId: null }, name).map((e) => e.id)).toEqual([1]);
  expect(filterExpenses(list, { query: 'طعام', categoryId: null }, name).map((e) => e.id)).toEqual([1, 2]); // category name
  expect(filterExpenses(list, { query: 'طعام مطعم', categoryId: null }, name).map((e) => e.id)).toEqual([2]);
  expect(filterExpenses(list, { query: '', categoryId: 5 }, name).map((e) => e.id)).toEqual([3]);
  expect(filterExpenses(list, { query: 'لولو', categoryId: 5 }, name)).toEqual([]);
  expect(isFiltering({ query: ' ', categoryId: null })).toBe(false);
  expect(isFiltering({ query: '', categoryId: 2 })).toBe(true);
});
