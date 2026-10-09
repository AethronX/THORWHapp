import type { Category, CategoryKey, Expense } from '../src/domain/models';
import { dailyTotals, detectRecurring, normalizeText, suggestCategory, unusualExpense, weekdayOf, weekdayPattern } from '../src/domain/smart';

const KEYS: CategoryKey[] = ['housing', 'food', 'transport', 'utilities', 'telecom', 'health', 'education', 'family', 'shopping', 'entertainment', 'debt', 'other'];
const cats: Category[] = KEYS.map((key, i) => ({ id: i + 1, key, name: '', iconCode: i, isEssential: false, archived: false }));
const id = (k: CategoryKey) => KEYS.indexOf(k) + 1;
let next = 1;
const ex = (k: CategoryKey | number, amountMinor: number, y: number, m: number, d: number, note = ''): Expense => ({
  id: next++,
  amountMinor,
  categoryId: typeof k === 'number' ? k : id(k),
  date: { year: y, month: m, day: d },
  note,
});

describe('normalizeText', () => {
  test('Arabic forms, article, diacritics, punctuation', () => {
    expect(normalizeText('  البنزين!! ')).toBe('بنزين');
    expect(normalizeText('إيجار الشقّة')).toBe('ايجار شقه');
    expect(normalizeText('Lulu Hypermarket 24/7')).toBe('lulu hypermarket');
    expect(normalizeText('مستشفى')).toBe('مستشفي');
    expect(normalizeText('')).toBe('');
  });
});

describe('suggestCategory', () => {
  test('keywords: Arabic, English, Omani merchants, multi-word', () => {
    expect(suggestCategory('لولو هايبرماركت', [], cats)).toEqual({ categoryId: id('food'), source: 'keyword' });
    expect(suggestCategory('بنزين المها', [], cats)?.categoryId).toBe(id('transport'));
    expect(suggestCategory('فاتورة عمانتل', [], cats)?.categoryId).toBe(id('telecom'));
    expect(suggestCategory('Netflix', [], cats)?.categoryId).toBe(id('entertainment'));
    expect(suggestCategory('قسط تمارا', [], cats)?.categoryId).toBe(id('debt'));
    expect(suggestCategory('عمان اويل', [], cats)?.categoryId).toBe(id('transport'));
  });

  test('whole words only, unknown → null', () => {
    expect(suggestCategory('شلال', [], cats)).toBeNull(); // contains «شل» but is not «شل»
    expect(suggestCategory('xyz', [], cats)).toBeNull();
    expect(suggestCategory('   ', [], cats)).toBeNull();
  });

  test('history beats keywords; exact note beats a shared word', () => {
    const history = [ex('family', 5000, 2026, 9, 1, 'قهوة الوالدة'), ex('family', 5000, 2026, 9, 8, 'قهوة الوالدة')];
    // keyword says food, the user files it under family
    expect(suggestCategory('قهوة الوالدة', history, cats)).toEqual({ categoryId: id('family'), source: 'history' });
    const h2 = [ex('shopping', 1000, 2026, 9, 1, 'سوق الجمعة'), ex('food', 1000, 2026, 9, 2, 'سوق الخضار'), ex('food', 1000, 2026, 9, 3, 'سوق الخضار')];
    expect(suggestCategory('سوق الجمعة', h2, cats)?.categoryId).toBe(id('shopping')); // exact (3) vs 2 shared words (1+1)
  });

  test('archived categories are never suggested', () => {
    const archived = cats.map((c) => (c.key === 'food' ? { ...c, archived: true } : c));
    expect(suggestCategory('لولو', [], archived)).toBeNull();
  });
});

describe('detectRecurring', () => {
  test('same note in 2+ of the last 3 months, stable amount', () => {
    const h = [
      ex('telecom', 15000, 2026, 7, 5, 'Omantel'),
      ex('telecom', 15000, 2026, 8, 5, 'omantel'),
      ex('telecom', 16000, 2026, 9, 6, 'OMANTEL'),
      ex('entertainment', 4500, 2026, 9, 12, 'نتفليكس'),
      ex('entertainment', 4500, 2026, 8, 12, 'نتفليكس'),
      ex('food', 3000, 2026, 9, 1, 'قهوة'), // once only
      ex('telecom', 16000, 2026, 10, 5, 'Omantel'), // paid this month
    ];
    const r = detectRecurring(h, { year: 2026, month: 10 });
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ categoryId: id('telecom'), label: 'Omantel', amountMinor: 16000, day: 5, months: 3, paidThisMonth: true });
    expect(r[1]).toMatchObject({ label: 'نتفليكس', amountMinor: 4500, day: 12, months: 2, paidThisMonth: false });
  });

  test('without a note: same category and amount within ±5 %', () => {
    const h = [ex('housing', 350000, 2026, 8, 1), ex('housing', 350000, 2026, 9, 1), ex('housing', 120000, 2026, 9, 15)];
    const bills = new Set([id('housing')]);
    const r = detectRecurring(h, { year: 2026, month: 10 }, bills);
    expect(r).toEqual([{ categoryId: id('housing'), label: '', amountMinor: 350000, day: 1, months: 2, paidThisMonth: false }]);
    // Without a note, only bill-type categories count (no "recurring" groceries by coincidence).
    expect(detectRecurring(h, { year: 2026, month: 10 })).toEqual([]);
    expect(detectRecurring([ex('food', 20000, 2026, 8, 3), ex('food', 20000, 2026, 9, 3)], { year: 2026, month: 10 }, bills)).toEqual([]);
  });

  test('shopping several times a month or on scattered days is not a bill', () => {
    const lulu = [3, 17].flatMap((d) => [ex('food', 30000, 2026, 8, d, 'لولو'), ex('food', 30000, 2026, 9, d, 'لولو')]);
    expect(detectRecurring(lulu, { year: 2026, month: 10 })).toEqual([]); // twice a month
    const scattered = [ex('shopping', 30000, 2026, 8, 2, 'نون'), ex('shopping', 30000, 2026, 9, 24, 'نون')];
    expect(detectRecurring(scattered, { year: 2026, month: 10 })).toEqual([]); // day 2 vs 24
  });

  test('unstable amounts or months outside the window are ignored', () => {
    const unstable = [ex('food', 10000, 2026, 8, 3, 'لولو'), ex('food', 30000, 2026, 9, 3, 'لولو')];
    expect(detectRecurring(unstable, { year: 2026, month: 10 })).toEqual([]);
    const old = [ex('telecom', 15000, 2026, 5, 5, 'x'), ex('telecom', 15000, 2026, 6, 5, 'x')];
    expect(detectRecurring(old, { year: 2026, month: 10 })).toEqual([]);
    // Window crosses the year boundary: Nov, Dec → January.
    const yearEnd = [ex('telecom', 15000, 2025, 11, 5, 'x'), ex('telecom', 15000, 2025, 12, 5, 'x')];
    expect(detectRecurring(yearEnd, { year: 2026, month: 1 })).toHaveLength(1);
  });
});

describe('calendar & weekday', () => {
  test('daily totals, only the given month', () => {
    const t = dailyTotals([ex('food', 100, 2026, 2, 1), ex('food', 50, 2026, 2, 1), ex('food', 70, 2026, 2, 28), ex('food', 9, 2026, 3, 1)], { year: 2026, month: 2 });
    expect(t).toHaveLength(28);
    expect(t[0]).toBe(150);
    expect(t[27]).toBe(70);
    expect(t.reduce((a, b) => a + b, 0)).toBe(220);
  });

  test('weekday of a known date', () => {
    expect(weekdayOf({ year: 2026, month: 10, day: 9 })).toBe(5); // Friday
  });

  test('weekday pattern stands out only with enough data', () => {
    // 4 Fridays of 30.000 + 8 other days of 5.000 over 4 weeks
    const fridays = [2, 9, 16, 23].map((d) => ex('food', 30000, 2026, 10, d));
    const others = [4, 5, 6, 11, 12, 13, 18, 19].map((d) => ex('food', 5000, 2026, 10, d));
    const p = weekdayPattern([...fridays, ...others]);
    expect(p?.weekday).toBe(5);
    expect(p?.share).toBeCloseTo(120000 / 160000);
    expect(weekdayPattern(fridays)).toBeNull(); // < 10 expenses
    // rent excluded: it must not create a "pattern"
    // Even spending over 3 full weeks: no pattern — and rent (excluded) must not create one.
    const even = Array.from({ length: 21 }, (_, i) => ex('food', 5000, 2026, 10, i + 1));
    expect(weekdayPattern(even)).toBeNull();
    expect(weekdayPattern([...even, ex('housing', 350000, 2026, 10, 1)], new Set([id('housing')]))).toBeNull();
    expect(weekdayPattern([...even, ex('housing', 350000, 2026, 10, 1)])?.weekday).toBe(4); // Oct 1 2026 = Thursday
  });
});

describe('unusualExpense', () => {
  test('≥ 2.5× the category median with ≥ 4 earlier expenses', () => {
    const h = [8000, 10000, 12000, 9000].map((a, i) => ex('food', a, 2026, 9, i + 1));
    const big = ex('food', 30000, 2026, 10, 7, 'عزومة');
    const r = unusualExpense([...h, big], { year: 2026, month: 10 });
    expect(r?.expense.id).toBe(big.id);
    expect(r?.typicalMinor).toBe(9500); // median of 8,9,10,12 (thousands)
    expect(unusualExpense([...h, ex('food', 20000, 2026, 10, 7)], { year: 2026, month: 10 })).toBeNull(); // 2.1×
    expect(unusualExpense([...h.slice(0, 3), big], { year: 2026, month: 10 })).toBeNull(); // too little history
    expect(unusualExpense([...h, big], { year: 2026, month: 10 }, new Set([id('food')]))).toBeNull();
  });
});
