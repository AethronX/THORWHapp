/**
 * Transaction search & filters — pure, tested (__tests__/search.test.ts).
 * Matching is accent/letter-form tolerant for Arabic (أ/إ/ا, ة/ه, ى/ي,
 * diacritics, «ال») and case-insensitive for Latin, via normalizeText.
 */
import type { Expense } from './models';
import { normalizeText } from './smart';

export interface ExpenseFilter {
  /** Free text: matched against the note and the category name. */
  query: string;
  /** null = all categories. */
  categoryId: number | null;
}

/** Every word of the query must appear (as a word prefix) in note + category name. */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalizeText(query).split(' ').filter(Boolean);
  if (q.length === 0) return true;
  const words = normalizeText(haystack).split(' ');
  return q.every((w) => words.some((h) => h.startsWith(w)));
}

export function filterExpenses(expenses: readonly Expense[], f: ExpenseFilter, categoryName: (id: number) => string): Expense[] {
  return expenses.filter((e) => (f.categoryId == null || e.categoryId === f.categoryId) && matchesQuery(`${e.note} ${categoryName(e.categoryId)}`, f.query));
}

export const isFiltering = (f: ExpenseFilter) => f.categoryId != null || normalizeText(f.query) !== '';
