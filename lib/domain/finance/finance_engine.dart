/// Tharwati deterministic financial calculation engine.
///
/// Pure Dart: no Flutter, no I/O, no clock. Every function is a pure function
/// of its inputs so it can be unit-tested against independently computed
/// reference values. See `docs/FINANCE_FORMULAS.md` for the full derivations.
///
/// Conventions
/// * Money in/out is `int` minor units (baisa for OMR). Intermediate compound
///   maths uses `double`; the result is rounded once at the end with
///   round-half-away-from-zero ([roundMinor]) unless a function documents
///   rounding up (amounts the user must *pay in* to reach a goal are rounded
///   up so the goal is actually reached).
/// * Rates are annual percentages (`5.0` == 5 % a year), compounded monthly
///   (`r = annualPercent / 100 / 12`). This is the nominal-annual convention,
///   not an effective-annual one; it is stated in the UI.
/// * Contributions are made at the **end** of each month (ordinary annuity).
/// * All results are **before** fees, taxes and inflation unless the function
///   name says "real". Hypothetical returns are illustrations, never
///   forecasts or guarantees.
library;

import 'dart:math' as math;

/// Thrown when an input violates a documented precondition.
class FinanceInputError extends ArgumentError {
  FinanceInputError(String field, String message) : super(message, field);
}

/// Upper bound on any horizon: 100 years.
const int maxMonths = 1200;

/// Allowed range for hypothetical annual return / interest rates.
const double minAnnualRatePercent = 0;
const double maxAnnualRatePercent = 100;

/// Allowed range for annual inflation assumptions (deflation allowed).
const double minInflationPercent = -50;
const double maxInflationPercent = 100;

/// Largest magnitude (2^53) at which every integer is exact in a double.
/// Results beyond it are reported as out of range instead of being silently
/// clamped by `double.round()`.
const double maxExactMinor = 9007199254740992;

/// Round a minor-unit double half away from zero.
int roundMinor(double v) {
  if (v.isNaN || v.isInfinite || v.abs() > maxExactMinor) {
    throw FinanceInputError('value', 'Result out of representable range');
  }
  return v.round();
}

int _ceilMinor(double v) {
  if (v.isNaN || v.isInfinite || v.abs() > maxExactMinor) {
    throw FinanceInputError('value', 'Result out of representable range');
  }
  // Guard against representation noise like 100.00000000001 -> 101.
  final r = v.roundToDouble();
  if ((v - r).abs() < 1e-6) return r.toInt();
  return v.ceil();
}

void _requireNonNegative(String field, int v) {
  if (v < 0) throw FinanceInputError(field, '$field must be >= 0');
}

void _requireMonths(int months, {bool allowZero = true}) {
  if (months < 0 || (!allowZero && months == 0) || months > maxMonths) {
    throw FinanceInputError(
      'months',
      'months must be in ${allowZero ? 0 : 1}..$maxMonths',
    );
  }
}

void _requireRate(double annualPercent) {
  if (annualPercent.isNaN ||
      annualPercent < minAnnualRatePercent ||
      annualPercent > maxAnnualRatePercent) {
    throw FinanceInputError(
      'annualRatePercent',
      'rate must be in $minAnnualRatePercent..$maxAnnualRatePercent',
    );
  }
}

void _requireInflation(double annualPercent) {
  if (annualPercent.isNaN ||
      annualPercent < minInflationPercent ||
      annualPercent > maxInflationPercent) {
    throw FinanceInputError(
      'inflationPercent',
      'inflation must be in $minInflationPercent..$maxInflationPercent',
    );
  }
}

double _monthlyRate(double annualPercent) => annualPercent / 100 / 12;

// ---------------------------------------------------------------------------
// Cash flow
// ---------------------------------------------------------------------------

/// Sum of minor-unit amounts. Integer arithmetic: exact.
int sumMinor(Iterable<int> amounts) => amounts.fold(0, (a, b) => a + b);

/// Net monthly cash flow = income − expenses (may be negative).
int netCashFlow({required int incomeMinor, required int expensesMinor}) {
  _requireNonNegative('incomeMinor', incomeMinor);
  _requireNonNegative('expensesMinor', expensesMinor);
  return incomeMinor - expensesMinor;
}

/// Savings rate = (income − expenses) / income, as a fraction.
///
/// Returns `null` when income is zero (rate undefined). May be negative when
/// spending exceeds income.
double? savingsRate({required int incomeMinor, required int expensesMinor}) {
  _requireNonNegative('incomeMinor', incomeMinor);
  _requireNonNegative('expensesMinor', expensesMinor);
  if (incomeMinor == 0) return null;
  return (incomeMinor - expensesMinor) / incomeMinor;
}

/// Projected balance after [months] of constant [monthlyNetMinor] with no
/// return: `start + net * months`. Pure cash; no growth assumed.
int projectedCashBalance({
  required int startMinor,
  required int monthlyNetMinor,
  required int months,
}) {
  _requireMonths(months);
  return startMinor + monthlyNetMinor * months;
}

// ---------------------------------------------------------------------------
// Compound growth
// ---------------------------------------------------------------------------

class FutureValueResult {
  const FutureValueResult({
    required this.months,
    required this.annualRatePercent,
    required this.totalContributedMinor,
    required this.nominalValueMinor,
  });

  final int months;
  final double annualRatePercent;

  /// Initial amount + all monthly deposits. This is real cash the user put in.
  final int totalContributedMinor;

  /// Hypothetical nominal value including assumed growth.
  final int nominalValueMinor;

  /// Hypothetical growth = value − contributions. Never presented as earned.
  int get hypotheticalGrowthMinor => nominalValueMinor - totalContributedMinor;
}

/// Future value of an initial lump sum plus end-of-month deposits.
///
/// r = annual% / 1200, n = months
/// FV = P·(1+r)^n + PMT·((1+r)^n − 1)/r        (r > 0)
/// FV = P + PMT·n                              (r = 0)
FutureValueResult futureValue({
  required int initialMinor,
  required int monthlyMinor,
  required int months,
  required double annualRatePercent,
}) {
  _requireNonNegative('initialMinor', initialMinor);
  _requireNonNegative('monthlyMinor', monthlyMinor);
  _requireMonths(months);
  _requireRate(annualRatePercent);

  final contributed = initialMinor + monthlyMinor * months;
  final r = _monthlyRate(annualRatePercent);
  int value;
  if (r == 0) {
    value = contributed;
  } else {
    final g = math.pow(1 + r, months).toDouble();
    value = roundMinor(initialMinor * g + monthlyMinor * (g - 1) / r);
  }
  return FutureValueResult(
    months: months,
    annualRatePercent: annualRatePercent,
    totalContributedMinor: contributed,
    nominalValueMinor: value,
  );
}

/// Runs [futureValue] for each rate in [annualRatesPercent] (e.g. 0, 3, 6)
/// so the UI can show "saving only" next to hypothetical-return scenarios.
List<FutureValueResult> compareScenarios({
  required int initialMinor,
  required int monthlyMinor,
  required int months,
  required List<double> annualRatesPercent,
}) => [
  for (final rate in annualRatesPercent)
    futureValue(
      initialMinor: initialMinor,
      monthlyMinor: monthlyMinor,
      months: months,
      annualRatePercent: rate,
    ),
];

/// Today's purchasing power of [nominalMinor] received after [months], given
/// constant annual inflation: real = nominal / (1 + i)^(months/12).
/// Inflation compounds annually (effective annual rate).
int realValue({
  required int nominalMinor,
  required int months,
  required double annualInflationPercent,
}) {
  _requireMonths(months);
  _requireInflation(annualInflationPercent);
  final factor = math
      .pow(1 + annualInflationPercent / 100, months / 12)
      .toDouble();
  return roundMinor(nominalMinor / factor);
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

/// Monthly deposit needed to reach [targetMinor] in [months], starting from
/// [savedMinor] already set aside. Rounded **up** to the minor unit.
///
/// remaining = target − saved·(1+r)^n
/// r = 0:  pmt = remaining / n
/// r > 0:  pmt = remaining · r / ((1+r)^n − 1)
///
/// Returns 0 if the goal is already reached. If [months] is 0 the whole
/// remaining amount is due now and is returned.
int requiredMonthlySaving({
  required int targetMinor,
  required int savedMinor,
  required int months,
  double annualRatePercent = 0,
}) {
  _requireNonNegative('targetMinor', targetMinor);
  _requireNonNegative('savedMinor', savedMinor);
  _requireMonths(months);
  _requireRate(annualRatePercent);

  if (savedMinor >= targetMinor) return 0;
  if (months == 0) return targetMinor - savedMinor;
  final r = _monthlyRate(annualRatePercent);
  if (r == 0) {
    return _ceilMinor((targetMinor - savedMinor) / months);
  }
  final g = math.pow(1 + r, months).toDouble();
  final remaining = targetMinor - savedMinor * g;
  if (remaining <= 0) return 0;
  return _ceilMinor(remaining * r / (g - 1));
}

/// Progress toward a goal as a fraction clamped to 0..1.
double goalProgress({required int savedMinor, required int targetMinor}) {
  if (targetMinor <= 0) return 1;
  final p = savedMinor / targetMinor;
  return p.clamp(0.0, 1.0);
}

// ---------------------------------------------------------------------------
// Emergency fund
// ---------------------------------------------------------------------------

class EmergencyFundResult {
  const EmergencyFundResult({
    required this.targetMinor,
    required this.gapMinor,
    required this.monthsCovered,
  });

  /// essential monthly spend × target months.
  final int targetMinor;

  /// max(0, target − saved).
  final int gapMinor;

  /// saved / essential monthly spend; `null` if essential spend is 0.
  final double? monthsCovered;
}

EmergencyFundResult emergencyFund({
  required int monthlyEssentialMinor,
  required int savedMinor,
  int targetMonths = 6,
}) {
  _requireNonNegative('monthlyEssentialMinor', monthlyEssentialMinor);
  _requireNonNegative('savedMinor', savedMinor);
  if (targetMonths < 1 || targetMonths > 24) {
    throw FinanceInputError('targetMonths', 'targetMonths must be in 1..24');
  }
  final target = monthlyEssentialMinor * targetMonths;
  final gap = math.max(0, target - savedMinor);
  return EmergencyFundResult(
    targetMinor: target,
    gapMinor: gap,
    monthsCovered: monthlyEssentialMinor == 0
        ? null
        : savedMinor / monthlyEssentialMinor,
  );
}

// ---------------------------------------------------------------------------
// Debt payoff
// ---------------------------------------------------------------------------

class DebtPayoffResult {
  const DebtPayoffResult({
    required this.paysOff,
    required this.months,
    required this.totalInterestMinor,
    required this.totalPaidMinor,
  });

  /// False when the payment never covers interest (or exceeds [maxMonths]).
  final bool paysOff;
  final int months;
  final int totalInterestMinor;
  final int totalPaidMinor;
}

/// Simulates a fixed monthly payment against a balance with monthly-compounded
/// interest (APR / 12). Interest is rounded to the minor unit each month, as a
/// lender statement would be. The final payment is only what is still owed.
///
/// Assumptions (shown to the user): fixed rate, no fees, no new borrowing,
/// payment at month end after interest is added.
DebtPayoffResult debtPayoff({
  required int balanceMinor,
  required double annualRatePercent,
  required int monthlyPaymentMinor,
}) {
  _requireNonNegative('balanceMinor', balanceMinor);
  _requireNonNegative('monthlyPaymentMinor', monthlyPaymentMinor);
  _requireRate(annualRatePercent);

  if (balanceMinor == 0) {
    return const DebtPayoffResult(
      paysOff: true,
      months: 0,
      totalInterestMinor: 0,
      totalPaidMinor: 0,
    );
  }
  final r = _monthlyRate(annualRatePercent);
  var balance = balanceMinor;
  var interestTotal = 0;
  var paid = 0;
  for (var m = 1; m <= maxMonths; m++) {
    final interest = roundMinor(balance * r);
    if (monthlyPaymentMinor <= interest) {
      return DebtPayoffResult(
        paysOff: false,
        months: m,
        totalInterestMinor: interestTotal,
        totalPaidMinor: paid,
      );
    }
    interestTotal += interest;
    balance += interest;
    final payment = math.min(monthlyPaymentMinor, balance);
    balance -= payment;
    paid += payment;
    if (balance == 0) {
      return DebtPayoffResult(
        paysOff: true,
        months: m,
        totalInterestMinor: interestTotal,
        totalPaidMinor: paid,
      );
    }
  }
  return DebtPayoffResult(
    paysOff: false,
    months: maxMonths,
    totalInterestMinor: interestTotal,
    totalPaidMinor: paid,
  );
}
