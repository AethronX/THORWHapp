import 'currency.dart';

/// Largest amount accepted from user input, in major units.
/// Keeps every stored value well inside the exact-integer range of doubles
/// (2^53) so engine calculations never lose minor-unit precision.
const int maxMajorAmount = 999999999;

/// Why an amount string was rejected.
enum AmountError { empty, invalid, tooManyDecimals, tooLarge, notPositive }

class AmountParseResult {
  const AmountParseResult.ok(this.minor) : error = null;
  const AmountParseResult.fail(this.error) : minor = null;

  final int? minor;
  final AmountError? error;

  bool get isOk => error == null;
}

const _arabicIndic = '٠١٢٣٤٥٦٧٨٩';
const _easternArabicIndic = '۰۱۲۳۴۵۶۷۸۹';

/// Normalises Arabic-Indic / Persian digits to ASCII, `٫` to `.`, the Arabic
/// thousands separator `٬` to `_`, and drops spaces. `,` is kept as-is and
/// resolved by [_resolveSeparators].
String normalizeDigits(String input) {
  final b = StringBuffer();
  for (final ch in input.split('')) {
    final i = _arabicIndic.indexOf(ch);
    final j = _easternArabicIndic.indexOf(ch);
    if (i >= 0) {
      b.write(i);
    } else if (j >= 0) {
      b.write(j);
    } else if (ch == '٫') {
      b.write('.'); // Arabic decimal separator
    } else if (ch == '٬') {
      b.write('_'); // Arabic thousands separator (unambiguous)
    } else if (ch == ' ' || ch == '\u00A0') {
      // Spaces are ignored.
    } else {
      b.write(ch);
    }
  }
  return b.toString();
}

final _grouped = RegExp(r'^\d{1,3}(?:[_,]\d{3})+(?:\.\d*)?$');

/// Resolves grouping/decimal commas. Returns null when the input is
/// ambiguous or malformed, so a wrong amount is never silently stored:
/// * `٬` (shown here as `_`) is always a thousands separator and must form
///   groups of three.
/// * With a `.` present, `,` must be a valid thousands separator.
/// * A single `,` followed by 1-2 digits is a decimal comma (`1,5` = 1.5).
/// * A single `,` followed by exactly 3 digits (`12,500`) is ambiguous for
///   3-decimal currencies such as OMR and is rejected.
/// * Several `,` must form valid groups of three.
String? _resolveSeparators(String s) {
  final hasArabicGroup = s.contains('_');
  final commas = ','.allMatches(s).length;
  if (!hasArabicGroup && commas == 0) return s;
  if (hasArabicGroup && commas > 0) return null;
  if (hasArabicGroup || s.contains('.') || commas > 1) {
    return _grouped.hasMatch(s) ? s.replaceAll(RegExp('[_,]'), '') : null;
  }
  final m = RegExp(r'^(\d+),(\d{1,2})$').firstMatch(s);
  return m == null ? null : '${m.group(1)}.${m.group(2)}';
}

/// Parses a user-typed decimal amount into integer minor units without ever
/// going through a floating-point value.
///
/// Accepts ASCII and Arabic-Indic digits, `.` or `٫` as decimal separator and
/// validated grouping separators (see [_resolveSeparators]). Rejects negatives, zero (unless [allowZero]),
/// more decimals than the currency supports, and values above
/// [maxMajorAmount].
AmountParseResult parseAmount(
  String raw,
  Currency currency, {
  bool allowZero = false,
}) {
  final normalized = normalizeDigits(raw.trim());
  if (normalized.isEmpty) {
    return const AmountParseResult.fail(AmountError.empty);
  }
  final s = _resolveSeparators(normalized);
  if (s == null) return const AmountParseResult.fail(AmountError.invalid);
  final match = RegExp(r'^(\d*)(?:\.(\d*))?$').firstMatch(s);
  if (match == null) return const AmountParseResult.fail(AmountError.invalid);
  final intPart = match.group(1) ?? '';
  final fracPart = match.group(2) ?? '';
  if (intPart.isEmpty && fracPart.isEmpty) {
    return const AmountParseResult.fail(AmountError.invalid);
  }
  if (fracPart.length > currency.exponent) {
    return const AmountParseResult.fail(AmountError.tooManyDecimals);
  }
  final trimmedInt = intPart.replaceFirst(RegExp(r'^0+(?=\d)'), '');
  if (trimmedInt.length > maxMajorAmount.toString().length) {
    return const AmountParseResult.fail(AmountError.tooLarge);
  }
  final major = int.parse(trimmedInt.isEmpty ? '0' : trimmedInt);
  if (major > maxMajorAmount) {
    return const AmountParseResult.fail(AmountError.tooLarge);
  }
  final frac = int.parse(
    fracPart.padRight(currency.exponent, '0').isEmpty
        ? '0'
        : fracPart.padRight(currency.exponent, '0'),
  );
  final minor = major * currency.minorPerMajor + frac;
  if (minor == 0 && !allowZero) {
    return const AmountParseResult.fail(AmountError.notPositive);
  }
  return AmountParseResult.ok(minor);
}

/// Formats minor units as a plain editable decimal string (no grouping),
/// used to pre-fill input fields, e.g. 12500 baisa -> "12.5".
String minorToEditable(int minor, Currency currency) {
  if (currency.exponent == 0) return minor.toString();
  final negative = minor < 0;
  final abs = minor.abs();
  final major = abs ~/ currency.minorPerMajor;
  var frac = (abs % currency.minorPerMajor)
      .toString()
      .padLeft(currency.exponent, '0')
      .replaceFirst(RegExp(r'0+$'), '');
  final body = frac.isEmpty ? '$major' : '$major.$frac';
  return negative ? '-$body' : body;
}
