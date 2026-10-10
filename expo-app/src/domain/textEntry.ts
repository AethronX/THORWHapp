/**
 * Free-text expense entry, fully on the device (no AI, no network):
 * "قهوة 1.5", "بنزين ٥٫٥ ر.ع", "غداء 2.300 ريال", "قهوة 500 بيسة", "Lulu 12.5 OMR".
 * Works with typed text or the phone keyboard's dictation.
 * Tested in __tests__/textEntry.test.ts. Amounts in integer minor units.
 */
import { parseAmount } from '../core/amountParser';
import type { Currency } from '../core/currency';

export interface TextEntry {
  amountMinor: number | null;
  /** The text without the amount and currency words. */
  note: string;
}

const DIGITS = '[0-9٠-٩۰-۹]';
// A number (dot / Arabic decimal separator / comma), optionally followed by a currency word.
const AMOUNT = new RegExp(
  `(${DIGITS}+(?:[.,٫]${DIGITS}+)?)\\s*(بيس[ةه]|baisa|بيسات|ر\\.?\\s?ع\\.?|ريال(?:ات)?(?:\\s+عماني)?|omr|rials?|ro)?(?=\\s|$|[،,.])`,
  'iu',
);

export function parseTextEntry(text: string, currency: Currency): TextEntry {
  const m = AMOUNT.exec(text);
  if (!m) return { amountMinor: null, note: text.trim() };
  const [whole, num, unit] = m;
  const isBaisa = !!unit && /^(بيس|baisa)/iu.test(unit);
  let amountMinor: number | null = null;
  if (isBaisa) {
    // 1 rial = 1000 baisa: "500 بيسة" = 0.500 OMR. Only meaningful for OMR.
    const n = parseAmount(num, { ...currency, exponent: 0 } as Currency);
    if (n.ok && currency.code === 'OMR') amountMinor = n.minor;
  } else {
    const n = parseAmount(num, currency);
    if (n.ok) amountMinor = n.minor;
  }
  if (amountMinor == null) return { amountMinor: null, note: text.trim() };
  const note = (text.slice(0, m.index) + text.slice(m.index + whole.length)).replace(/\s{2,}/g, ' ').replace(/^[\s،,.-]+|[\s،,.-]+$/g, '');
  return { amountMinor, note };
}
