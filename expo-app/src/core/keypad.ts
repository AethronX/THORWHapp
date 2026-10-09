/**
 * Amount entry on the in-app keypad (Quick Add). Pure: the current text plus
 * one key gives the next text. The result is always something `parseAmount`
 * accepts or an empty string, so the keypad can never produce invalid input.
 */
export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back';

/** Up to 9 whole digits (999,999,999) — far below the safe-integer limit. */
export const MAX_WHOLE_DIGITS = 9;

export function keypadInput(current: string, key: KeypadKey, exponent: number): string {
  if (key === 'back') return current.slice(0, -1);
  const [whole, frac] = current.split('.');
  if (key === '.') {
    if (exponent === 0 || frac !== undefined) return current;
    return (whole === '' ? '0' : whole) + '.';
  }
  if (frac !== undefined) return frac.length >= exponent ? current : current + key;
  if (whole === '0') return key; // no leading zeros: "0" + "5" → "5"
  if (whole.length >= MAX_WHOLE_DIGITS) return current;
  return current + key;
}
