import 'package:flutter_test/flutter_test.dart';
import 'package:tharwati/domain/finance/finance_engine.dart';

/// Reference values were computed independently with Python `decimal`
/// at 50-digit precision (script in docs/FINANCE_FORMULAS.md), not with this
/// engine. Amounts are OMR minor units (baisa): 1 OMR = 1000.
void main() {
  group('cash flow', () {
    test('sumMinor is exact integer arithmetic', () {
      expect(sumMinor([100, 250, 1]), 351);
      expect(sumMinor(const []), 0);
      // 0.1 + 0.2 problem does not exist in minor units.
      expect(sumMinor([100, 200]), 300);
    });

    test('netCashFlow can be negative', () {
      expect(netCashFlow(incomeMinor: 800000, expensesMinor: 650500), 149500);
      expect(netCashFlow(incomeMinor: 500000, expensesMinor: 600000), -100000);
      expect(netCashFlow(incomeMinor: 0, expensesMinor: 0), 0);
    });

    test('netCashFlow rejects negative inputs', () {
      expect(
        () => netCashFlow(incomeMinor: -1, expensesMinor: 0),
        throwsA(isA<FinanceInputError>()),
      );
      expect(
        () => netCashFlow(incomeMinor: 0, expensesMinor: -1),
        throwsA(isA<FinanceInputError>()),
      );
    });

    test('savingsRate', () {
      expect(savingsRate(incomeMinor: 1000000, expensesMinor: 750000), 0.25);
      expect(savingsRate(incomeMinor: 1000000, expensesMinor: 1250000), -0.25);
      expect(savingsRate(incomeMinor: 1000000, expensesMinor: 0), 1.0);
      expect(savingsRate(incomeMinor: 0, expensesMinor: 5000), isNull);
    });

    test('projectedCashBalance has no growth', () {
      expect(
        projectedCashBalance(
          startMinor: 1000000,
          monthlyNetMinor: 150000,
          months: 12,
        ),
        2800000,
      );
      expect(
        projectedCashBalance(
          startMinor: 100000,
          monthlyNetMinor: -50000,
          months: 3,
        ),
        -50000,
      );
      expect(
        () =>
            projectedCashBalance(startMinor: 0, monthlyNetMinor: 0, months: -1),
        throwsA(isA<FinanceInputError>()),
      );
    });
  });

  group('futureValue', () {
    test('100 OMR/month, 10y, 5% nominal monthly', () {
      final r = futureValue(
        initialMinor: 0,
        monthlyMinor: 100000,
        months: 120,
        annualRatePercent: 5,
      );
      expect(r.nominalValueMinor, 15528228);
      expect(r.totalContributedMinor, 12000000);
      expect(r.hypotheticalGrowthMinor, 15528228 - 12000000);
    });

    test('lump sum only, 12% for 1 year', () {
      final r = futureValue(
        initialMinor: 1000000,
        monthlyMinor: 0,
        months: 12,
        annualRatePercent: 12,
      );
      expect(r.nominalValueMinor, 1126825);
    });

    test('lump sum + deposits, 30y at 7%', () {
      final r = futureValue(
        initialMinor: 500000,
        monthlyMinor: 50000,
        months: 360,
        annualRatePercent: 7,
      );
      expect(r.nominalValueMinor, 65056799);
    });

    test('0% equals plain contributions', () {
      final r = futureValue(
        initialMinor: 250000,
        monthlyMinor: 25000,
        months: 60,
        annualRatePercent: 0,
      );
      expect(r.nominalValueMinor, 1750000);
      expect(r.hypotheticalGrowthMinor, 0);
    });

    test('zero months returns the initial amount', () {
      final r = futureValue(
        initialMinor: 1234,
        monthlyMinor: 999,
        months: 0,
        annualRatePercent: 9,
      );
      expect(r.nominalValueMinor, 1234);
      expect(r.totalContributedMinor, 1234);
    });

    test('large values stay finite and exact at 0%', () {
      final r = futureValue(
        initialMinor: 999999999999,
        monthlyMinor: 999999999999,
        months: maxMonths,
        annualRatePercent: 0,
      );
      expect(r.nominalValueMinor, 999999999999 * (maxMonths + 1));
    });

    test('rejects invalid inputs', () {
      expect(
        () => futureValue(
          initialMinor: -1,
          monthlyMinor: 0,
          months: 1,
          annualRatePercent: 1,
        ),
        throwsA(isA<FinanceInputError>()),
      );
      expect(
        () => futureValue(
          initialMinor: 0,
          monthlyMinor: 0,
          months: 1201,
          annualRatePercent: 1,
        ),
        throwsA(isA<FinanceInputError>()),
      );
      expect(
        () => futureValue(
          initialMinor: 0,
          monthlyMinor: 0,
          months: 1,
          annualRatePercent: -1,
        ),
        throwsA(isA<FinanceInputError>()),
      );
      expect(
        () => futureValue(
          initialMinor: 0,
          monthlyMinor: 0,
          months: 1,
          annualRatePercent: double.nan,
        ),
        throwsA(isA<FinanceInputError>()),
      );
    });

    test('compareScenarios keeps order and the 0% baseline', () {
      final rs = compareScenarios(
        initialMinor: 0,
        monthlyMinor: 100000,
        months: 120,
        annualRatesPercent: [0, 5],
      );
      expect(rs.map((r) => r.nominalValueMinor), [12000000, 15528228]);
      // Contributions are identical regardless of the assumed return.
      expect(rs[0].totalContributedMinor, rs[1].totalContributedMinor);
    });
  });

  group('realValue (inflation)', () {
    test('2% for 10 years', () {
      expect(
        realValue(
          nominalMinor: 1000000,
          months: 120,
          annualInflationPercent: 2,
        ),
        820348,
      );
    });

    test('fractional years: 3% for 30 months', () {
      expect(
        realValue(nominalMinor: 2000000, months: 30, annualInflationPercent: 3),
        1857535,
      );
    });

    test('0% inflation and 0 months are identity', () {
      expect(
        realValue(nominalMinor: 5000, months: 120, annualInflationPercent: 0),
        5000,
      );
      expect(
        realValue(nominalMinor: 5000, months: 0, annualInflationPercent: 8),
        5000,
      );
    });

    test('deflation increases real value; bounds enforced', () {
      expect(
        realValue(nominalMinor: 1000, months: 12, annualInflationPercent: -50),
        2000,
      );
      expect(
        () => realValue(
          nominalMinor: 1000,
          months: 12,
          annualInflationPercent: -60,
        ),
        throwsA(isA<FinanceInputError>()),
      );
    });
  });

  group('requiredMonthlySaving', () {
    test('0% divides evenly', () {
      expect(
        requiredMonthlySaving(targetMinor: 6000000, savedMinor: 0, months: 24),
        250000,
      );
    });

    test('0% rounds UP so the goal is actually reached', () {
      final pmt = requiredMonthlySaving(
        targetMinor: 6000000,
        savedMinor: 1000000,
        months: 24,
      );
      expect(pmt, 208334);
      expect(1000000 + pmt * 24, greaterThanOrEqualTo(6000000));
      expect(1000000 + (pmt - 1) * 24, lessThan(6000000));
    });

    test('with 6% hypothetical return', () {
      expect(
        requiredMonthlySaving(
          targetMinor: 10000000,
          savedMinor: 1000000,
          months: 36,
          annualRatePercent: 6,
        ),
        223798,
      );
    });

    test('result reaches the target when fed back into futureValue', () {
      final pmt = requiredMonthlySaving(
        targetMinor: 10000000,
        savedMinor: 1000000,
        months: 36,
        annualRatePercent: 6,
      );
      final fv = futureValue(
        initialMinor: 1000000,
        monthlyMinor: pmt,
        months: 36,
        annualRatePercent: 6,
      );
      expect(fv.nominalValueMinor, greaterThanOrEqualTo(10000000));
    });

    test('already reached or grows past target -> 0', () {
      expect(
        requiredMonthlySaving(targetMinor: 1000, savedMinor: 1000, months: 12),
        0,
      );
      expect(
        requiredMonthlySaving(targetMinor: 1000, savedMinor: 5000, months: 12),
        0,
      );
      expect(
        requiredMonthlySaving(
          targetMinor: 5000000,
          savedMinor: 4900000,
          months: 120,
          annualRatePercent: 10,
        ),
        0,
      );
    });

    test('0 months means everything remaining is due now', () {
      expect(
        requiredMonthlySaving(targetMinor: 5000, savedMinor: 1000, months: 0),
        4000,
      );
    });

    test('rejects negatives', () {
      expect(
        () => requiredMonthlySaving(targetMinor: -1, savedMinor: 0, months: 1),
        throwsA(isA<FinanceInputError>()),
      );
    });
  });

  test('goalProgress clamps to 0..1', () {
    expect(goalProgress(savedMinor: 500, targetMinor: 1000), 0.5);
    expect(goalProgress(savedMinor: 1500, targetMinor: 1000), 1.0);
    expect(goalProgress(savedMinor: -10, targetMinor: 1000), 0.0);
    expect(goalProgress(savedMinor: 0, targetMinor: 0), 1.0);
  });

  group('emergencyFund', () {
    test('6 months of essentials', () {
      final r = emergencyFund(
        monthlyEssentialMinor: 400000,
        savedMinor: 900000,
      );
      expect(r.targetMinor, 2400000);
      expect(r.gapMinor, 1500000);
      expect(r.monthsCovered, 2.25);
    });

    test('fully funded has zero gap; zero spend -> null coverage', () {
      expect(
        emergencyFund(monthlyEssentialMinor: 100, savedMinor: 1000).gapMinor,
        0,
      );
      expect(
        emergencyFund(monthlyEssentialMinor: 0, savedMinor: 1000).monthsCovered,
        isNull,
      );
      expect(
        () => emergencyFund(
          monthlyEssentialMinor: 1,
          savedMinor: 0,
          targetMonths: 0,
        ),
        throwsA(isA<FinanceInputError>()),
      );
    });
  });

  group('debtPayoff', () {
    test('1000 OMR at 12% APR paying 100/month', () {
      final r = debtPayoff(
        balanceMinor: 1000000,
        annualRatePercent: 12,
        monthlyPaymentMinor: 100000,
      );
      expect(r.paysOff, isTrue);
      expect(r.months, 11);
      expect(r.totalInterestMinor, 58985);
      expect(r.totalPaidMinor, 1058985);
    });

    test('3000 OMR at 18% APR paying 150/month', () {
      final r = debtPayoff(
        balanceMinor: 3000000,
        annualRatePercent: 18,
        monthlyPaymentMinor: 150000,
      );
      expect(r.months, 24);
      expect(r.totalInterestMinor, 593479);
    });

    test('payment that does not cover interest never pays off', () {
      final r = debtPayoff(
        balanceMinor: 1000000,
        annualRatePercent: 24,
        monthlyPaymentMinor: 20000,
      );
      expect(r.paysOff, isFalse);
    });

    test('0% and zero balance', () {
      final r = debtPayoff(
        balanceMinor: 600000,
        annualRatePercent: 0,
        monthlyPaymentMinor: 100000,
      );
      expect((r.paysOff, r.months, r.totalInterestMinor), (true, 6, 0));
      expect(
        debtPayoff(
          balanceMinor: 0,
          annualRatePercent: 5,
          monthlyPaymentMinor: 0,
        ).months,
        0,
      );
      expect(
        debtPayoff(
          balanceMinor: 100,
          annualRatePercent: 0,
          monthlyPaymentMinor: 0,
        ).paysOff,
        isFalse,
      );
    });
  });

  test('roundMinor is half away from zero and rejects non-finite', () {
    expect(roundMinor(2.5), 3);
    expect(roundMinor(-2.5), -3);
    expect(roundMinor(2.4999), 2);
    expect(
      () => roundMinor(double.infinity),
      throwsA(isA<FinanceInputError>()),
    );
  });
}
