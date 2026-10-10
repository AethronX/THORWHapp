/**
 * Percent input ("4.25", "4,25", "٤٫٢٥") → number with at most 2 decimals,
 * 0..100. Returns null when invalid. Pure; tested in __tests__/core.test.ts.
 */
export function parsePercent(text: string): number | null {
  const t = text
    .trim()
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٫,]/g, '.')
    .replace(/%$/, '');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const v = Number(t);
  return v >= 0 && v <= 100 ? v : null;
}
