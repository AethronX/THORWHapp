import type { AmountError } from '../core/amountParser';
import { Currency, minorPerMajor } from '../core/currency';
import type { Day, YearMonth } from '../core/dates';
import type { Category } from '../domain/models';
import type { Locale } from '../state/appController';
import { CATEGORY_ICON_NAMES, type IconName } from './icons';
import type { Strings } from './i18n';

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
};

export const currencyName = (c: Currency, l: Locale) =>
  CURRENCY_NAMES[c.code]?.[l === 'ar' ? 0 : 1] ?? c.code;

export const currencySymbol = (c: Currency, l: Locale) =>
  l === 'ar' ? (AR_SYMBOLS[c.code] ?? c.code) : c.code;

/** 1234567 -> "1,234,567" (no Intl dependency: identical on every device). */
function group(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const LRM = '‎';

/**
 * Minor units for display: 12500 OMR -> "12.500 ر.ع." (ar) / "OMR 12.500" (en).
 * Western digits in both languages (DECISIONS D-014). In Arabic the number is
 * wrapped in LRM marks so sign and digits never reorder inside RTL text.
 */
export function formatMoney(minor: number, c: Currency, l: Locale, signed = false): string {
  const neg = minor < 0;
  const abs = Math.abs(minor);
  const per = minorPerMajor(c);
  const body =
    c.exponent === 0
      ? group(abs)
      : `${group(Math.floor(abs / per))}.${String(abs % per).padStart(c.exponent, '0')}`;
  const sign = neg ? '-' : signed && minor > 0 ? '+' : '';
  return l === 'ar' ? `${LRM}${sign}${body}${LRM} ${currencySymbol(c, l)}` : `${c.code} ${sign}${body}`;
}

/** Whole percent, toward zero, so an unfinished goal never reads "100%". */
export function formatPercent(fraction: number): string {
  const p = fraction * 100;
  return `${p >= 0 ? Math.floor(p) : Math.ceil(p)}%`;
}

const MONTHS: Record<Locale, string[]> = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export const formatMonth = (m: YearMonth, l: Locale) => `${MONTHS[l][m.month - 1]} ${m.year}`;

export const formatDate = (d: Day, l: Locale) =>
  l === 'ar' ? `${d.day} ${MONTHS.ar[d.month - 1]} ${d.year}` : `${MONTHS.en[d.month - 1].slice(0, 3)} ${d.day}, ${d.year}`;

export function categoryLabel(c: Category, s: Strings): string {
  if (c.name && c.name.trim() !== '') return c.name;
  return s.cat[c.key ?? 'other'] ?? s.cat.other;
}

/** Category icon: built-ins by iconCode (0..11), custom categories too. */
export const categoryIcon = (c: Category): IconName =>
  CATEGORY_ICON_NAMES[Math.min(Math.max(c.iconCode, 0), CATEGORY_ICON_NAMES.length - 1)];

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
