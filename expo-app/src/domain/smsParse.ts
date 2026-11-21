/**
 * Reads a bank alert message ("تم خصم ... لدى ...") into a candidate expense,
 * entirely on the device — no network, no AI, nothing sent anywhere (D-047).
 *
 * This is the PURE part of the feature: text in, candidate out. How the text
 * reaches us differs by platform and is deliberately kept out of here:
 *   - iOS cannot read SMS at all (no API exists). The user shares the message
 *     to Tharwati from the Messages share sheet, or pastes it.
 *   - Android can read SMS with the user's permission, but Google Play limits
 *     that permission; the share sheet works there too and needs none.
 *
 * Honesty rules: a message we do not clearly understand returns null rather
 * than a guessed expense; an amount in another currency is reported as-is and
 * never converted (we have no rates and will not invent one); a credit
 * (salary, refund) is flagged, not recorded as spending.
 * Tests: __tests__/smsParse.test.ts.
 */
import { parseAmount } from '../core/amountParser';
import type { Currency } from '../core/currency';
import { CURRENCIES } from '../core/currency';

export type SmsKind = 'purchase' | 'withdrawal' | 'transfer' | 'credit';

export interface SmsCandidate {
  kind: SmsKind;
  /** In the minor units of `currencyCode`, not necessarily the app's currency. */
  amountMinor: number;
  currencyCode: string;
  /** Who was paid, when the message names them. */
  merchant: string | null;
  /** Last four digits of the card, when present. */
  cardLast4: string | null;
  /** Money coming in (salary, refund): never recorded as an expense. */
  isCredit: boolean;
  /** The message's currency differs from the one the app is set to. */
  foreignCurrency: boolean;
}

/** Words that mark money leaving the account, per kind. */
const DEBIT: [SmsKind, RegExp][] = [
  ['withdrawal', /سحب\s*نقدي|سحب\s*من\s*الصراف|atm\s*(cash\s*)?withdrawal|cash\s*withdrawal/iu],
  ['transfer', /تحويل|حوالة|transfer(red)?\s*(of|to)?/iu],
  ['purchase', /شراء|عملية\s*شراء|خصم|نقاط\s*البيع|purchase|debited|pos\b|payment\s*of/iu],
];
/** Words that mark money arriving. */
const CREDIT = /إيداع|ايداع|راتب|استرداد|أضيف|اضيف|credited|deposit|salary|refund/iu;
/** Messages that are never a transaction, however they are worded. */
const NOT_A_TRANSACTION = /رمز\s*التحقق|كلمة\s*المرور|otp\b|verification\s*code|one[-\s]?time|لا\s*تشارك|do\s*not\s*share/iu;

/** Currency written as a code (OMR) or in Arabic (ر.ع.). */
const CURRENCY_WORDS: [string, RegExp][] = [
  ['OMR', /\bOMR\b|ر\.?\s?ع\.?|ريال\s*عماني/iu],
  ['SAR', /\bSAR\b|\bSR\b|ر\.?\s?س\.?|ريال\s*سعودي/iu],
  ['AED', /\bAED\b|\bDHS?\b|د\.?\s?إ\.?|درهم/iu],
  ['QAR', /\bQAR\b|ر\.?\s?ق\.?|ريال\s*قطري/iu],
  ['KWD', /\bKWD\b|د\.?\s?ك\.?|دينار\s*كويتي/iu],
  ['BHD', /\bBHD\b|د\.?\s?ب\.?|دينار\s*بحريني/iu],
  ['JOD', /\bJOD\b|دينار\s*أردني/iu],
  ['EGP', /\bEGP\b|جنيه/iu],
  ['USD', /\bUSD\b|دولار/iu],
  ['EUR', /\bEUR\b|يورو/iu],
];

const NUM = String.raw`\d{1,3}(?:[,٬]\d{3})*(?:[.٫]\d{1,3})?|\d+(?:[.٫]\d{1,3})?`;

/**
 * The merchant follows a marker word and runs until the next field. "لدى" and
 * "at" name the shop directly, so they win over the weaker "من" / "to", which
 * in "من حسابك لدى ..." would otherwise swallow the account wording.
 */
const MERCHANT_TAIL = String.raw`$|[,\u060C;\n]|ب?(?:ال)?بطاقة|بتاريخ|في\s+تاريخ|(?:ال)?رصيد|with\s+card|\bcard\b|\bon\b|\bbal\b|\bbalance\b|\bref\b|\d{2}[/-]\d{2}`;
const MERCHANT_STRONG = new RegExp(String.raw`(?:لدى|من\s+محل|at|@)\s+([^\n,\u060C;]{2,40}?)\s*(?=${MERCHANT_TAIL})`, 'iu');
const MERCHANT_WEAK = new RegExp(String.raw`(?:من|في|to)\s+([^\n,\u060C;]{2,40}?)\s*(?=${MERCHANT_TAIL})`, 'iu');

const CARD = /(?:\*+|x+|المنتهية\s*ب?|ending(?:\s*in)?|card(?:\s*no\.?)?\s*)\s*(\d{4})\b/iu;

/** Arabic-Indic and Persian digits to ASCII, keeping spacing (unlike core's normalizeDigits). */
function toAsciiDigits(text: string): string {
  return text.replace(/[\u0660-\u0669\u06F0-\u06F9]/gu, (d) => String(((d.codePointAt(0)! - 0x660) % 16) % 10));
}

function detectCurrency(text: string): string | null {
  for (const [code, re] of CURRENCY_WORDS) if (re.test(text)) return code;
  return null;
}

/** The number nearest the currency word, so "رصيد 300" is not taken for the amount. */
function detectAmount(text: string, code: string): string | null {
  const word = CURRENCY_WORDS.find(([c]) => c === code)![1].source;
  const after = new RegExp(String.raw`(?:${word})\s*(${NUM})`, 'iu').exec(text);
  if (after) return after[1];
  const before = new RegExp(String.raw`(${NUM})\s*(?:${word})`, 'iu').exec(text);
  return before ? before[1] : null;
}

/**
 * @param text the message exactly as the bank sent it.
 * @param currency the currency the app is set to (used only to flag a mismatch).
 */
export function parseBankSms(text: string, currency: Currency): SmsCandidate | null {
  if (!text || NOT_A_TRANSACTION.test(text)) return null;
  const t = text.replace(/‏|‎/g, '');

  const code = detectCurrency(t);
  if (!code) return null;
  const spec = CURRENCIES.find((c) => c.code === code);
  if (!spec) return null;

  const raw = detectAmount(toAsciiDigits(t), code);
  if (raw == null) return null;
  const amount = parseAmount(raw, spec);
  if (!amount.ok) return null;

  const isCredit = CREDIT.test(t);
  let kind: SmsKind = 'purchase';
  if (isCredit) kind = 'credit';
  else {
    const hit = DEBIT.find(([, re]) => re.test(t));
    if (!hit) return null; // Not clearly a transaction — a balance notice, an advert.
    kind = hit[0];
  }

  const merchant = (MERCHANT_STRONG.exec(t)?.[1] ?? MERCHANT_WEAK.exec(t)?.[1])?.trim() ?? null;
  return {
    kind,
    amountMinor: amount.minor,
    currencyCode: code,
    merchant: merchant && merchant.length >= 2 ? merchant : null,
    cardLast4: CARD.exec(t)?.[1] ?? null,
    isCredit,
    foreignCurrency: code !== currency.code,
  };
}
