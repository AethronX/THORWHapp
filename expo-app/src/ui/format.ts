import type { AmountError } from '../core/amountParser';
import { Currency, minorPerMajor } from '../core/currency';
import { Day, dayToDate, daysInMonth, YearMonth } from '../core/dates';
import type { Category } from '../domain/models';
import type { Locale } from '../state/appController';
import { CATEGORY_ICON_NAMES, type IconName } from './icons';
import type { Strings } from './i18n';

/**
 * Official new signs, drawn with small bundled fonts (system fonts don't have them yet):
 * Saudi riyal U+20C1 (Unicode 17.0), UAE dirham U+20C3 (Unicode 18.0), Omani rial U+20C4
 * (Central Bank of Oman, Nov 2025; Unicode 18.0 — glyph redrawn from the published symbol, D-044).
 * The user can switch back to the classic abbreviations («ر.ع.», «ر.س», «د.إ») in Settings.
 */
export const NEW_SIGNS: Record<string, string> = { SAR: '\u20C1', AED: '\u20C3', OMR: '\u20C4' };
/** Sign character → font family that draws it (only signs we can render correctly). */
export const CURRENCY_SIGN_FONTS: Record<string, { regular: string; bold: string }> = {
  '\u20C1': { regular: 'CurrencySAR-Regular', bold: 'CurrencySAR-Bold' },
  '\u20C3': { regular: 'CurrencyAED-Regular', bold: 'CurrencyAED-Regular' },
  '\u20C4': { regular: 'CurrencyOMR-Regular', bold: 'CurrencyOMR-Regular' },
};
const signFor = (code: string) => (NEW_SIGNS[code] && CURRENCY_SIGN_FONTS[NEW_SIGNS[code]] ? NEW_SIGNS[code] : null);
/** True when this currency has a new official sign the app can draw. */
export const hasNewSign = (code: string) => signFor(code) != null;

/** Spoken names: screen readers don't know the new characters yet. */
const SIGN_NAMES: Record<string, Record<Locale, string>> = {
  '\u20C1': { ar: 'ريال سعودي', en: 'Saudi riyals' },
  '\u20C3': { ar: 'درهم إماراتي', en: 'UAE dirhams' },
  '\u20C4': { ar: 'ريال عماني', en: 'Omani rials' },
};
/** Replace new currency signs with their spoken names (for accessibility labels). */
export function speakSigns(text: string, l: Locale): string {
  return text.replace(/[\u20C1\u20C3\u20C4]/g, (ch) => SIGN_NAMES[ch]?.[l] ?? ch);
}

const AR_SYMBOLS: Record<string, string> = {
  OMR: 'ر.ع.',
  AED: 'د.إ',
  SAR: 'ر.س',
  QAR: 'ر.ق',
  KWD: 'د.ك',
  BHD: 'د.ب',
  USD: '$',
  EUR: '€',
  EGP: 'ج.م',
  JOD: 'د.أ',
  IQD: 'د.ع',
  LBP: 'ل.ل',
  SYP: 'ل.س',
  ILS: '₪',
  YER: 'ر.ي',
  MAD: 'د.م.',
  TND: 'د.ت',
  DZD: 'د.ج',
  LYD: 'د.ل',
  SDG: 'ج.س',
  MRU: 'أ.م',
  SOS: 'ش.ص',
  DJF: 'ف.ج',
  KMF: 'ف.ق',
  GBP: '£',
  TRY: '₺',
};

export const CURRENCY_NAMES: Record<string, [string, string]> = {
  OMR: ['ريال عُماني', 'Omani rial'],
  AED: ['درهم إماراتي', 'UAE dirham'],
  SAR: ['ريال سعودي', 'Saudi riyal'],
  QAR: ['ريال قطري', 'Qatari riyal'],
  KWD: ['دينار كويتي', 'Kuwaiti dinar'],
  BHD: ['دينار بحريني', 'Bahraini dinar'],
  USD: ['دولار أمريكي', 'US dollar'],
  EUR: ['يورو', 'Euro'],
  EGP: ['جنيه مصري', 'Egyptian pound'],
  JOD: ['دينار أردني', 'Jordanian dinar'],
  IQD: ['دينار عراقي', 'Iraqi dinar'],
  LBP: ['ليرة لبنانية', 'Lebanese pound'],
  SYP: ['ليرة سورية', 'Syrian pound'],
  ILS: ['شيكل', 'Israeli new shekel'],
  YER: ['ريال يمني', 'Yemeni rial'],
  MAD: ['درهم مغربي', 'Moroccan dirham'],
  TND: ['دينار تونسي', 'Tunisian dinar'],
  DZD: ['دينار جزائري', 'Algerian dinar'],
  LYD: ['دينار ليبي', 'Libyan dinar'],
  SDG: ['جنيه سوداني', 'Sudanese pound'],
  MRU: ['أوقية موريتانية', 'Mauritanian ouguiya'],
  SOS: ['شلن صومالي', 'Somali shilling'],
  DJF: ['فرنك جيبوتي', 'Djiboutian franc'],
  KMF: ['فرنك قمري', 'Comorian franc'],
  GBP: ['جنيه إسترليني', 'Pound sterling'],
  TRY: ['ليرة تركية', 'Turkish lira'],
};

/** Where the user lives (D-055) — the weekend and the local rhythm come from this. */
export const COUNTRY_NAMES: Record<string, [string, string]> = {
  OM: ['عُمان', 'Oman'],
  SA: ['السعودية', 'Saudi Arabia'],
  AE: ['الإمارات', 'United Arab Emirates'],
  QA: ['قطر', 'Qatar'],
  KW: ['الكويت', 'Kuwait'],
  BH: ['البحرين', 'Bahrain'],
  YE: ['اليمن', 'Yemen'],
  IQ: ['العراق', 'Iraq'],
  JO: ['الأردن', 'Jordan'],
  PS: ['فلسطين', 'Palestine'],
  SY: ['سوريا', 'Syria'],
  LB: ['لبنان', 'Lebanon'],
  EG: ['مصر', 'Egypt'],
  SD: ['السودان', 'Sudan'],
  LY: ['ليبيا', 'Libya'],
  TN: ['تونس', 'Tunisia'],
  DZ: ['الجزائر', 'Algeria'],
  MA: ['المغرب', 'Morocco'],
  MR: ['موريتانيا', 'Mauritania'],
  SO: ['الصومال', 'Somalia'],
  DJ: ['جيبوتي', 'Djibouti'],
  KM: ['جزر القمر', 'Comoros'],
  TR: ['تركيا', 'Türkiye'],
  GB: ['بريطانيا', 'United Kingdom'],
  US: ['الولايات المتحدة', 'United States'],
  OTHER: ['دولة أخرى', 'Another country'],
};

export const countryName = (code: string, l: Locale) => COUNTRY_NAMES[code]?.[l === 'ar' ? 0 : 1] ?? code;

export const currencyName = (c: Currency, l: Locale) => CURRENCY_NAMES[c.code]?.[l === 'ar' ? 0 : 1] ?? c.code;

/** Arabic: the new official sign when we can draw it, else the Arabic abbreviation. English: the sign or the ISO code. */
/** `classic`: the user prefers «ر.ع.» / «OMR» over the new sign. */
export const currencySymbol = (c: Currency, l: Locale, classic = false) => (classic ? null : signFor(c.code)) ?? (l === 'ar' ? (AR_SYMBOLS[c.code] ?? c.code) : c.code);

/** 1234567 -> "1,234,567" (no Intl dependency: identical on every device). */
function group(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const LRM = '‎';
/** No-break space: an amount and its currency never wrap onto different lines. */
const NBSP = '\u00A0';

/**
 * Minor units for display: 12500 OMR -> "12.500 ر.ع." (ar) / "OMR 12.500" (en).
 * Western digits in both languages (DECISIONS D-014). In Arabic the number is
 * wrapped in LRM marks so sign and digits never reorder inside RTL text.
 */
export function formatMoney(minor: number, c: Currency, l: Locale, signed = false, classic = false): string {
  const neg = minor < 0;
  const abs = Math.abs(minor);
  const per = minorPerMajor(c);
  const body = c.exponent === 0 ? group(abs) : `${group(Math.floor(abs / per))}.${String(abs % per).padStart(c.exponent, '0')}`;
  const sign = neg ? '-' : signed && minor > 0 ? '+' : '';
  const sym = currencySymbol(c, l, classic);
  return l === 'ar' ? `${LRM}${sign}${body}${LRM}${NBSP}${sym}` : `${sym}${NBSP}${sign}${body}`;
}

/**
 * Whole percent, toward zero, so an unfinished goal never reads "100%".
 * Wrapped in LRM marks so «57%» never displays as «%57» inside Arabic text.
 */
export function formatPercent(fraction: number): string {
  const p = fraction * 100;
  return `${LRM}${p >= 0 ? Math.floor(p) : Math.ceil(p)}%${LRM}`;
}

const MONTHS: Record<Locale, string[]> = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export const formatMonth = (m: YearMonth, l: Locale) => `${MONTHS[l][m.month - 1]} ${m.year}`;

export const formatDate = (d: Day, l: Locale) => (l === 'ar' ? `${d.day} ${MONTHS.ar[d.month - 1]} ${d.year}` : `${MONTHS.en[d.month - 1].slice(0, 3)} ${d.day}, ${d.year}`);

/**
 * The Umm al-Qura (Hijri) date for a day, or null when the device cannot
 * produce one (D-055).
 *
 * Built on the platform's own calendar support rather than a bundled table:
 * a table would have to be extended by hand every few years and would quietly
 * go wrong after it ran out. Not every Android build ships the data, so the
 * result is checked — a formatter that silently falls back to the Gregorian
 * calendar is treated as "unavailable" and the UI simply shows nothing.
 */
export function hijriDate(d: Day, l: Locale): string | null {
  try {
    const tag = `${l === 'ar' ? 'ar-SA' : 'en-US'}-u-ca-islamic-umalqura`;
    const out = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(dayToDate(d));
    if (!out || !/\d|[\u0660-\u0669]/.test(out)) return null;
    // If the formatter ignored the calendar request the year still reads as the
    // Gregorian one; a Hijri year is ~580 years lower, so this is unambiguous.
    return out.includes(String(d.year)) ? null : out;
  } catch {
    return null;
  }
}

/** The Hijri month (or months) a Gregorian month falls across, with the year once. */
export function hijriMonthLabel(m: YearMonth, l: Locale): string | null {
  const a = hijriParts({ ...m, day: 1 }, l);
  const b = hijriParts({ ...m, day: daysInMonth(m.year, m.month) }, l);
  if (!a || !b) return null;
  if (a.month === b.month) return `${a.month} ${a.year}`;
  return a.year === b.year ? `${a.month} – ${b.month} ${b.year}` : `${a.month} ${a.year} – ${b.month} ${b.year}`;
}

function hijriParts(d: Day, l: Locale): { month: string; year: string } | null {
  try {
    const tag = `${l === 'ar' ? 'ar-SA' : 'en-US'}-u-ca-islamic-umalqura`;
    const parts = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(dayToDate(d));
    const month = parts.find((x) => x.type === 'month')?.value;
    const year = parts.find((x) => x.type === 'year')?.value;
    const era = parts.find((x) => x.type === 'era')?.value;
    if (!month || !year || year.includes(String(d.year))) return null;
    return { month, year: era ? `${year} ${era}` : year };
  } catch {
    return null;
  }
}

export function categoryLabel(c: Category, s: Strings): string {
  if (c.name && c.name.trim() !== '') return c.name;
  return s.cat[c.key ?? 'other'] ?? s.cat.other;
}

/** Category icon: built-ins by iconCode (0..11), custom categories too. */
export const categoryIcon = (c: Category): IconName => CATEGORY_ICON_NAMES[Math.min(Math.max(c.iconCode, 0), CATEGORY_ICON_NAMES.length - 1)];

export function amountErrorText(e: AmountError | null, c: Currency, s: Strings): string | null {
  switch (e) {
    case null:
      return null;
    case 'empty':
      return s.errAmountEmpty;
    case 'invalid':
      return s.errAmountInvalid;
    case 'tooManyDecimals':
      return s.errAmountDecimals(c.exponent);
    case 'tooLarge':
      return s.errAmountTooLarge;
    case 'notPositive':
      return s.errAmountPositive;
  }
}
