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
  | { key: 'surplus'; status: ReadinessStatus; surplusMinor: number };

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
  const costly = args.debts
    .filter((d) => d.remainingMinor > 0 && d.annualRatePercent > 0)
    .sort((a, b) => b.annualRatePercent - a.annualRatePercent || a.id - b.id)[0];
  items.push({ key: 'interestDebt', status: costly ? 'opportunity' : 'good', debt: costly ?? null });

  if (args.incomeMinor <= 0) items.push({ key: 'surplus', status: 'needsData', surplusMinor: 0 });
  else {
    const surplus = args.incomeMinor - args.expensesMinor;
    items.push({ key: 'surplus', status: surplus > 0 ? 'good' : 'opportunity', surplusMinor: surplus });
  }
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
