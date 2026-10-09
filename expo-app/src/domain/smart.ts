/**
 * "Smart" features without AI or network: category suggestion, recurring
 * payment detection, spending calendar, weekday pattern and unusual-expense
 * detection. Deterministic, explainable, on-device; unit-tested in
 * __tests__/smart.test.ts. Money is integer minor units.
 */
import { Day, daysInMonth, dayToDate, YearMonth, monthOf, sameMonth, addMonths, compareDays } from '../core/dates';
import type { Category, CategoryKey, Expense } from './models';

// -----------------------------------------------------------------------------
// Text normalisation (Arabic + English)
// -----------------------------------------------------------------------------

/**
 * Lower-case, strip Arabic diacritics and tatweel, unify alef/yaa/taa-marbuta
 * forms, drop punctuation and digits, strip the definite article «ال».
 * "البنزين " → "بنزين", "Lulu Hypermarket!" → "lulu hypermarket".
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '') // harakat, superscript alef, tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 4 && w.startsWith('ال') ? w.slice(2) : w))
    .join(' ');
}

const contains = (haystack: string, needle: string) => ` ${haystack} `.includes(` ${needle} `);

// -----------------------------------------------------------------------------
// 1. Category suggestion
// -----------------------------------------------------------------------------

/**
 * Common words and Oman/GCC merchants per category. Written naturally;
 * normalised once at load. A note matches a keyword on whole words only.
 */
const RAW_KEYWORDS: Record<CategoryKey, string[]> = {
  housing: ['ايجار', 'إيجار', 'الإيجار', 'سكن', 'شقة', 'rent', 'apartment', 'landlord', 'صيانة المنزل'],
  food: [
    'لولو', 'كارفور', 'نستو', 'الميرة', 'سبار', 'هايبرماركت', 'سوبرماركت', 'بقالة', 'مطعم', 'غداء', 'عشاء', 'فطور', 'قهوة', 'كافيه',
    'ستاربكس', 'طلبات', 'ماكدونالدز', 'بيتزا', 'مخبز', 'خضار', 'فواكه', 'سمك', 'لحم', 'دجاج', 'شاورما', 'كرك',
    'lulu', 'carrefour', 'nesto', 'spar', 'grocery', 'groceries', 'restaurant', 'lunch', 'dinner', 'breakfast', 'coffee', 'cafe',
    'starbucks', 'talabat', 'mcdonalds', 'kfc', 'pizza', 'bakery', 'food',
  ],
  transport: [
    'بنزين', 'وقود', 'ديزل', 'شل', 'المها', 'عمان اويل', 'تاكسي', 'اوبر', 'كريم', 'مواقف', 'باص', 'حافلة', 'غسيل سيارة', 'صيانة سيارة', 'اطارات',
    'petrol', 'fuel', 'diesel', 'shell', 'taxi', 'uber', 'careem', 'otaxi', 'parking', 'bus', 'car wash', 'tyres', 'tires',
  ],
  utilities: ['كهرباء', 'ماء', 'مياه', 'نماء', 'غاز', 'فاتورة الكهرباء', 'electricity', 'water', 'nama', 'gas bill', 'utility'],
  telecom: [
    'عمانتل', 'اوريدو', 'فودافون', 'انترنت', 'إنترنت', 'باقة', 'رصيد', 'هاتف', 'جوال', 'فايبر',
    'omantel', 'ooredoo', 'vodafone', 'internet', 'mobile', 'phone', 'recharge', 'fibre', 'fiber',
  ],
  health: ['صيدلية', 'مستشفى', 'عيادة', 'دواء', 'طبيب', 'اسنان', 'تحليل', 'pharmacy', 'hospital', 'clinic', 'medicine', 'doctor', 'dentist'],
  education: ['مدرسة', 'رسوم دراسية', 'جامعة', 'كلية', 'كتب', 'دورة', 'قرطاسية', 'school', 'tuition', 'university', 'college', 'books', 'course'],
  family: ['هدية', 'هدايا', 'عيدية', 'اطفال', 'عائلة', 'الوالدة', 'الوالد', 'زواج', 'gift', 'gifts', 'kids', 'family', 'wedding'],
  shopping: [
    'ملابس', 'حذاء', 'احذية', 'عطر', 'عطور', 'امازون', 'نون', 'مول', 'سيتي سنتر', 'الكترونيات', 'اثاث', 'ايكيا',
    'clothes', 'shoes', 'perfume', 'amazon', 'noon', 'shein', 'mall', 'electronics', 'furniture', 'ikea',
  ],
  entertainment: [
    'سينما', 'نتفليكس', 'شاهد', 'سبوتيفاي', 'العاب', 'لعبة', 'رحلة', 'فندق', 'سفر', 'طيران',
    'cinema', 'vox', 'netflix', 'shahid', 'spotify', 'games', 'playstation', 'trip', 'hotel', 'travel', 'flight',
  ],
  debt: ['قرض', 'قسط', 'اقساط', 'بطاقة ائتمان', 'تمارا', 'تابي', 'loan', 'installment', 'instalment', 'credit card', 'tamara', 'tabby'],
  other: [],
};

const KEYWORDS: [CategoryKey, string][] = (Object.keys(RAW_KEYWORDS) as CategoryKey[]).flatMap((k) =>
  RAW_KEYWORDS[k].map((w) => [k, normalizeText(w)] as [CategoryKey, string]),
);

export interface CategorySuggestion {
  categoryId: number;
  /** Where it came from — shown to the user ("from your history"). */
  source: 'history' | 'keyword';
}

/**
 * Suggest a category for a note. Order: (1) the user's own history — the
 * category they used most for notes sharing a word with this one; (2) the
 * keyword list. Archived categories are never suggested. Null = no idea.
 */
export function suggestCategory(note: string, history: readonly Expense[], categories: readonly Category[]): CategorySuggestion | null {
  const text = normalizeText(note);
  if (!text) return null;
  const active = new Map(categories.filter((c) => !c.archived).map((c) => [c.id, c]));

  // (1) History: exact note first (weight 3), then shared words (weight 1).
  const words = new Set(text.split(' ').filter((w) => w.length >= 2));
  const score = new Map<number, number>();
  for (const e of history) {
    if (!active.has(e.categoryId) || !e.note) continue;
    const other = normalizeText(e.note);
    if (!other) continue;
    let w = other === text ? 3 : 0;
    if (!w) for (const x of other.split(' ')) if (words.has(x)) w = 1;
    if (w) score.set(e.categoryId, (score.get(e.categoryId) ?? 0) + w);
  }
  if (score.size) {
    // Highest score; ties → the lower id (built-ins first), deterministic.
    const [id] = [...score.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    return { categoryId: id, source: 'history' };
  }

  // (2) Keywords → built-in category with that key. Longest keyword wins.
  let best: [CategoryKey, string] | null = null;
  for (const kw of KEYWORDS) if (contains(text, kw[1]) && (!best || kw[1].length > best[1].length)) best = kw;
  if (!best) return null;
  const cat = [...active.values()].find((c) => c.key === best![0]);
  return cat ? { categoryId: cat.id, source: 'keyword' } : null;
}

// -----------------------------------------------------------------------------
// 2. Recurring payments
// -----------------------------------------------------------------------------

export interface RecurringPayment {
  categoryId: number;
  /** Original note of the latest occurrence ('' if none). */
  label: string;
  /** Latest amount. */
  amountMinor: number;
  /** Typical day of month (median). */
  day: number;
  /** Distinct months seen in the window. */
  months: number;
  /** Already paid in the reference month. */
  paidThisMonth: boolean;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/**
 * Payments that repeat monthly, like a bill or subscription:
 * - the same note — or, without a note, the same bill-type category
 *   (`billCategoryIds`: rent, utilities, telecom…) and amount within ±5 %;
 * - seen in at least 2 different months of the 3 before `month`,
 *   at most once in any month (several Lulu trips a month are shopping, not a bill);
 * - on a similar day (within ±5 days of the median) and amount (±15 %).
 * Sorted by amount, largest first.
 */
export function detectRecurring(history: readonly Expense[], month: YearMonth, billCategoryIds: ReadonlySet<number> = new Set()): RecurringPayment[] {
  const windowStart = addMonths(month, -3);
  const inWindow = (e: Expense) => {
    const m = monthOf(e.date);
    return compareMonths(m, windowStart) >= 0 && compareMonths(m, month) < 0;
  };
  const groups = new Map<string, Expense[]>();
  // Without a note: cluster by category + amount within ±5 % of the first one.
  const clusters: { categoryId: number; ref: number; key: string }[] = [];
  for (const e of [...history].sort((x, y) => compareDays(x.date, y.date) || x.id - y.id)) {
    if (!inWindow(e) && !sameMonth(monthOf(e.date), month)) continue;
    const note = normalizeText(e.note);
    let key = `n:${e.categoryId}:${note}`;
    if (!note) {
      if (!billCategoryIds.has(e.categoryId)) continue;
      let c = clusters.find((x) => x.categoryId === e.categoryId && Math.abs(e.amountMinor - x.ref) <= x.ref * 0.05);
      if (!c) clusters.push((c = { categoryId: e.categoryId, ref: e.amountMinor, key: `a:${clusters.length}` }));
      key = c.key;
    }
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const out: RecurringPayment[] = [];
  for (const items of groups.values()) {
    const past = items.filter(inWindow);
    const months = new Set(past.map((e) => `${e.date.year}-${e.date.month}`));
    if (months.size < 2 || months.size !== past.length) continue; // once a month at most
    const med = median(past.map((e) => e.amountMinor));
    if (past.some((e) => Math.abs(e.amountMinor - med) > med * 0.15)) continue;
    const day = median(past.map((e) => e.date.day));
    if (past.some((e) => Math.abs(e.date.day - day) > 5)) continue;
    const latest = [...items].sort((a, b) => compareDays(b.date, a.date) || b.id - a.id)[0];
    out.push({
      categoryId: latest.categoryId,
      label: latest.note.trim(),
      amountMinor: latest.amountMinor,
      day,
      months: months.size,
      paidThisMonth: items.some((e) => sameMonth(monthOf(e.date), month)),
    });
  }
  return out.sort((a, b) => b.amountMinor - a.amountMinor || a.categoryId - b.categoryId);
}

function compareMonths(a: YearMonth, b: YearMonth) {
  return a.year - b.year || a.month - b.month;
}

// -----------------------------------------------------------------------------
// 3. Calendar & weekday pattern
// -----------------------------------------------------------------------------

/** Spending per day of `month` (index 0 = day 1). */
export function dailyTotals(expenses: readonly Expense[], month: YearMonth): number[] {
  const out = new Array<number>(daysInMonth(month.year, month.month)).fill(0);
  for (const e of expenses) if (sameMonth(monthOf(e.date), month)) out[e.date.day - 1] += e.amountMinor;
  return out;
}

/** 0 = Sunday … 6 = Saturday (JS convention). */
export const weekdayOf = (d: Day) => dayToDate(d).getDay();

export interface WeekdayPattern {
  weekday: number;
  /** Share of all spending in the period. */
  share: number;
  /** Ratio to an even split (1 = average, 2 = twice). */
  ratio: number;
}

/**
 * The weekday with the most spending, if it stands out: at least 10
 * expenses over at least 3 weeks, and ≥ 1.4× an even split. Fixed bills
 * (rent etc.) are excluded via `excludeCategoryIds` — they are paid on
 * whatever day the month starts, not by habit.
 */
export function weekdayPattern(expenses: readonly Expense[], excludeCategoryIds: ReadonlySet<number> = new Set()): WeekdayPattern | null {
  const items = expenses.filter((e) => !excludeCategoryIds.has(e.categoryId));
  if (items.length < 10) return null;
  const days = items.map((e) => dayToDate(e.date).getTime());
  if (Math.max(...days) - Math.min(...days) < 20 * 86400000) return null;
  const totals = new Array<number>(7).fill(0);
  for (const e of items) totals[weekdayOf(e.date)] += e.amountMinor;
  const sum = totals.reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;
  const weekday = totals.indexOf(Math.max(...totals));
  const share = totals[weekday] / sum;
  const ratio = share * 7;
  return ratio >= 1.4 ? { weekday, share, ratio } : null;
}

// -----------------------------------------------------------------------------
// 4. Unusual expense
// -----------------------------------------------------------------------------

export interface UnusualExpense {
  expense: Expense;
  /** Typical (median) amount in the category. */
  typicalMinor: number;
  ratio: number;
}

/**
 * The most recent expense of `month` that is ≥ 2.5× the median of earlier
 * expenses in the same category (needs ≥ 4 earlier ones). Fixed categories
 * are excluded by the caller. Null if none.
 */
export function unusualExpense(history: readonly Expense[], month: YearMonth, excludeCategoryIds: ReadonlySet<number> = new Set()): UnusualExpense | null {
  const current = history
    .filter((e) => sameMonth(monthOf(e.date), month) && !excludeCategoryIds.has(e.categoryId))
    .sort((a, b) => compareDays(b.date, a.date) || b.id - a.id);
  for (const e of current) {
    const earlier = history.filter((x) => x.categoryId === e.categoryId && x.id !== e.id && compareDays(x.date, e.date) <= 0);
    if (earlier.length < 4) continue;
    const typical = median(earlier.map((x) => x.amountMinor));
    if (typical > 0 && e.amountMinor >= typical * 2.5) return { expense: e, typicalMinor: typical, ratio: e.amountMinor / typical };
  }
  return null;
}
