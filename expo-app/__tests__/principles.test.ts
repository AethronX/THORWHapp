import { evaluatePrinciples, principleScore, PrincipleResult } from '../src/domain/principles';
import type { Asset, Category, CategoryKey, CategorySpend, Debt, Expense } from '../src/domain/models';

const KEYS: [CategoryKey, boolean][] = [
  ['housing', true], ['food', true], ['transport', true], ['utilities', true], ['telecom', true], ['health', true],
  ['education', false], ['family', false], ['shopping', false], ['entertainment', false], ['debt', true], ['other', false],
];
const cats: Category[] = KEYS.map(([key, ess], i) => ({ id: i + 1, key, name: '', iconCode: i, isEssential: ess, archived: false }));
const id = (k: CategoryKey) => KEYS.findIndex(([x]) => x === k) + 1;
let n = 1;
const ex = (k: CategoryKey, omr: number, m: number, d = 1): Expense => ({ id: n++, amountMinor: omr * 1000, categoryId: id(k), date: { year: 2026, month: m, day: d }, note: '' });
const spend = (k: CategoryKey, omr: number, limit: number | null = null): CategorySpend => ({ category: cats[id(k) - 1], spentMinor: omr * 1000, limitMinor: limit == null ? null : limit * 1000 });
const debt = (did: number, name: string, remaining: number, rate: number, monthly: number): Debt => ({
  id: did, name, originalMinor: remaining * 2000, paidMinor: remaining * 1000, remainingMinor: remaining * 1000, annualRatePercent: rate, monthlyPaymentMinor: monthly * 1000, dueDay: null,
});
const asset = (aid: number, kind: Asset['kind'], omr: number): Asset => ({ id: aid, name: 'x', kind, valueMinor: omr * 1000, isEstimate: false, updatedDay: { year: 2026, month: 10, day: 1 } });
const base = { today: { year: 2026, month: 10, day: 12 }, incomeMinor: 0, expensesMinor: 0, history: [], categories: cats, spends: [], goals: [], debts: [], assets: [] };
const get = <K extends PrincipleResult['key']>(rs: PrincipleResult[], k: K) => rs.find((r) => r.key === k) as Extract<PrincipleResult, { key: K }>;

test('empty data: every principle says it needs data — no verdict without numbers', () => {
  const rs = evaluatePrinciples(base);
  expect(rs.map((r) => r.key)).toEqual(['payYourselfFirst', 'roomForError', 'measureWealth', 'assetsVsLiabilities', 'debtFocus', 'consciousSpending']);
  expect(rs.every((r) => r.status === 'needsData')).toBe(true);
  expect(principleScore(rs)).toEqual({ good: 0, judged: 0, total: 6 });
  expect(get(rs, 'payYourselfFirst').action).toEqual({ type: 'addIncome' });
});

test('pay yourself first: one tenth of income (Clason), on the month-end forecast', () => {
  expect(get(evaluatePrinciples({ ...base, incomeMinor: 1000000, expensesMinor: 900000 }), 'payYourselfFirst')).toMatchObject({ status: 'good', rate: 0.1 });
  expect(get(evaluatePrinciples({ ...base, incomeMinor: 1000000, expensesMinor: 950000 }), 'payYourselfFirst')).toMatchObject({ status: 'opportunity', rate: 0.05, action: { type: 'reviewBudgets' } });
});

test('room for error: liquid savings counted once (larger of goals vs cash/bank; gold/property excluded) ÷ average essential month', () => {
  const history = [ex('housing', 300, 8), ex('food', 100, 8), ex('housing', 300, 9), ex('food', 100, 9), ex('shopping', 999, 9)];
  // essentials = 400/month; goals 500 vs bank 1200 → 1200 (the goal money is likely in that bank) → exactly 3 months.
  const goals = [{ id: 1, name: 'g', targetMinor: 1, savedMinor: 500000, targetDate: { year: 2027, month: 1, day: 1 }, paused: false }];
  const r = get(evaluatePrinciples({ ...base, history, goals, assets: [asset(1, 'bank', 1200), asset(2, 'gold', 5000), asset(3, 'property', 90000)] }), 'roomForError');
  expect(r).toMatchObject({ status: 'good', months: 3, liquidMinor: 1200000, monthlyEssentialMinor: 400000 });
  // Same money as goal (1000) AND bank (1000) is NOT 2000.
  const twice = get(evaluatePrinciples({ ...base, history, goals: [{ ...goals[0], savedMinor: 1000000 }], assets: [asset(1, 'bank', 1000)] }), 'roomForError');
  expect(twice).toMatchObject({ status: 'opportunity', months: 2.5, liquidMinor: 1000000 });
  expect(get(evaluatePrinciples({ ...base, history, assets: [asset(1, 'cash', 400)] }), 'roomForError')).toMatchObject({ status: 'opportunity', months: 1 });
  // One month of data is not enough.
  expect(get(evaluatePrinciples({ ...base, history: [ex('housing', 300, 9)] }), 'roomForError').status).toBe('needsData');
});

test('wealth, obligations and debt focus: snowball = smallest balance, avalanche = highest rate', () => {
  const debts = [debt(1, 'بطاقة', 800, 18, 50), debt(2, 'سيارة', 6000, 5, 150), debt(3, 'قرض شخصي', 300, 7, 40), debt(4, 'مسدد', 0, 9, 99)];
  const rs = evaluatePrinciples({ ...base, incomeMinor: 1000000, debts, assets: [asset(1, 'bank', 2000)] });
  expect(get(rs, 'measureWealth')).toMatchObject({ status: 'good', netMinor: 2000000 - 7100000 });
  // Paid-off debts don't count; payments 50 + 150 + 40 = 240 = 24 % of income.
  expect(get(rs, 'assetsVsLiabilities')).toMatchObject({ status: 'opportunity', paymentsMinor: 240000, share: 0.24 });
  const f = get(rs, 'debtFocus');
  expect(f).toMatchObject({ status: 'opportunity', openDebts: 3 });
  expect(f.snowball?.name).toBe('قرض شخصي');
  expect(f.avalanche?.name).toBe('بطاقة');
  // All paid → good.
  const done = evaluatePrinciples({ ...base, debts: [debts[3]] });
  expect(get(done, 'debtFocus').status).toBe('good');
  expect(get(done, 'assetsVsLiabilities').status).toBe('good');
});

test('conscious spending (Sethi): biggest optional, non-fixed category without a limit', () => {
  const spends = [spend('housing', 300), spend('entertainment', 80), spend('shopping', 120, 150), spend('family', 50), spend('education', 0)];
  const r = get(evaluatePrinciples({ ...base, spends }), 'consciousSpending');
  // Shopping is bigger but already has a limit → entertainment (80 of 550).
  expect(r).toMatchObject({ status: 'opportunity', categoryId: id('entertainment'), spentMinor: 80000, action: { type: 'setBudget', categoryId: id('entertainment') } });
  expect(r.share).toBeCloseTo(80 / 550);
  const all = get(evaluatePrinciples({ ...base, spends: [spend('housing', 300), spend('shopping', 120, 150)] }), 'consciousSpending');
  expect(all.status).toBe('good');
  expect(get(evaluatePrinciples({ ...base, spends: [spend('housing', 300)] }), 'consciousSpending').status).toBe('needsData');
  // Under 5 % of spending is not worth a decision (9 of 609).
  expect(get(evaluatePrinciples({ ...base, spends: [spend('housing', 600), spend('entertainment', 9)] }), 'consciousSpending').status).toBe('good');
});
