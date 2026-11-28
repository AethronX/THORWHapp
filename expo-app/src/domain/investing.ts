/**
 * Investing section — readiness, what you hold, and the cost of waiting.
 *
 * Boundaries (D-041): education and planning only. No product, fund, stock or
 * provider recommendations (personalised investment advice is a licensed
 * activity — in Oman, the Financial Services Authority). No market data, no
 * expected returns: every rate is an assumption the USER types. Built only
 * from recorded data. Tests: __tests__/investing.test.ts.
 */
import { futureValue } from './financeEngine';
import { ASSET_KINDS, type Asset, type AssetKind, type Debt } from './models';

export type ReadinessStatus = 'good' | 'opportunity' | 'needsData';

export type ReadinessItem =
  | { key: 'emergency'; status: ReadinessStatus; months: number | null; gapMinor: number }
  | { key: 'interestDebt'; status: ReadinessStatus; debt: Debt | null }
  | { key: 'surplus'; status: ReadinessStatus; surplusMinor: number }
  /** Monthly spending is steady enough to plan around (D-060). */
  | { key: 'budgetStable'; status: ReadinessStatus; variation: number | null }
  /** Emergency money sits in its own goal, apart from money for other goals (D-060). */
  | { key: 'emergencySeparate'; status: ReadinessStatus };

/** Month-to-month spending may vary by up to this share (coefficient of variation) and still count as steady. */
export const STABLE_VARIATION = 0.2;

/** Months of essential spending to hold in liquid savings before investing (same as the guidance rule). */
export const READY_EMERGENCY_MONTHS = 3;

/**
 * The usual order: a safety cushion, then no interest-bearing debt, then a
 * monthly surplus to invest. Each step judged only when the data exists.
 */
export function investReadiness(args: {
  /** Average monthly essential spending, or null with < 2 months of data. */
  monthlyEssentialMinor: number | null;
  liquidMinor: number;
  debts: readonly Debt[];
  incomeMinor: number;
  /** Month-end forecast when available, else spending so far. */
  expensesMinor: number;
  /** Total spending of each complete month before this one that has any (most recent last). */
  pastMonthTotals?: readonly number[];
  /** Goals, and the names an emergency-fund goal goes by in every language the app speaks. */
  goals?: readonly { name: string; paused: boolean }[];
  emergencyNames?: readonly string[];
}): { items: ReadinessItem[]; ready: boolean } {
  const items: ReadinessItem[] = [];
  const ess = args.monthlyEssentialMinor;
  if (ess == null || ess <= 0) items.push({ key: 'emergency', status: 'needsData', months: null, gapMinor: 0 });
  else {
    const months = args.liquidMinor / ess;
    const gap = Math.max(0, ess * READY_EMERGENCY_MONTHS - args.liquidMinor);
    items.push({ key: 'emergency', status: gap === 0 ? 'good' : 'opportunity', months, gapMinor: gap });
  }

  // Highest-rate open debt: repaying it is a certain saving at that rate.
  const costly = args.debts.filter((d) => d.remainingMinor > 0 && d.annualRatePercent > 0).sort((a, b) => b.annualRatePercent - a.annualRatePercent || a.id - b.id)[0];
  items.push({ key: 'interestDebt', status: costly ? 'opportunity' : 'good', debt: costly ?? null });

  if (args.incomeMinor <= 0) items.push({ key: 'surplus', status: 'needsData', surplusMinor: 0 });
  else {
    const surplus = args.incomeMinor - args.expensesMinor;
    items.push({ key: 'surplus', status: surplus > 0 ? 'good' : 'opportunity', surplusMinor: surplus });
  }

  // Steady spending: a plan built on a month that swings by a third is not a plan.
  const past = (args.pastMonthTotals ?? []).filter((t) => t > 0).slice(-3);
  if (past.length < 2) items.push({ key: 'budgetStable', status: 'needsData', variation: null });
  else {
    const mean = past.reduce((a, b) => a + b, 0) / past.length;
    const sd = Math.sqrt(past.reduce((a, b) => a + (b - mean) ** 2, 0) / past.length);
    const variation = sd / mean;
    items.push({ key: 'budgetStable', status: variation <= STABLE_VARIATION ? 'good' : 'opportunity', variation });
  }

  // Emergency money kept apart: one pot for "if something breaks", others for plans.
  const goals = args.goals ?? [];
  const names = new Set((args.emergencyNames ?? []).map((n) => n.trim()));
  if (goals.length === 0) items.push({ key: 'emergencySeparate', status: 'needsData' });
  else items.push({ key: 'emergencySeparate', status: goals.some((g) => !g.paused && names.has(g.name.trim())) ? 'good' : 'opportunity' });

  return { items, ready: items.every((i) => i.status === 'good') };
}

export interface AllocationSlice {
  kind: AssetKind;
  valueMinor: number;
  share: number;
}

/** Recorded assets grouped by kind, largest first (shares of the total). */
export function allocation(assets: readonly Asset[]): { totalMinor: number; slices: AllocationSlice[] } {
  const by = new Map<AssetKind, number>();
  for (const a of assets) if (a.valueMinor > 0) by.set(a.kind, (by.get(a.kind) ?? 0) + a.valueMinor);
  const total = [...by.values()].reduce((t, v) => t + v, 0);
  const slices = [...by.entries()]
    .map(([kind, valueMinor]) => ({ kind, valueMinor, share: total > 0 ? valueMinor / total : 0 }))
    .sort((a, b) => b.valueMinor - a.valueMinor || ASSET_KINDS.indexOf(a.kind) - ASSET_KINDS.indexOf(b.kind));
  return { totalMinor: total, slices };
}

/**
 * Same monthly amount, same assumed return, same end date — started now vs
 * after `delayYears`. Pure arithmetic on the user's own assumption.
 */
export function costOfWaiting(args: { monthlyMinor: number; annualRatePercent: number; years: number; delayYears: number }) {
  const months = Math.round(args.years * 12);
  const later = Math.max(0, months - Math.round(args.delayYears * 12));
  const now = futureValue({ initialMinor: 0, monthlyMinor: args.monthlyMinor, months, annualRatePercent: args.annualRatePercent });
  const wait = futureValue({ initialMinor: 0, monthlyMinor: args.monthlyMinor, months: later, annualRatePercent: args.annualRatePercent });
  return {
    nowMinor: now.nominalValueMinor,
    nowContributedMinor: now.totalContributedMinor,
    laterMinor: wait.nominalValueMinor,
    laterContributedMinor: wait.totalContributedMinor,
    differenceMinor: now.nominalValueMinor - wait.nominalValueMinor,
  };
}

// -- educational calculators (D-060) ------------------------------------------
// Every input is the user's own assumption and is shown back with the result.
// None of these is a forecast: they answer "what would this arithmetic give".

/**
 * What a yearly fee costs over time: the same contributions grown at the
 * assumed return, once without the fee and once with the return reduced by it.
 */
export function feeImpact(args: { initialMinor: number; monthlyMinor: number; annualRatePercent: number; feePercent: number; years: number }) {
  const months = Math.round(args.years * 12);
  const gross = futureValue({ initialMinor: args.initialMinor, monthlyMinor: args.monthlyMinor, months, annualRatePercent: args.annualRatePercent });
  const net = futureValue({ initialMinor: args.initialMinor, monthlyMinor: args.monthlyMinor, months, annualRatePercent: Math.max(0, args.annualRatePercent - args.feePercent) });
  return {
    contributedMinor: gross.totalContributedMinor,
    withoutFeeMinor: gross.nominalValueMinor,
    withFeeMinor: net.nominalValueMinor,
    feeCostMinor: gross.nominalValueMinor - net.nominalValueMinor,
  };
}

/** What an amount will buy after `years` of the assumed inflation, in today's money. */
export function purchasingPower(args: { amountMinor: number; inflationPercent: number; years: number }) {
  const factor = Math.pow(1 + args.inflationPercent / 100, args.years);
  const todayMinor = Math.round(args.amountMinor / factor);
  return { todayMinor, erodedMinor: args.amountMinor - todayMinor };
}

/**
 * A fall, and the rise needed just to get back: a 50 % drop needs +100 %.
 * The asymmetry is the lesson; `recoveryPercent` is null for a total loss.
 */
export function lossAndRecovery(args: { amountMinor: number; dropPercent: number }) {
  const d = Math.min(100, Math.max(0, args.dropPercent)) / 100;
  const afterMinor = Math.round(args.amountMinor * (1 - d));
  return {
    afterMinor,
    lostMinor: args.amountMinor - afterMinor,
    recoveryPercent: d >= 1 ? null : (d / (1 - d)) * 100,
  };
}
