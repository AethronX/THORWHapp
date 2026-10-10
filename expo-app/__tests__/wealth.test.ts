import { debtPayoff } from '../src/domain/financeEngine';
import type { Asset, Debt } from '../src/domain/models';
import { netWorth, payoffPlan, suggestedExtra } from '../src/domain/wealth';

const day = { year: 2026, month: 10, day: 9 };
const asset = (valueMinor: number, isEstimate = false): Asset => ({ id: 1, name: 'a', kind: 'bank', valueMinor, isEstimate, updatedDay: day });
const debt = (p: Partial<Debt>): Debt => ({ id: 1, name: 'd', originalMinor: 0, paidMinor: 0, remainingMinor: 0, annualRatePercent: 0, monthlyPaymentMinor: 0, dueDay: null, ...p });

test('net worth = assets − remaining debts; estimates reported separately', () => {
  expect(netWorth([asset(2500000), asset(800000, true)], [debt({ remainingMinor: 4800000 })])).toEqual({
    assetsMinor: 3300000,
    debtsMinor: 4800000,
    netMinor: -1500000,
    estimatedMinor: 800000,
  });
  expect(netWorth([], [])).toEqual({ assetsMinor: 0, debtsMinor: 0, netMinor: 0, estimatedMinor: 0 });
});

test('payoff: interest-free 1,200 at 100/month = 12 months, no interest', () => {
  const p = payoffPlan(debt({ remainingMinor: 1200000, monthlyPaymentMinor: 100000 }))!;
  expect(p.base).toEqual({ paysOff: true, months: 12, totalInterestMinor: 0, totalPaidMinor: 1200000 });
  expect(p.withExtra).toBeNull();
});

test('payoff with interest and an extra-payment scenario uses the tested engine', () => {
  const d = debt({ remainingMinor: 4800000, annualRatePercent: 4.25, monthlyPaymentMinor: 150000 });
  const p = payoffPlan(d, 15000)!;
  expect(p.base).toEqual(debtPayoff({ balanceMinor: 4800000, annualRatePercent: 4.25, monthlyPaymentMinor: 150000 }));
  expect(p.withExtra).toEqual(debtPayoff({ balanceMinor: 4800000, annualRatePercent: 4.25, monthlyPaymentMinor: 165000 }));
  expect(p.withExtra!.months).toBeLessThan(p.base.months);
  expect(p.withExtra!.totalInterestMinor).toBeLessThan(p.base.totalInterestMinor);
});

test('no plan without a payment; a payment below the interest never pays off', () => {
  expect(payoffPlan(debt({ remainingMinor: 1000000 }))).toBeNull();
  // 1,000,000 baisa at 12 % = 10,000 interest a month; paying 5,000 never ends.
  expect(payoffPlan(debt({ remainingMinor: 1000000, annualRatePercent: 12, monthlyPaymentMinor: 5000 }))!.base.paysOff).toBe(false);
});

test('suggested extra: 10 % of the payment, whole units, at least one unit', () => {
  expect(suggestedExtra(150000, 1000)).toBe(15000);
  expect(suggestedExtra(155500, 1000)).toBe(16000);
  expect(suggestedExtra(3000, 1000)).toBe(1000);
});
