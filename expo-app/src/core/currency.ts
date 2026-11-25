/**
 * Supported currencies and their ISO 4217 minor-unit exponents.
 *
 * All money is stored as integer minor units (OMR: 1 rial = 1000 baisa),
 * never as floating point. See DECISIONS D-004.
 */
export interface Currency {
  readonly code: string;
  readonly exponent: number;
}

/**
 * Every Arab League currency first, then the ones an Arab user abroad is most
 * likely to need (D-055). Exponents are ISO 4217: three decimals for the Gulf
 * dinars and rials, none at all for the Djibouti and Comorian francs.
 */
export const CURRENCIES: readonly Currency[] = [
  // Gulf
  { code: 'OMR', exponent: 3 },
  { code: 'AED', exponent: 2 },
  { code: 'SAR', exponent: 2 },
  { code: 'QAR', exponent: 2 },
  { code: 'KWD', exponent: 3 },
  { code: 'BHD', exponent: 3 },
  // Levant and Iraq
  { code: 'JOD', exponent: 3 },
  { code: 'IQD', exponent: 3 },
  { code: 'LBP', exponent: 2 },
  { code: 'SYP', exponent: 2 },
  { code: 'ILS', exponent: 2 },
  { code: 'YER', exponent: 2 },
  // North Africa
  { code: 'EGP', exponent: 2 },
  { code: 'MAD', exponent: 2 },
  { code: 'TND', exponent: 3 },
  { code: 'DZD', exponent: 2 },
  { code: 'LYD', exponent: 3 },
  { code: 'SDG', exponent: 2 },
  { code: 'MRU', exponent: 2 },
  { code: 'SOS', exponent: 2 },
  { code: 'DJF', exponent: 0 },
  { code: 'KMF', exponent: 0 },
  // Elsewhere
  { code: 'USD', exponent: 2 },
  { code: 'EUR', exponent: 2 },
  { code: 'GBP', exponent: 2 },
  { code: 'TRY', exponent: 2 },
];

export const DEFAULT_CURRENCY: Currency = CURRENCIES[0];

export function currencyFromCode(code: string | null | undefined): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? DEFAULT_CURRENCY;
}

/** 10^exponent, as an integer. */
export function minorPerMajor(c: Currency): number {
  let v = 1;
  for (let i = 0; i < c.exponent; i++) v *= 10;
  return v;
}

/** New official currency signs (⃁ ⃃ ⃄) are shown by default; users can choose the classic «ر.ع.» in Settings. */
export const CLASSIC_SIGN_BY_DEFAULT = false;
