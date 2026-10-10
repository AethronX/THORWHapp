/**
 * Net worth and debt payoff — pure, tested (__tests__/wealth.test.ts).
 *
 * Net worth = recorded assets − remaining recorded debts. Nothing else:
 * monthly income is a flow, not an asset, and goal savings are NOT added
 * (the money already sits in an account the user may list as an asset —
 * adding both would count it twice).
 */
import { debtPayoff, DebtPayoffResult } from './financeEngine';
import type { Asset, Debt } from './models';

export interface NetWorth {
  assetsMinor: number;
  debtsMinor: number;
  netMinor: number;
  /** Part of assets the user marked as an estimate. */
  estimatedMinor: number;
}

export function netWorth(assets: readonly Asset[], debts: readonly Debt[]): NetWorth {
  const assetsMinor = assets.reduce((t, a) => t + a.valueMinor, 0);
  const debtsMinor = debts.reduce((t, d) => t + d.remainingMinor, 0);
  return {
    assetsMinor,
    debtsMinor,
    netMinor: assetsMinor - debtsMinor,
    estimatedMinor: assets.filter((a) => a.isEstimate).reduce((t, a) => t + a.valueMinor, 0),
  };
}

export interface PayoffPlan {
  /** With the recorded monthly payment. */
  base: DebtPayoffResult;
  /** With `extraMinor` more each month (null when no extra). */
  withExtra: DebtPayoffResult | null;
  extraMinor: number;
}

/**
 * Payoff of the REMAINING amount with the recorded monthly payment, plus an
 * optional "pay X more" scenario. Assumes a fixed rate, no fees and no new
 * borrowing (financeEngine.debtPayoff). Null without a monthly payment.
 */
export function payoffPlan(d: Debt, extraMinor = 0): PayoffPlan | null {
  if (d.remainingMinor <= 0 || d.monthlyPaymentMinor <= 0) return null;
  const args = { balanceMinor: d.remainingMinor, annualRatePercent: d.annualRatePercent };
  return {
    base: debtPayoff({ ...args, monthlyPaymentMinor: d.monthlyPaymentMinor }),
    withExtra: extraMinor > 0 ? debtPayoff({ ...args, monthlyPaymentMinor: d.monthlyPaymentMinor + extraMinor }) : null,
    extraMinor,
  };
}

/** A sensible "what if" step: 10 % of the payment, rounded up to a whole currency unit, at least 1 unit. */
export function suggestedExtra(monthlyPaymentMinor: number, unit: number): number {
  return Math.max(unit, Math.ceil((monthlyPaymentMinor * 0.1) / unit) * unit);
}
