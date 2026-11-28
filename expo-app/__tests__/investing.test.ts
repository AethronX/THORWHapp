import { allocation, costOfWaiting, investReadiness } from '../src/domain/investing';
import type { Asset, Debt } from '../src/domain/models';

const debt = (id: number, name: string, remaining: number, rate: number): Debt => ({
  id,
  name,
  originalMinor: remaining * 1000,
  paidMinor: 0,
  remainingMinor: remaining * 1000,
  annualRatePercent: rate,
  monthlyPaymentMinor: 50000,
  dueDay: null,
});
const asset = (id: number, kind: Asset['kind'], omr: number): Asset => ({ id, name: 'x', kind, valueMinor: omr * 1000, isEstimate: false, updatedDay: { year: 2026, month: 10, day: 1 } });

test('readiness: cushion → no interest debt → surplus → steady spending → emergency kept apart; judged only with data', () => {
  const none = investReadiness({ monthlyEssentialMinor: null, liquidMinor: 0, debts: [], incomeMinor: 0, expensesMinor: 0 });
  expect(none.items.map((i) => [i.key, i.status])).toEqual([
    ['emergency', 'needsData'],
    ['interestDebt', 'good'],
    ['surplus', 'needsData'],
    ['budgetStable', 'needsData'],
    ['emergencySeparate', 'needsData'],
  ]);
  expect(none.ready).toBe(false);

  // Essentials 400/month, liquid 1000 → gap 200 to 3 months; card at 18 % beats car at 4 %; interest-free loan ignored.
  const r = investReadiness({
    monthlyEssentialMinor: 400000,
    liquidMinor: 1000000,
    incomeMinor: 1000000,
    expensesMinor: 800000,
    debts: [debt(1, 'سيارة', 4000, 4), debt(2, 'بطاقة', 600, 18), debt(3, 'سلفة', 300, 0), { ...debt(4, 'مسددة', 0, 30) }],
  });
  expect(r.items[0]).toMatchObject({ key: 'emergency', status: 'opportunity', gapMinor: 200000, months: 2.5 });
  expect(r.items[1]).toMatchObject({ key: 'interestDebt', status: 'opportunity', debt: { name: 'بطاقة' } });
  expect(r.items[2]).toEqual({ key: 'surplus', status: 'good', surplusMinor: 200000 });
  expect(r.ready).toBe(false);

  // All five in place: cushion, no costly debt, surplus, steady months, an emergency goal of its own.
  const ok = investReadiness({
    monthlyEssentialMinor: 400000,
    liquidMinor: 1200000,
    debts: [debt(3, 'سلفة', 300, 0)],
    incomeMinor: 1000000,
    expensesMinor: 900000,
    pastMonthTotals: [880000, 910000, 900000],
    goals: [{ name: 'صندوق الطوارئ', paused: false }],
    emergencyNames: ['صندوق الطوارئ'],
  });
  expect(ok.ready).toBe(true);
  expect(investReadiness({ monthlyEssentialMinor: 400000, liquidMinor: 1200000, debts: [], incomeMinor: 1000000, expensesMinor: 1000000 }).items[2].status).toBe('opportunity');
});

test('allocation by asset kind, largest first, shares of the total', () => {
  const a = allocation([asset(1, 'bank', 2400), asset(2, 'gold', 900), asset(3, 'bank', 600), asset(4, 'investment', 0)]);
  expect(a.totalMinor).toBe(3900000);
  expect(a.slices.map((x) => [x.kind, x.valueMinor])).toEqual([
    ['bank', 3000000],
    ['gold', 900000],
  ]);
  expect(a.slices[0].share).toBeCloseTo(3000 / 3900);
  expect(allocation([])).toEqual({ totalMinor: 0, slices: [] });
});

test('cost of waiting: same monthly amount and end date, started now vs later (hand-checked)', () => {
  // 0 %: 100 × 240 = 24,000 vs 100 × 180 = 18,000.
  expect(costOfWaiting({ monthlyMinor: 100000, annualRatePercent: 0, years: 20, delayYears: 5 })).toEqual({
    nowMinor: 24000000,
    nowContributedMinor: 24000000,
    laterMinor: 18000000,
    laterContributedMinor: 18000000,
    differenceMinor: 6000000,
  });
  // 6 % a year, monthly 0.5 %: FV = 100 × ((1.005^n − 1) / 0.005).
  const fv = (n: number) => Math.round(100000 * ((Math.pow(1.005, n) - 1) / 0.005));
  const r = costOfWaiting({ monthlyMinor: 100000, annualRatePercent: 6, years: 20, delayYears: 5 });
  expect(r.nowMinor).toBe(fv(240)); // ≈ 46,204
  expect(r.laterMinor).toBe(fv(180)); // ≈ 29,082
  expect(r.differenceMinor).toBe(fv(240) - fv(180));
  expect(Math.round(r.nowMinor / 1000)).toBe(46204);
});

// -- educational calculators (D-060) ------------------------------------------
import { feeImpact, lossAndRecovery, purchasingPower } from '../src/domain/investing';

test('a yearly fee costs more than its percentage suggests, and the cost is shown in money', () => {
  // 100 OMR a month for 20 years at an assumed 6 %: a 1 % fee costs about 11 % of the end value.
  const r = feeImpact({ initialMinor: 0, monthlyMinor: 100000, annualRatePercent: 6, feePercent: 1, years: 20 });
  expect(r.contributedMinor).toBe(24000000);
  expect(r.withoutFeeMinor).toBeGreaterThan(r.withFeeMinor);
  expect(r.feeCostMinor).toBe(r.withoutFeeMinor - r.withFeeMinor);
  expect(r.feeCostMinor / r.withoutFeeMinor).toBeGreaterThan(0.1);
  // No fee, no cost.
  expect(feeImpact({ initialMinor: 1000000, monthlyMinor: 0, annualRatePercent: 5, feePercent: 0, years: 10 }).feeCostMinor).toBe(0);
  // A fee larger than the return is floored at zero growth, never negative growth.
  expect(feeImpact({ initialMinor: 1000000, monthlyMinor: 0, annualRatePercent: 1, feePercent: 3, years: 10 }).withFeeMinor).toBe(1000000);
});

test('inflation: what money buys later, in today’s terms', () => {
  // 1000 at 3 % for 10 years buys what about 744 buys today.
  const r = purchasingPower({ amountMinor: 1000000, inflationPercent: 3, years: 10 });
  expect(r.todayMinor).toBe(744094);
  expect(r.erodedMinor).toBe(255906);
  expect(purchasingPower({ amountMinor: 1000000, inflationPercent: 0, years: 10 }).todayMinor).toBe(1000000);
});

test('a loss needs a bigger rise to recover: −50 % needs +100 %', () => {
  expect(lossAndRecovery({ amountMinor: 1000000, dropPercent: 50 })).toEqual({ afterMinor: 500000, lostMinor: 500000, recoveryPercent: 100 });
  expect(lossAndRecovery({ amountMinor: 1000000, dropPercent: 20 }).recoveryPercent).toBeCloseTo(25, 10);
  expect(lossAndRecovery({ amountMinor: 1000000, dropPercent: 100 }).recoveryPercent).toBeNull();
});

test('steady spending: two or more complete months, judged by how much they vary', () => {
  const base = { monthlyEssentialMinor: null, liquidMinor: 0, debts: [], incomeMinor: 0, expensesMinor: 0 };
  const stable = (totals: number[]) => investReadiness({ ...base, pastMonthTotals: totals }).items.find((i) => i.key === 'budgetStable')!;
  expect(stable([500000]).status).toBe('needsData'); // one month is not a pattern
  expect(stable([500000, 520000, 480000]).status).toBe('good'); // ±4 %
  expect(stable([300000, 700000, 500000]).status).toBe('opportunity'); // ±33 %
  expect(stable([0, 0, 500000]).status).toBe('needsData'); // empty months do not count
});

test('emergency money kept apart: an active goal by the emergency name, in either language', () => {
  const base = { monthlyEssentialMinor: null, liquidMinor: 0, debts: [], incomeMinor: 0, expensesMinor: 0, emergencyNames: ['صندوق الطوارئ', 'Emergency fund'] };
  const sep = (goals: { name: string; paused: boolean }[]) => investReadiness({ ...base, goals }).items.find((i) => i.key === 'emergencySeparate')!.status;
  expect(sep([])).toBe('needsData');
  expect(sep([{ name: 'سيارة', paused: false }])).toBe('opportunity');
  expect(sep([{ name: 'صندوق الطوارئ', paused: false }])).toBe('good');
  expect(sep([{ name: 'Emergency fund', paused: false }])).toBe('good');
  // A paused emergency goal is not doing its job.
  expect(sep([{ name: 'صندوق الطوارئ', paused: true }])).toBe('opportunity');
});
