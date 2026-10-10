import { currencyFromCode } from '../src/core/currency';
import { buildGuidance, withoutDismissed } from '../src/domain/guidance';
import type { Category, CategoryKey, CategorySpend, Expense, SavingsGoal } from '../src/domain/models';

const OMR = currencyFromCode('OMR');
const KEYS: [CategoryKey, boolean][] = [
  ['housing', true], ['food', true], ['transport', true], ['utilities', true], ['telecom', true], ['health', true],
  ['education', false], ['family', false], ['shopping', false], ['entertainment', false], ['debt', true], ['other', false],
];
const cats: Category[] = KEYS.map(([key, ess], i) => ({ id: i + 1, key, name: '', iconCode: i, isEssential: ess, archived: false }));
const id = (k: CategoryKey) => KEYS.findIndex(([x]) => x === k) + 1;
let n = 1;
const ex = (k: CategoryKey, omr: number, m: number, d: number, y = 2026): Expense => ({ id: n++, amountMinor: Math.round(omr * 1000), categoryId: id(k), date: { year: y, month: m, day: d }, note: '' });
const spend = (k: CategoryKey, omr: number, limit: number | null = null): CategorySpend => ({ category: cats[id(k) - 1], spentMinor: omr * 1000, limitMinor: limit == null ? null : limit * 1000 });
const goal = (gid: number, name: string, target: number, saved: number, y = 2027, m = 10): SavingsGoal => ({ id: gid, name, targetMinor: target * 1000, savedMinor: saved * 1000, targetDate: { year: y, month: m, day: 1 }, paused: false });
const today = { year: 2026, month: 10, day: 12 };
const base = { today, incomeMinor: 1000000, expensesMinor: 0, spends: [], history: [], categories: cats, goals: [], currency: OMR, emergencyGoalName: 'صندوق الطوارئ' };
const kinds = (g: { kind: string }[]) => g.map((x) => x.kind);

test('no income → add income first', () => {
  const g = buildGuidance({ ...base, incomeMinor: 0, expensesMinor: 5000 });
  expect(g[0]).toMatchObject({ kind: 'addIncome', action: { type: 'addIncome' } });
});

test('spending above income, then budget overruns largest-first', () => {
  const g = buildGuidance({ ...base, incomeMinor: 500000, expensesMinor: 620000, spends: [spend('food', 130, 100), spend('shopping', 90, 50)] });
  expect(kinds(g).slice(0, 3)).toEqual(['overspending', 'overBudget', 'overBudget']);
  expect(g[0]).toMatchObject({ amountMinor: 120000 });
  expect(g[1]).toMatchObject({ categoryId: id('shopping') }); // +80 % beats +30 %
  expect(g[2]).toMatchObject({ categoryId: id('food'), spentMinor: 130000, limitMinor: 100000 });
});

test('category rising vs the SAME days of last month; limit suggestion never below spending so far', () => {
  // Restaurants (entertainment): Sep 1–12 = 20; Sep full = 47.4; Oct 1–12 = 60 → +200 %.
  const history = [ex('entertainment', 20, 9, 5), ex('entertainment', 27.4, 9, 25), ex('entertainment', 35, 10, 3), ex('entertainment', 25, 10, 11)];
  const g = buildGuidance({ ...base, history, spends: [spend('entertainment', 60)] });
  const r = g.find((x) => x.kind === 'categoryRising');
  expect(r).toMatchObject({ categoryId: id('entertainment'), currentMinor: 60000, previousMinor: 20000, throughDay: 12, pct: 2 });
  // max(Sep total 47.4, Oct so far 60) = 60 — a lower limit would be broken on day one.
  expect(r?.action).toEqual({ type: 'setBudget', categoryId: id('entertainment'), suggestedLimitMinor: 60000 });
  // When last month was higher, it wins (rounded up to a whole rial): Sep total 97.4 → 98.
  const h2 = [ex('entertainment', 20, 9, 5), ex('entertainment', 77.4, 9, 25), ex('entertainment', 60, 10, 3)];
  expect(buildGuidance({ ...base, history: h2 }).find((x) => x.kind === 'categoryRising')?.action).toMatchObject({ suggestedLimitMinor: 98000 });
});

test('rising rule stays quiet when it should', () => {
  const h = (k: CategoryKey) => [ex(k, 20, 9, 5), ex(k, 60, 10, 3)];
  // budget already set → the budget rules handle it
  expect(kinds(buildGuidance({ ...base, history: h('food'), spends: [spend('food', 60, 200)] }))).not.toContain('categoryRising');
  // fixed bills (rent) are excluded
  expect(kinds(buildGuidance({ ...base, history: h('housing') }))).not.toContain('categoryRising');
  // too early in the month
  expect(kinds(buildGuidance({ ...base, today: { year: 2026, month: 10, day: 4 }, history: h('food') }))).not.toContain('categoryRising');
  // small difference: +10 on 1000 income is < 3 %
  expect(kinds(buildGuidance({ ...base, history: [ex('food', 20, 9, 5), ex('food', 30, 10, 3)] }))).not.toContain('categoryRising');
  // nothing last month to compare with
  expect(kinds(buildGuidance({ ...base, history: [ex('food', 60, 10, 3)] }))).not.toContain('categoryRising');
});

test('emergency fund from recorded essential spending (needs 2+ months of data)', () => {
  // Essentials: Jul 400, Aug 380+40, Sep 410 → avg 410; shopping is not essential.
  const history = [ex('housing', 400, 7, 1), ex('housing', 380, 8, 1), ex('food', 40, 8, 9), ex('housing', 410, 9, 1), ex('shopping', 300, 9, 2)];
  const g = buildGuidance({ ...base, history, goals: [goal(1, 'سيارة', 4000, 500)] });
  const e = g.find((x) => x.kind === 'emergencyFund');
  expect(e).toMatchObject({ monthlyEssentialMinor: 410000, monthsOfData: 3, target3Minor: 1230000, target6Minor: 2460000, savedMinor: 500000 });
  expect(e?.action).toEqual({ type: 'createGoal', name: 'emergency', targetMinor: 1230000 });
  // Only one month of data → no claim.
  expect(kinds(buildGuidance({ ...base, history: [ex('housing', 400, 9, 1)] }))).not.toContain('emergencyFund');
  // An existing emergency goal covering 3 months → nothing; partly covered → open it instead of creating another.
  expect(kinds(buildGuidance({ ...base, history, goals: [goal(2, 'صندوق الطوارئ', 2460, 1300)] }))).not.toContain('emergencyFund');
  expect(buildGuidance({ ...base, history, goals: [goal(2, 'صندوق الطوارئ', 2460, 600)] }).find((x) => x.kind === 'emergencyFund')?.action).toEqual({ type: 'openGoals' });
});

test('goal at risk and late-month surplus', () => {
  // 1200 left over 12 months = 100/month needed; net this month 50.
  const g = buildGuidance({ ...base, incomeMinor: 500000, expensesMinor: 450000, goals: [goal(3, 'سفر', 1200, 0, 2027, 10)] });
  expect(g.find((x) => x.kind === 'goalAtRisk')).toMatchObject({ requiredMinor: 100000, netMinor: 50000 });
  const late = buildGuidance({ ...base, today: { year: 2026, month: 10, day: 22 }, incomeMinor: 500000, expensesMinor: 300000, goals: [goal(4, 'سفر', 1200, 0, 2027, 10)] });
  expect(late.find((x) => x.kind === 'saveSurplus')).toMatchObject({ netMinor: 200000 });
  expect(kinds(late)).not.toContain('goalAtRisk'); // 200 ≥ 100 needed
});

test('paused goals are never "at risk" and get no surplus suggestion', () => {
  const paused = { ...goal(3, 'سفر', 1200, 0, 2027, 10), paused: true };
  const g = buildGuidance({ ...base, today: { year: 2026, month: 10, day: 22 }, incomeMinor: 500000, expensesMinor: 450000, goals: [paused] });
  expect(kinds(g)).not.toContain('goalAtRisk');
  expect(kinds(g)).not.toContain('saveSurplus');
});

test('dismissed items stay hidden for that month only', () => {
  const g = buildGuidance({ ...base, incomeMinor: 0 });
  expect(withoutDismissed(g, { addIncome: '2026-10' }, { year: 2026, month: 10 })).toHaveLength(0);
  expect(withoutDismissed(g, { addIncome: '2026-09' }, { year: 2026, month: 10 })).toHaveLength(1);
});

// -- behavioural rules (docs/BEHAVIORAL_STUDY.md) ---------------------------------

import { daysBetween, nextSeason, SEASONS, seasonFundDate } from '../src/domain/seasons';

test('seasons: next season inside the window only, fund date one week before, table sorted and still covers 2029', () => {
  expect(nextSeason({ year: 2026, month: 10, day: 12 })).toMatchObject({ key: 'ramadan', date: { year: 2027, month: 2, day: 8 }, daysAway: 119 });
  expect(nextSeason({ year: 2026, month: 6, day: 1 })).toBeNull(); // Ramadan 2027 is > 150 days away
  // 5 days before Ramadan is too late to start a fund; the next one (Eid al-Adha) is 102 days away.
  expect(nextSeason({ year: 2027, month: 2, day: 3 })).toMatchObject({ key: 'eidAdha', daysAway: 102 });
  expect(seasonFundDate({ key: 'ramadan', date: { year: 2027, month: 2, day: 8 } })).toEqual({ year: 2027, month: 2, day: 1 });
  expect(seasonFundDate({ key: 'ramadan', date: { year: 2028, month: 1, day: 3 } })).toEqual({ year: 2027, month: 12, day: 27 });
  for (let i = 1; i < SEASONS.length; i++) expect(daysBetween(SEASONS[i - 1].date, SEASONS[i].date)).toBeGreaterThan(0);
  expect(SEASONS[SEASONS.length - 1].date.year).toBeGreaterThanOrEqual(2029);
});

test('season fund: suggested with an approximate date and monthly steps, skipped when a goal with its name exists', () => {
  const season = { ...nextSeason(today)!, goalName: 'رمضان والعيد 2027' };
  const g = buildGuidance({ ...base, season });
  expect(g.find((x) => x.kind === 'season')).toEqual({
    id: 'season:ramadan-2027',
    kind: 'season',
    priority: 40,
    season: 'ramadan',
    date: { year: 2027, month: 2, day: 8 },
    daysAway: 119,
    months: 4, // month-end steps Oct, Nov, Dec, Jan — all before 2027-02-01
    action: { type: 'createSeasonGoal', season: 'ramadan', year: 2027, targetDate: { year: 2027, month: 2, day: 1 } },
  });
  // Closer than 60 days → higher priority.
  expect(buildGuidance({ ...base, season: { ...season, daysAway: 45 } }).find((x) => x.kind === 'season')?.priority).toBe(55);
  expect(kinds(buildGuidance({ ...base, season, goals: [goal(9, ' رمضان والعيد 2027 ', 300, 0)] }))).not.toContain('season');
  expect(kinds(buildGuidance({ ...base, season: null }))).not.toContain('season');
});

test('pay yourself first: within 3 days after payday, with a plan amount and an open goal, until something is saved', () => {
  const travel = goal(1, 'سفر', 1200, 100);
  const args = { ...base, today: { year: 2026, month: 10, day: 26 }, payday: 25, plannedSavingMinor: 150000, goals: [travel] };
  expect(buildGuidance(args).find((x) => x.kind === 'payYourselfFirst')).toEqual({
    id: 'payYourselfFirst:1',
    kind: 'payYourselfFirst',
    priority: 75,
    amountMinor: 150000,
    goal: travel,
    daysSincePayday: 1,
    action: { type: 'openGoals' },
  });
  const has = (a: Parameters<typeof buildGuidance>[0]) => kinds(buildGuidance(a)).includes('payYourselfFirst');
  expect(has({ ...args, today: { year: 2026, month: 10, day: 24 } })).toBe(false); // before payday
  expect(has({ ...args, today: { year: 2026, month: 10, day: 29 } })).toBe(false); // 4 days after
  expect(has({ ...args, payday: null })).toBe(false);
  expect(has({ ...args, plannedSavingMinor: 0 })).toBe(false);
  expect(has({ ...args, goals: [{ ...travel, paused: true }] })).toBe(false);
  // Already saved since payday → done; a contribution BEFORE payday doesn't count.
  expect(has({ ...args, goals: [{ ...travel, lastContributionDay: { year: 2026, month: 10, day: 25 } }] })).toBe(false);
  expect(has({ ...args, goals: [{ ...travel, lastContributionDay: { year: 2026, month: 10, day: 20 } }] })).toBe(true);
  // Payday 31 in a 30-day month → the 30th.
  expect(has({ ...args, payday: 31, today: { year: 2026, month: 11, day: 30 } })).toBe(true);
});
