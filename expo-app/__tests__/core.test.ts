/** @jest-environment node */
import { minorToEditable, parseAmount } from '../src/core/amountParser';
import { CURRENCIES, currencyFromCode } from '../src/core/currency';
import { addMonths, dayKey, lastDayKey, monthsUntil, parseDayKey } from '../src/core/dates';

const OMR = currencyFromCode('OMR');
const USD = currencyFromCode('USD');
const omr = (s: string) => {
  const r = parseAmount(s, OMR);
  return r.ok ? r.minor : null;
};
const err = (s: string, c = OMR) => {
  const r = parseAmount(s, c);
  return r.ok ? null : r.error;
};

describe('parseAmount', () => {
  test('OMR to baisa without floating point', () => {
    expect(omr('12.5')).toBe(12500);
    expect(omr('12.505')).toBe(12505);
    expect(omr('0.001')).toBe(1);
    expect(omr('.5')).toBe(500);
    expect(omr('7')).toBe(7000);
    expect(omr('7.')).toBe(7000);
    expect(omr('0.1')).toBe(100);
    expect(omr('1,250.75')).toBe(1250750);
    expect(omr('  42 ')).toBe(42000);
    expect(omr('007')).toBe(7000);
  });

  test('commas are never silently misread', () => {
    expect(omr('1,5')).toBe(1500);
    expect(omr('12,50')).toBe(12500);
    expect(omr('1,250,000')).toBe(1250000000);
    expect(omr('1,250.5')).toBe(1250500);
    expect(err('12,500')).toBe('invalid'); // ambiguous
    expect(err('1,2,3')).toBe('invalid');
    expect(err('12,50.5')).toBe('invalid');
    expect(err('١٬٢٥')).toBe('invalid');
    expect(err('1٬250,000')).toBe('invalid');
  });

  test('Arabic-Indic digits and separators', () => {
    expect(omr('١٢٫٥')).toBe(12500);
    expect(omr('١٬٢٥٠')).toBe(1250000);
    expect(omr('۳۴')).toBe(34000);
  });

  test('currency exponent', () => {
    const r = parseAmount('12.34', USD);
    expect(r.ok && r.minor).toBe(1234);
    expect(err('12.345', USD)).toBe('tooManyDecimals');
    expect(err('1.0001')).toBe('tooManyDecimals');
  });

  test('rejects bad input', () => {
    expect(err('')).toBe('empty');
    expect(err('   ')).toBe('empty');
    expect(err('abc')).toBe('invalid');
    expect(err('-5')).toBe('invalid');
    expect(err('1.2.3')).toBe('invalid');
    expect(err('.')).toBe('invalid');
    expect(err('1e5')).toBe('invalid');
    expect(err('0')).toBe('notPositive');
    expect(err('0.000')).toBe('notPositive');
    const z = parseAmount('0', OMR, { allowZero: true });
    expect(z.ok && z.minor).toBe(0);
  });

  test('caps size', () => {
    expect(omr('999999999.999')).toBe(999999999999);
    expect(err('1000000000')).toBe('tooLarge');
    expect(err('99999999999999999999')).toBe('tooLarge');
  });
});

test('minorToEditable round-trips', () => {
  for (const v of [0, 1, 500, 12500, 12505, 999999999999]) {
    const r = parseAmount(minorToEditable(v, OMR), OMR, { allowZero: true });
    expect(r.ok && r.minor).toBe(v);
  }
  expect(minorToEditable(12500, OMR)).toBe('12.5');
  expect(minorToEditable(1234, USD)).toBe('12.34');
});

test('currency list and fallback', () => {
  expect(CURRENCIES[0].code).toBe('OMR');
  expect(currencyFromCode('KWD').exponent).toBe(3);
  expect(currencyFromCode('XXX').code).toBe('OMR');
});

describe('dates', () => {
  test('month arithmetic across years', () => {
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 3 }, -15)).toEqual({ year: 2024, month: 12 });
  });

  test('leap February', () => {
    expect(lastDayKey({ year: 2028, month: 2 })).toBe('2028-02-29');
    expect(lastDayKey({ year: 2026, month: 2 })).toBe('2026-02-28');
  });

  test('day keys and monthsUntil (month-end deposits)', () => {
    const d = { year: 2026, month: 10, day: 9 };
    expect(parseDayKey(dayKey(d))).toEqual(d);
    const to = (y: number, m: number, dd: number) => monthsUntil(d, { year: y, month: m, day: dd });
    expect(to(2027, 4, 1)).toBe(6);
    expect(to(2026, 10, 30)).toBe(0);
    expect(to(2026, 10, 31)).toBe(1);
    expect(to(2027, 4, 30)).toBe(7);
    expect(to(2028, 2, 29)).toBe(17);
    expect(to(2025, 1, 1)).toBe(0);
  });
});

describe('keypadInput', () => {
  const { keypadInput } = require('../src/core/keypad');
  const typeKeys = (keys: string[], exp = 3) => keys.reduce((acc: string, k: string) => keypadInput(acc, k, exp), '');
  test('digits, decimal point and backspace', () => {
    expect(typeKeys(['1', '2', '.', '5'])).toBe('12.5');
    expect(typeKeys(['.', '7'])).toBe('0.7');
    expect(typeKeys(['1', '.', '.', '2'])).toBe('1.2'); // one point only
    expect(typeKeys(['1', '2', 'back'])).toBe('1');
    expect(typeKeys(['back'])).toBe('');
  });
  test('respects currency decimals (OMR 3, AED 2, JPY-like 0)', () => {
    expect(typeKeys(['1', '.', '2', '3', '4', '5'], 3)).toBe('1.234');
    expect(typeKeys(['1', '.', '2', '3', '4'], 2)).toBe('1.23');
    expect(typeKeys(['1', '.', '2'], 0)).toBe('12');
  });
  test('no leading zeros, at most 9 whole digits', () => {
    expect(typeKeys(['0', '0', '5'])).toBe('5');
    expect(typeKeys(['0', '.', '5'])).toBe('0.5');
    expect(typeKeys(Array(12).fill('9'))).toBe('999999999');
  });
});

describe('parsePercent', () => {
  const { parsePercent } = require('../src/core/percent');
  test('accepts dot, comma, Arabic digits; at most 2 decimals; 0..100', () => {
    expect(parsePercent('4.25')).toBe(4.25);
    expect(parsePercent('4,5')).toBe(4.5);
    expect(parsePercent('٤٫٢٥')).toBe(4.25);
    expect(parsePercent('0')).toBe(0);
    expect(parsePercent('100')).toBe(100);
    expect(parsePercent('7%')).toBe(7);
    for (const bad of ['', '4.255', '101', '-1', 'abc', '1.2.3']) expect(parsePercent(bad)).toBeNull();
  });
});

describe('toArabicDigits', () => {
  const { toArabicDigits } = require('../src/core/digits');
  test('numbers, separators and percent; currency symbol untouched', () => {
    expect(toArabicDigits('‎1,234.500‎ ر.ع.')).toBe('‎١٬٢٣٤٫٥٠٠‎ ر.ع.');
    expect(toArabicDigits('أكتوبر 2026')).toBe('أكتوبر ٢٠٢٦');
    expect(toArabicDigits('57%')).toBe('٥٧٪');
    expect(toArabicDigits('لا أرقام')).toBe('لا أرقام');
  });
});
