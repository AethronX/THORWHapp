import 'package:flutter_test/flutter_test.dart';
import 'package:tharwati/core/amount_parser.dart';
import 'package:tharwati/core/currency.dart';
import 'package:tharwati/core/dates.dart';

void main() {
  group('parseAmount', () {
    int? omr(String s) => parseAmount(s, Currency.omr).minor;
    AmountError? err(String s, [Currency c = Currency.omr]) =>
        parseAmount(s, c).error;

    test('parses OMR to baisa without floating point', () {
      expect(omr('12.5'), 12500);
      expect(omr('12.505'), 12505);
      expect(omr('0.001'), 1);
      expect(omr('.5'), 500);
      expect(omr('7'), 7000);
      expect(omr('7.'), 7000);
      expect(omr('0.1'), 100);
      expect(omr('1,250.75'), 1250750);
      expect(omr('  42 '), 42000);
      expect(omr('007'), 7000);
    });

    test('commas: never silently misread', () {
      expect(omr('1,5'), 1500); // decimal comma
      expect(omr('12,50'), 12500);
      expect(omr('1,250,000'), 1250000000); // valid grouping
      expect(omr('1,250.5'), 1250500);
      expect(err('12,500'), AmountError.invalid); // ambiguous: 12.5 or 12500?
      expect(err('1,2,3'), AmountError.invalid);
      expect(err('12,50.5'), AmountError.invalid);
      expect(err('١٬٢٥'), AmountError.invalid); // bad Arabic grouping
      expect(err('1٬250,000'), AmountError.invalid); // mixed separators
    });

    test('accepts Arabic-Indic digits and separators', () {
      expect(omr('١٢٫٥'), 12500);
      expect(omr('١٬٢٥٠'), 1250000);
      expect(omr('۳۴'), 34000);
    });

    test('respects currency exponent', () {
      expect(parseAmount('12.34', Currency.usd).minor, 1234);
      expect(err('12.345', Currency.usd), AmountError.tooManyDecimals);
      expect(err('1.0001'), AmountError.tooManyDecimals);
    });

    test('rejects bad input', () {
      expect(err(''), AmountError.empty);
      expect(err('   '), AmountError.empty);
      expect(err('abc'), AmountError.invalid);
      expect(err('-5'), AmountError.invalid);
      expect(err('1.2.3'), AmountError.invalid);
      expect(err('.'), AmountError.invalid);
      expect(err('1e5'), AmountError.invalid);
      expect(err('0'), AmountError.notPositive);
      expect(err('0.000'), AmountError.notPositive);
      expect(parseAmount('0', Currency.omr, allowZero: true).minor, 0);
    });

    test('caps size', () {
      expect(omr('999999999.999'), 999999999999);
      expect(err('1000000000'), AmountError.tooLarge);
      expect(err('99999999999999999999'), AmountError.tooLarge);
    });
  });

  test('minorToEditable round-trips', () {
    for (final v in [0, 1, 500, 12500, 12505, 999999999999]) {
      final s = minorToEditable(v, Currency.omr);
      expect(parseAmount(s, Currency.omr, allowZero: true).minor, v, reason: s);
    }
    expect(minorToEditable(12500, Currency.omr), '12.5');
    expect(minorToEditable(1234, Currency.usd), '12.34');
  });

  group('YearMonth & dates', () {
    test('month arithmetic across years', () {
      expect(const YearMonth(2026, 1).previous, const YearMonth(2025, 12));
      expect(const YearMonth(2026, 12).next, const YearMonth(2027, 1));
      expect(
        const YearMonth(2026, 3).addMonths(-15),
        const YearMonth(2024, 12),
      );
      expect(YearMonth.parse('2026-02').key, '2026-02');
    });

    test('day range covers leap February', () {
      expect(const YearMonth(2028, 2).lastDayKey, '2028-02-29');
      expect(const YearMonth(2026, 2).lastDayKey, '2026-02-28');
    });

    test('dayKey/parseDayKey round-trip and monthsUntil', () {
      final d = DateTime(2026, 10, 9);
      expect(parseDayKey(dayKey(d)), d);
      expect(monthsUntil(DateTime(2026, 10, 9), DateTime(2027, 4, 1)), 6);
      expect(monthsUntil(DateTime(2026, 10, 9), DateTime(2026, 10, 30)), 0);
      expect(monthsUntil(DateTime(2026, 10, 9), DateTime(2026, 10, 31)), 1);
      expect(monthsUntil(DateTime(2026, 10, 9), DateTime(2027, 4, 30)), 7);
      expect(monthsUntil(DateTime(2026, 10, 9), DateTime(2028, 2, 29)), 17);
      expect(monthsUntil(DateTime(2026, 10, 9), DateTime(2025, 1, 1)), 0);
    });
  });
}
