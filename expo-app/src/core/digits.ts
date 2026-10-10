/**
 * Display-only digit style. Converts number runs to Arabic-Indic digits with
 * the Arabic decimal (٫) and thousands (٬) separators, and % to ٪.
 * "ر.ع." is untouched (its dots are not between digits). Calculations and
 * inputs never see this — it is applied when text is drawn.
 */
const AR = '٠١٢٣٤٥٦٧٨٩';

export function toArabicDigits(text: string): string {
  return text.replace(/\d+(?:[.,]\d+)*%?/g, (run) =>
    run.replace(/\d/g, (d) => AR[Number(d)]).replace(/\./g, '٫').replace(/,/g, '٬').replace(/%$/, '٪'),
  );
}
