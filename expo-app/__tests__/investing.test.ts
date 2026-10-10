import { allocation, costOfWaiting, investReadiness } from '../src/domain/investing';
import type { Asset, Debt } from '../src/domain/models';

const debt = (id: number, name: string, remaining: number, rate: number): Debt => ({
  id, name, originalMinor: remaining * 1000, paidMinor: 0, remainingMinor: remaining * 1000, annualRatePercent: rate, monthlyPaymentMinor: 50000, dueDay: null,
});
const asset = (id: number, kind: Asset['kind'], omr: number): Asset => ({ id, name: 'x', kind, valueMinor: omr * 1000, isEstimate: false, updatedDay: { year: 2026, month: 10, day: 1 } });

test('readiness: cushion → no interest debt → surplus; judged only with data', () => {
  const none = investReadiness({ monthlyEssentialMinor: null, liquidMinor: 0, debts: [], incomeMinor: 0, expensesMinor: 0 });
  expect(none.items.map((i) => [i.key, i.status])).toEqual([['emergency', 'needsData'], ['interestDebt', 'good'], ['surplus', 'needsData']]);
  expect(none.ready).toBe(false);

  // Essentials 400/month, liquid 1000 → gap 200 to 3 months; card at 18 % beats car at 4 %; interest-free loan ignored.
  const r = investReadiness({
    monthlyEssentialMinor: 400000, liquidMinor: 1000000, incomeMinor: 1000000, expensesMinor: 800000,
    debts: [debt(1, 'سيارة', 4000, 4), debt(2, 'بطاقة', 600, 18), debt(3, 'سلفة', 300, 0), { ...debt(4, 'مسددة', 0, 30) }],
  });
  expect(r.items[0]).toMatchObject({ key: 'emergency', status: 'opportunity', gapMinor: 200000, months: 2.5 });
  expect(r.items[1]).toMatchObject({ key: 'interestDebt', status: 'opportunity', debt: { name: 'بطاقة' } });
  expect(r.items[2]).toEqual({ key: 'surplus', status: 'good', surplusMinor: 200000 });
  expect(r.ready).toBe(false);

  const ok = investReadiness({ monthlyEssentialMinor: 400000, liquidMinor: 1200000, debts: [debt(3, 'سلفة', 300, 0)], incomeMinor: 1000000, expensesMinor: 900000 });
  expect(ok.ready).toBe(true);
  expect(investReadiness({ monthlyEssentialMinor: 400000, liquidMinor: 1200000, debts: [], incomeMinor: 1000000, expensesMinor: 1000000 }).items[2].status).toBe('opportunity');
});

test('allocation by asset kind, largest first, shares of the total', () => {
  const a = allocation([asset(1, 'bank', 2400), asset(2, 'gold', 900), asset(3, 'bank', 600), asset(4, 'investment', 0)]);
  expect(a.totalMinor).toBe(3900000);
  expect(a.slices.map((x) => [x.kind, x.valueMinor])).toEqual([['bank', 3000000], ['gold', 900000]]);
  expect(a.slices[0].share).toBeCloseTo(3000 / 3900);
  expect(allocation([])).toEqual({ totalMinor: 0, slices: [] });
});

test('cost of waiting: same monthly amount and end date, started now vs later (hand-checked)', () => {
  // 0 %: 100 × 240 = 24,000 vs 100 × 180 = 18,000.
  expect(costOfWaiting({ monthlyMinor: 100000, annualRatePercent: 0, years: 20, delayYears: 5 })).toEqual({
    nowMinor: 24000000, nowContributedMinor: 24000000, laterMinor: 18000000, laterContributedMinor: 18000000, differenceMinor: 6000000,
  });
  // 6 % a year, monthly 0.5 %: FV = 100 × ((1.005^n − 1) / 0.005).
  const fv = (n: number) => Math.round(100000 * ((Math.pow(1.005, n) - 1) / 0.005));
  const r = costOfWaiting({ monthlyMinor: 100000, annualRatePercent: 6, years: 20, delayYears: 5 });
  expect(r.nowMinor).toBe(fv(240)); // ≈ 46,204
  expect(r.laterMinor).toBe(fv(180)); // ≈ 29,082
  expect(r.differenceMinor).toBe(fv(240) - fv(180));
  expect(Math.round(r.nowMinor / 1000)).toBe(46204);
});
