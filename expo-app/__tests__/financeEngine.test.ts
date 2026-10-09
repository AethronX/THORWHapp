/**
 * @jest-environment node
 *
 * Reference values were computed independently with Python `decimal` at
 * 50-digit precision (script in docs/FINANCE_FORMULAS.md), not with this
 * engine. Amounts are OMR baisa: 1 OMR = 1000.
 */
import {
  compareScenarios,
  debtPayoff,
  emergencyFund,
  FinanceInputError,
  futureValue,
  goalProgress,
  MAX_MONTHS,
  netCashFlow,
  projectedCashBalance,
  realValue,
  requiredMonthlySaving,
  roundMinor,
  savingsRate,
  sumMinor,
} from '../src/domain/financeEngine';

const fv = (initialMinor: number, monthlyMinor: number, months: number, annualRatePercent: number) =>
  futureValue({ initialMinor, monthlyMinor, months, annualRatePercent });

describe('cash flow', () => {
  test('sumMinor is exact', () => {
    expect(sumMinor([100, 250, 1])).toBe(351);
    expect(sumMinor([])).toBe(0);
    expect(sumMinor([100, 200])).toBe(300);
  });

  test('netCashFlow can be negative; rejects negative inputs', () => {
    expect(netCashFlow(800000, 650500)).toBe(149500);
    expect(netCashFlow(500000, 600000)).toBe(-100000);
    expect(() => netCashFlow(-1, 0)).toThrow(FinanceInputError);
    expect(() => netCashFlow(0, -1)).toThrow(FinanceInputError);
    expect(() => netCashFlow(1.5, 0)).toThrow(FinanceInputError);
  });

  test('savingsRate', () => {
    expect(savingsRate(1000000, 750000)).toBe(0.25);
    expect(savingsRate(1000000, 1250000)).toBe(-0.25);
    expect(savingsRate(1000000, 0)).toBe(1);
    expect(savingsRate(0, 5000)).toBeNull();
  });

  test('projectedCashBalance has no growth', () => {
    expect(projectedCashBalance(1000000, 150000, 12)).toBe(2800000);
    expect(projectedCashBalance(100000, -50000, 3)).toBe(-50000);
    expect(() => projectedCashBalance(0, 0, -1)).toThrow(FinanceInputError);
  });
});

describe('futureValue', () => {
  test('100 OMR/month, 10y, 5%', () => {
    const r = fv(0, 100000, 120, 5);
    expect(r.nominalValueMinor).toBe(15528228);
    expect(r.totalContributedMinor).toBe(12000000);
    expect(r.hypotheticalGrowthMinor).toBe(3528228);
  });

  test('lump sum 12% for a year', () => {
    expect(fv(1000000, 0, 12, 12).nominalValueMinor).toBe(1126825);
  });

  test('lump sum + deposits, 30y at 7%', () => {
    expect(fv(500000, 50000, 360, 7).nominalValueMinor).toBe(65056799);
  });

  test('0% equals contributions; 0 months is the initial amount', () => {
    expect(fv(250000, 25000, 60, 0).nominalValueMinor).toBe(1750000);
    expect(fv(250000, 25000, 60, 0).hypotheticalGrowthMinor).toBe(0);
    expect(fv(1234, 999, 0, 9).nominalValueMinor).toBe(1234);
  });

  test('large values at 0% stay exact', () => {
    const r = fv(999999999999, 999999999999, MAX_MONTHS, 0);
    expect(r.nominalValueMinor).toBe(999999999999 * (MAX_MONTHS + 1));
  });

  test('beyond 2^53 is an error, never a clamped number', () => {
    expect(() => fv(0, 50000, 600, 70)).toThrow(FinanceInputError);
    expect(() => roundMinor(1e18)).toThrow(FinanceInputError);
  });

  test('rejects invalid inputs', () => {
    expect(() => fv(-1, 0, 1, 1)).toThrow(FinanceInputError);
    expect(() => fv(0, 0, 1201, 1)).toThrow(FinanceInputError);
    expect(() => fv(0, 0, 1, -1)).toThrow(FinanceInputError);
    expect(() => fv(0, 0, 1, NaN)).toThrow(FinanceInputError);
  });

  test('compareScenarios keeps order and identical contributions', () => {
    const rs = compareScenarios({ initialMinor: 0, monthlyMinor: 100000, months: 120, annualRatesPercent: [0, 5] });
    expect(rs.map((r) => r.nominalValueMinor)).toEqual([12000000, 15528228]);
    expect(rs[0].totalContributedMinor).toBe(rs[1].totalContributedMinor);
  });
});

describe('realValue', () => {
  test('2% for 10 years; 3% for 30 months', () => {
    expect(realValue({ nominalMinor: 1000000, months: 120, annualInflationPercent: 2 })).toBe(820348);
    expect(realValue({ nominalMinor: 2000000, months: 30, annualInflationPercent: 3 })).toBe(1857535);
  });

  test('identity cases, deflation, bounds', () => {
    expect(realValue({ nominalMinor: 5000, months: 120, annualInflationPercent: 0 })).toBe(5000);
    expect(realValue({ nominalMinor: 5000, months: 0, annualInflationPercent: 8 })).toBe(5000);
    expect(realValue({ nominalMinor: 1000, months: 12, annualInflationPercent: -50 })).toBe(2000);
    expect(() => realValue({ nominalMinor: 1000, months: 12, annualInflationPercent: -60 })).toThrow(
      FinanceInputError,
    );
  });
});

describe('requiredMonthlySaving', () => {
  const req = (targetMinor: number, savedMinor: number, months: number, annualRatePercent = 0) =>
    requiredMonthlySaving({ targetMinor, savedMinor, months, annualRatePercent });

  test('0% divides evenly and rounds UP', () => {
    expect(req(6000000, 0, 24)).toBe(250000);
    const pmt = req(6000000, 1000000, 24);
    expect(pmt).toBe(208334);
    expect(1000000 + pmt * 24).toBeGreaterThanOrEqual(6000000);
    expect(1000000 + (pmt - 1) * 24).toBeLessThan(6000000);
  });

  test('6% hypothetical return, and it reaches the target', () => {
    const pmt = req(10000000, 1000000, 36, 6);
    expect(pmt).toBe(223798);
    expect(fv(1000000, pmt, 36, 6).nominalValueMinor).toBeGreaterThanOrEqual(10000000);
  });

  test('reached / grows past target -> 0; 0 months -> remainder now', () => {
    expect(req(1000, 1000, 12)).toBe(0);
    expect(req(1000, 5000, 12)).toBe(0);
    expect(req(5000000, 4900000, 120, 10)).toBe(0);
    expect(req(5000, 1000, 0)).toBe(4000);
    expect(() => req(-1, 0, 1)).toThrow(FinanceInputError);
  });
});

test('goalProgress clamps', () => {
  expect(goalProgress(500, 1000)).toBe(0.5);
  expect(goalProgress(1500, 1000)).toBe(1);
  expect(goalProgress(-10, 1000)).toBe(0);
  expect(goalProgress(0, 0)).toBe(1);
});

describe('emergencyFund', () => {
  test('6 months of essentials', () => {
    expect(emergencyFund({ monthlyEssentialMinor: 400000, savedMinor: 900000 })).toEqual({
      targetMinor: 2400000,
      gapMinor: 1500000,
      monthsCovered: 2.25,
    });
  });

  test('funded, zero spend, bounds', () => {
    expect(emergencyFund({ monthlyEssentialMinor: 100, savedMinor: 1000 }).gapMinor).toBe(0);
    expect(emergencyFund({ monthlyEssentialMinor: 0, savedMinor: 1000 }).monthsCovered).toBeNull();
    expect(() => emergencyFund({ monthlyEssentialMinor: 1, savedMinor: 0, targetMonths: 0 })).toThrow(
      FinanceInputError,
    );
  });
});

describe('debtPayoff', () => {
  test('1000 OMR at 12% paying 100/month', () => {
    expect(debtPayoff({ balanceMinor: 1000000, annualRatePercent: 12, monthlyPaymentMinor: 100000 })).toEqual({
      paysOff: true,
      months: 11,
      totalInterestMinor: 58985,
      totalPaidMinor: 1058985,
    });
  });

  test('3000 OMR at 18% paying 150/month', () => {
    const r = debtPayoff({ balanceMinor: 3000000, annualRatePercent: 18, monthlyPaymentMinor: 150000 });
    expect([r.months, r.totalInterestMinor]).toEqual([24, 593479]);
  });

  test('never pays off; 0%; zero balance', () => {
    expect(debtPayoff({ balanceMinor: 1000000, annualRatePercent: 24, monthlyPaymentMinor: 20000 }).paysOff).toBe(
      false,
    );
    const z = debtPayoff({ balanceMinor: 600000, annualRatePercent: 0, monthlyPaymentMinor: 100000 });
    expect([z.paysOff, z.months, z.totalInterestMinor]).toEqual([true, 6, 0]);
    expect(debtPayoff({ balanceMinor: 0, annualRatePercent: 5, monthlyPaymentMinor: 0 }).months).toBe(0);
    expect(debtPayoff({ balanceMinor: 100, annualRatePercent: 0, monthlyPaymentMinor: 0 }).paysOff).toBe(false);
  });
});

test('roundMinor: half away from zero (unlike Math.round)', () => {
  expect(roundMinor(2.5)).toBe(3);
  expect(roundMinor(-2.5)).toBe(-3);
  expect(roundMinor(2.4999)).toBe(2);
  expect(() => roundMinor(Infinity)).toThrow(FinanceInputError);
});
