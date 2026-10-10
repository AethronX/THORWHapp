import { currencyFromCode } from '../src/core/currency';
import { parseTextEntry } from '../src/domain/textEntry';

const OMR = currencyFromCode('OMR');
const AED = currencyFromCode('AED');

test('amount and note from typed or dictated text', () => {
  expect(parseTextEntry('قهوة 1.5', OMR)).toEqual({ amountMinor: 1500, note: 'قهوة' });
  expect(parseTextEntry('بنزين ٥٫٥ ر.ع', OMR)).toEqual({ amountMinor: 5500, note: 'بنزين' });
  expect(parseTextEntry('غداء العائلة 12.300 ريال عماني', OMR)).toEqual({ amountMinor: 12300, note: 'غداء العائلة' });
  expect(parseTextEntry('12.5 Lulu', OMR)).toEqual({ amountMinor: 12500, note: 'Lulu' });
  expect(parseTextEntry('Lulu 12.5 OMR', OMR)).toEqual({ amountMinor: 12500, note: 'Lulu' });
});

test('baisa: 500 بيسة = 0.500 OMR (Omani usage)', () => {
  expect(parseTextEntry('قهوة 500 بيسة', OMR)).toEqual({ amountMinor: 500, note: 'قهوة' });
  expect(parseTextEntry('موقف ٢٠٠ بيسه', OMR)).toEqual({ amountMinor: 200, note: 'موقف' });
  expect(parseTextEntry('قهوة 500 بيسة', AED).amountMinor).toBeNull(); // baisa only for OMR
});

test('no amount, or an invalid one → note only; currency decimals respected', () => {
  expect(parseTextEntry('قهوة', OMR)).toEqual({ amountMinor: null, note: 'قهوة' });
  expect(parseTextEntry('قهوة 1.2345', OMR).amountMinor).toBeNull(); // 4 decimals > OMR's 3
  expect(parseTextEntry('Taxi 7.25', AED)).toEqual({ amountMinor: 725, note: 'Taxi' });
});
