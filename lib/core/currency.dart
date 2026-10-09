/// Supported currencies and their minor-unit exponents (ISO 4217).
///
/// All monetary amounts in Tharwati are stored as integers in the currency's
/// minor unit (e.g. baisa for OMR, where 1 OMR = 1000 baisa). This avoids
/// binary floating-point drift in stored balances.
class Currency {
  const Currency(this.code, this.exponent);

  /// ISO 4217 alphabetic code, e.g. `OMR`.
  final String code;

  /// Number of decimal places of the minor unit (OMR = 3, USD = 2).
  final int exponent;

  /// Number of minor units in one major unit (10^exponent).
  int get minorPerMajor {
    var v = 1;
    for (var i = 0; i < exponent; i++) {
      v *= 10;
    }
    return v;
  }

  static const omr = Currency('OMR', 3);
  static const aed = Currency('AED', 2);
  static const sar = Currency('SAR', 2);
  static const qar = Currency('QAR', 2);
  static const kwd = Currency('KWD', 3);
  static const bhd = Currency('BHD', 3);
  static const usd = Currency('USD', 2);
  static const eur = Currency('EUR', 2);
  static const egp = Currency('EGP', 2);
  static const jod = Currency('JOD', 3);

  /// Ordered for the picker: Oman first, then GCC, then others.
  static const supported = <Currency>[
    omr,
    aed,
    sar,
    qar,
    kwd,
    bhd,
    usd,
    eur,
    egp,
    jod,
  ];

  static const defaultCurrency = omr;

  static Currency fromCode(String? code) {
    for (final c in supported) {
      if (c.code == code) return c;
    }
    return defaultCurrency;
  }

  @override
  bool operator ==(Object other) => other is Currency && other.code == code;

  @override
  int get hashCode => code.hashCode;

  @override
  String toString() => code;
}
