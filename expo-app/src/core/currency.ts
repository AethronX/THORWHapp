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

export const CURRENCIES: readonly Currency[] = [
  { code: 'OMR', exponent: 3 },
  { code: 'AED', exponent: 2 },
  { code: 'SAR', exponent: 2 },
  { code: 'QAR', exponent: 2 },
  { code: 'KWD', exponent: 3 },
  { code: 'BHD', exponent: 3 },
  { code: 'USD', exponent: 2 },
  { code: 'EUR', exponent: 2 },
  { code: 'EGP', exponent: 2 },
  { code: 'JOD', exponent: 3 },
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
