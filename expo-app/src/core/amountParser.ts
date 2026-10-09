import { Currency, minorPerMajor } from './currency';

/**
 * Largest amount accepted from user input, in major units. Keeps every value
 * far below 2^53 so integer arithmetic on JS numbers stays exact.
 */
export const MAX_MAJOR_AMOUNT = 999_999_999;

export type AmountError =
  | 'empty'
  | 'invalid'
  | 'tooManyDecimals'
  | 'tooLarge'
  | 'notPositive';

export type AmountParseResult =
  | { ok: true; minor: number }
  | { ok: false; error: AmountError };

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';

/**
 * Normalises Arabic-Indic / Persian digits to ASCII, `٫` to `.`, the Arabic
 * thousands separator `٬` to `_`, and drops spaces. `,` is kept and resolved
 * by {@link resolveSeparators}.
 */
export function normalizeDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const i = ARABIC_INDIC.indexOf(ch);
    const j = PERSIAN.indexOf(ch);
    if (i >= 0) out += String(i);
    else if (j >= 0) out += String(j);
    else if (ch === '٫') out += '.';
    else if (ch === '٬') out += '_';
    else if (ch === ' ' || ch === ' ') continue;
    else out += ch;
  }
  return out;
}

const GROUPED = /^\d{1,3}(?:[_,]\d{3})+(?:\.\d*)?$/;

/**
 * Resolves grouping vs decimal commas. Returns null when the input is
 * ambiguous or malformed, so a wrong amount is never stored silently
 * (DECISIONS D-017):
 * - `٬` is always a thousands separator and must form groups of three.
 * - With a `.` present, `,` must be a valid thousands separator.
 * - A single `,` followed by 1-2 digits is a decimal comma (`1,5` = 1.5).
 * - A single `,` followed by exactly 3 digits (`12,500`) is ambiguous for
 *   3-decimal currencies such as OMR and is rejected.
 * - Several `,` must form valid groups of three.
 */
function resolveSeparators(s: string): string | null {
  const hasArabicGroup = s.includes('_');
  const commas = (s.match(/,/g) ?? []).length;
  if (!hasArabicGroup && commas === 0) return s;
  if (hasArabicGroup && commas > 0) return null;
  if (hasArabicGroup || s.includes('.') || commas > 1) {
    return GROUPED.test(s) ? s.replace(/[_,]/g, '') : null;
  }
  const m = /^(\d+),(\d{1,2})$/.exec(s);
  return m ? `${m[1]}.${m[2]}` : null;
}

/**
 * Parses a user-typed decimal amount into integer minor units without ever
 * going through a floating-point value.
 */
export function parseAmount(
  raw: string,
  currency: Currency,
  opts: { allowZero?: boolean } = {},
): AmountParseResult {
  const normalized = normalizeDigits(raw.trim());
  if (normalized === '') return { ok: false, error: 'empty' };
  const s = resolveSeparators(normalized);
  if (s === null) return { ok: false, error: 'invalid' };
  const m = /^(\d*)(?:\.(\d*))?$/.exec(s);
  if (!m) return { ok: false, error: 'invalid' };
  const intPart = m[1] ?? '';
  const fracPart = m[2] ?? '';
  if (intPart === '' && fracPart === '') return { ok: false, error: 'invalid' };
  if (fracPart.length > currency.exponent) {
    return { ok: false, error: 'tooManyDecimals' };
  }
  const trimmedInt = intPart.replace(/^0+(?=\d)/, '');
  if (trimmedInt.length > String(MAX_MAJOR_AMOUNT).length) {
    return { ok: false, error: 'tooLarge' };
  }
  const major = trimmedInt === '' ? 0 : parseInt(trimmedInt, 10);
  if (major > MAX_MAJOR_AMOUNT) return { ok: false, error: 'tooLarge' };
  const fracDigits = fracPart.padEnd(currency.exponent, '0');
  const frac = fracDigits === '' ? 0 : parseInt(fracDigits, 10);
  const minor = major * minorPerMajor(currency) + frac;
  if (minor === 0 && !opts.allowZero) return { ok: false, error: 'notPositive' };
  return { ok: true, minor };
}

/** Minor units as a plain editable decimal string: 12500 OMR -> "12.5". */
export function minorToEditable(minor: number, currency: Currency): string {
  if (currency.exponent === 0) return String(minor);
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const per = minorPerMajor(currency);
  const major = Math.floor(abs / per);
  const frac = String(abs % per)
    .padStart(currency.exponent, '0')
    .replace(/0+$/, '');
  const body = frac === '' ? String(major) : `${major}.${frac}`;
  return negative ? `-${body}` : body;
}
