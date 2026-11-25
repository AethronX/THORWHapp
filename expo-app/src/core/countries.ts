/**
 * Where the user lives, kept separate from what they spend (D-055).
 *
 * The weekend used to be derived from the currency, which is wrong twice over:
 * a currency is not a country (anyone can hold dollars), and several Arab
 * countries share one. The country is its own setting, and everything that
 * depends on local rhythm reads it.
 *
 * Weekends are the working week in force today: Saturday–Sunday in the UAE
 * (since 2022), Morocco, Tunisia, Algeria, Lebanon and the Comoros; Friday–
 * Saturday across the rest of the Arab League.
 */
export interface Country {
  /** ISO 3166-1 alpha-2. */
  readonly code: string;
  /** ISO 4217 code of the currency used there. */
  readonly currency: string;
  /** Weekend as JS getDay() numbers (0 Sunday … 5 Friday, 6 Saturday). */
  readonly weekend: readonly number[];
}

const FRI_SAT = [5, 6] as const;
const SAT_SUN = [6, 0] as const;

export const COUNTRIES: readonly Country[] = [
  { code: 'OM', currency: 'OMR', weekend: FRI_SAT },
  { code: 'SA', currency: 'SAR', weekend: FRI_SAT },
  { code: 'AE', currency: 'AED', weekend: SAT_SUN },
  { code: 'QA', currency: 'QAR', weekend: FRI_SAT },
  { code: 'KW', currency: 'KWD', weekend: FRI_SAT },
  { code: 'BH', currency: 'BHD', weekend: FRI_SAT },
  { code: 'YE', currency: 'YER', weekend: FRI_SAT },
  { code: 'IQ', currency: 'IQD', weekend: FRI_SAT },
  { code: 'JO', currency: 'JOD', weekend: FRI_SAT },
  { code: 'PS', currency: 'ILS', weekend: FRI_SAT },
  { code: 'SY', currency: 'SYP', weekend: FRI_SAT },
  { code: 'LB', currency: 'LBP', weekend: SAT_SUN },
  { code: 'EG', currency: 'EGP', weekend: FRI_SAT },
  { code: 'SD', currency: 'SDG', weekend: FRI_SAT },
  { code: 'LY', currency: 'LYD', weekend: FRI_SAT },
  { code: 'TN', currency: 'TND', weekend: SAT_SUN },
  { code: 'DZ', currency: 'DZD', weekend: SAT_SUN },
  { code: 'MA', currency: 'MAD', weekend: SAT_SUN },
  { code: 'MR', currency: 'MRU', weekend: FRI_SAT },
  { code: 'SO', currency: 'SOS', weekend: FRI_SAT },
  { code: 'DJ', currency: 'DJF', weekend: FRI_SAT },
  { code: 'KM', currency: 'KMF', weekend: SAT_SUN },
  // Outside the Arab League, for users living abroad.
  { code: 'TR', currency: 'TRY', weekend: SAT_SUN },
  { code: 'GB', currency: 'GBP', weekend: SAT_SUN },
  { code: 'US', currency: 'USD', weekend: SAT_SUN },
  { code: 'OTHER', currency: 'USD', weekend: SAT_SUN },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function countryFromCode(code: string | null | undefined): Country | null {
  return COUNTRIES.find((c) => c.code === code) ?? null;
}

/** The first country that uses this currency — the best guess before the user picks one. */
export function countryForCurrency(currencyCode: string): Country | null {
  return COUNTRIES.find((c) => c.currency === currencyCode) ?? null;
}

/**
 * Weekend of the chosen country; failing that, of the country that uses this
 * currency; failing that, Saturday–Sunday, which is the world's common week.
 */
export function weekendOf(countryCode: string | null | undefined, currencyCode: string): readonly number[] {
  return (countryFromCode(countryCode) ?? countryForCurrency(currencyCode))?.weekend ?? SAT_SUN;
}
