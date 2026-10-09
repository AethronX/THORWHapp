import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../application/app_scope.dart';
import '../core/amount_parser.dart';
import '../core/currency.dart';
import '../domain/models.dart';
import '../l10n/app_localizations.dart';

/// Arabic display symbols. English UI uses the ISO code.
const Map<String, String> _arabicSymbols = {
  'OMR': 'ر.ع.',
  'AED': 'د.إ',
  'SAR': 'ر.س',
  'QAR': 'ر.ق',
  'KWD': 'د.ك',
  'BHD': 'د.ب',
  'USD': r'$',
  'EUR': '€',
  'EGP': 'ج.م',
  'JOD': 'د.أ',
};

const Map<String, (String, String)> currencyNames = {
  'OMR': ('ريال عُماني', 'Omani rial'),
  'AED': ('درهم إماراتي', 'UAE dirham'),
  'SAR': ('ريال سعودي', 'Saudi riyal'),
  'QAR': ('ريال قطري', 'Qatari riyal'),
  'KWD': ('دينار كويتي', 'Kuwaiti dinar'),
  'BHD': ('دينار بحريني', 'Bahraini dinar'),
  'USD': ('دولار أمريكي', 'US dollar'),
  'EUR': ('يورو', 'Euro'),
  'EGP': ('جنيه مصري', 'Egyptian pound'),
  'JOD': ('دينار أردني', 'Jordanian dinar'),
};

String currencyName(Currency c, String languageCode) {
  final n = currencyNames[c.code];
  if (n == null) return c.code;
  return languageCode == 'ar' ? n.$1 : n.$2;
}

/// Formats integer minor units for display, e.g. 12500 OMR -> "12.500 ر.ع.".
///
/// Uses Western digits in both languages (common in Omani banking apps);
/// the format pattern follows the locale. Integer -> string conversion is
/// done without floating point to keep large values exact.
String formatMoney(
  int minor,
  Currency currency,
  String languageCode, {
  bool signed = false,
}) {
  final negative = minor < 0;
  final abs = minor.abs();
  final major = abs ~/ currency.minorPerMajor;
  final frac = abs % currency.minorPerMajor;
  final grouped = NumberFormat.decimalPattern('en').format(major);
  final body = currency.exponent == 0
      ? grouped
      : '$grouped.${frac.toString().padLeft(currency.exponent, '0')}';
  final sign = negative ? '-' : (signed && minor > 0 ? '+' : '');
  if (languageCode == 'ar') {
    // LRM keeps the sign and digits together inside RTL text.
    return '‎$sign$body‎ ${_arabicSymbols[currency.code] ?? currency.code}';
  }
  return '${currency.code} $sign$body';
}

String currencySymbol(Currency c, String languageCode) =>
    languageCode == 'ar' ? (_arabicSymbols[c.code] ?? c.code) : c.code;

/// Whole percent, rounded down so an unfinished goal never reads "100%".
String formatPercent(double fraction) {
  final pct = fraction * 100;
  return '${(pct >= 0 ? pct.floor() : pct.ceil())}%';
}

String formatDate(DateTime d, String languageCode) =>
    DateFormat.yMMMd(languageCode).format(d);

String formatMonth(DateTime d, String languageCode) =>
    DateFormat.yMMMM(languageCode).format(d);

/// Convenience accessors bound to the current context.
extension FormatX on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
  String get lang => Localizations.localeOf(this).languageCode;
  String money(int minor, {bool signed = false}) =>
      formatMoney(minor, AppScope.read(this).currency, lang, signed: signed);
}

String categoryLabel(Category c, AppLocalizations l) {
  if (c.name != null && c.name!.trim().isNotEmpty) return c.name!;
  return switch (c.key) {
    'housing' => l.cat_housing,
    'food' => l.cat_food,
    'transport' => l.cat_transport,
    'utilities' => l.cat_utilities,
    'telecom' => l.cat_telecom,
    'health' => l.cat_health,
    'education' => l.cat_education,
    'family' => l.cat_family,
    'shopping' => l.cat_shopping,
    'entertainment' => l.cat_entertainment,
    'debt' => l.cat_debt,
    _ => l.cat_other,
  };
}

const List<IconData> categoryIcons = [
  Icons.home_outlined,
  Icons.shopping_basket_outlined,
  Icons.directions_car_outlined,
  Icons.bolt_outlined,
  Icons.wifi,
  Icons.favorite_border,
  Icons.school_outlined,
  Icons.family_restroom,
  Icons.shopping_bag_outlined,
  Icons.movie_outlined,
  Icons.account_balance_outlined,
  Icons.category_outlined,
];

IconData categoryIcon(Category c) =>
    categoryIcons[c.iconCode.clamp(0, categoryIcons.length - 1)];

/// Localised message for an amount validation error.
String? amountErrorText(AmountError? e, Currency c, AppLocalizations l) =>
    switch (e) {
      null => null,
      AmountError.empty => l.errAmountEmpty,
      AmountError.invalid => l.errAmountInvalid,
      AmountError.tooManyDecimals => l.errAmountDecimals(c.exponent),
      AmountError.tooLarge => l.errAmountTooLarge,
      AmountError.notPositive => l.errAmountPositive,
    };
