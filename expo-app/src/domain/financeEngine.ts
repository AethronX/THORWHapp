/**
 * Tharwati deterministic financial calculation engine.
 *
 * Pure TypeScript: no React, no I/O, no clock. See docs/FINANCE_FORMULAS.md
 * (repository root) for derivations and the independent reference values.
 *
 * Conventions
 * - Money in/out is integer minor units (baisa for OMR). Compound maths uses
 *   floating point internally; the result is rounded once, half away from
 *   zero ({@link roundMinor}). Amounts the user must pay in to reach a goal
 *   are rounded UP so following the advice actually reaches the goal.
 * - Rates are annual percentages, nominal, compounded monthly (r = p/1200).
 * - Deposits happen at the END of each month (ordinary annuity).
 * - Results are before fees, taxes and inflation unless named "real".
 *   Hypothetical returns are illustrations, never forecasts or guarantees.
 */

export class FinanceInputError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(`${field}: ${message}`);
    this.name = 'FinanceInputError';
  }
}

/** 100 years. */
export const MAX_MONTHS = 1200;
export const MIN_RATE = 0;
export const MAX_RATE = 100;
export const MIN_INFLATION = -50;
export const MAX_INFLATION = 100;
/** 2^53: beyond it integers are no longer exact in a JS number. */
export const MAX_EXACT_MINOR = 9_007_199_254_740_992;

/** Round half away from zero; reject values that can't be exact. */
export function roundMinor(v: number): number {
  if (!Number.isFinite(v) || Math.abs(v) > MAX_EXACT_MINOR) {
    throw new FinanceInputError('value', 'result out of representable range');
  }
  const r = Math.round(Math.abs(v));
  return v < 0 ? -r : r;
}

function ceilMinor(v: number): number {
  if (!Number.isFinite(v) || Math.abs(v) > MAX_EXACT_MINOR) {
    throw new FinanceInputError('value', 'result out of representable range');
  }
  // Ignore representation noise such as 100.00000000001 -> 101.
  const r = Math.round(v);
  if (Math.abs(v - r) < 1e-6) return r;
  return Math.ceil(v);
}

function requireNonNegative(field: string, v: number) {
  if (!Number.isInteger(v) || v < 0) {
    throw new FinanceInputError(field, 'must be a non-negative integer');
  }
}

function requireMonths(months: number) {
  if (!Number.isInteger(months) || months < 0 || months > MAX_MONTHS) {
    throw new FinanceInputError('months', `must be in 0..${MAX_MONTHS}`);
  }
}

function requireRate(p: number) {
  if (Number.isNaN(p) || p < MIN_RATE || p > MAX_RATE) {
    throw new FinanceInputError('annualRatePercent', `must be in ${MIN_RATE}..${MAX_RATE}`);
  }
}

function requireInflation(p: number) {
  if (Number.isNaN(p) || p < MIN_INFLATION || p > MAX_INFLATION) {
    throw new FinanceInputError(
      'inflationPercent',
      `must be in ${MIN_INFLATION}..${MAX_INFLATION}`,
    );
  }
}

const monthlyRate = (annualPercent: number) => annualPercent / 100 / 12;

// --- cash flow --------------------------------------------------------------

export function sumMinor(amounts: Iterable<number>): number {
  let s = 0;
  for (const a of amounts) s += a;
  return s;
}

/** income − expenses (may be negative). */
export function netCashFlow(incomeMinor: number, expensesMinor: number): number {
  requireNonNegative('incomeMinor', incomeMinor);
  requireNonNegative('expensesMinor', expensesMinor);
  return incomeMinor - expensesMinor;
}

/** (income − expenses) / income; null when income is 0. */
export function savingsRate(incomeMinor: number, expensesMinor: number): number | null {
  requireNonNegative('incomeMinor', incomeMinor);
  requireNonNegative('expensesMinor', expensesMinor);
  if (incomeMinor === 0) return null;
  return (incomeMinor - expensesMinor) / incomeMinor;
}

/** start + net × months. Cash only, no growth. */
export function projectedCashBalance(
  startMinor: number,
  monthlyNetMinor: number,
  months: number,
): number {
  requireMonths(months);
  return startMinor + monthlyNetMinor * months;
}

// --- compound growth --------------------------------------------------------

export interface FutureValueResult {
  months: number;
  annualRatePercent: number;
  /** Cash the user actually puts in. */
  totalContributedMinor: number;
  /** Hypothetical nominal value including assumed growth. */
  nominalValueMinor: number;
  /** value − contributions; never presented as earned. */
  hypotheticalGrowthMinor: number;
}

/**
 * FV = P(1+r)^n + PMT((1+r)^n − 1)/r   (r > 0)
 * FV = P + PMT·n                       (r = 0)
 */
export function futureValue(args: {
  initialMinor: number;
  monthlyMinor: number;
  months: number;
  annualRatePercent: number;
}): FutureValueResult {
  const { initialMinor, monthlyMinor, months, annualRatePercent } = args;
  requireNonNegative('initialMinor', initialMinor);
  requireNonNegative('monthlyMinor', monthlyMinor);
  requireMonths(months);
  requireRate(annualRatePercent);
  const contributed = initialMinor + monthlyMinor * months;
  if (contributed > MAX_EXACT_MINOR) {
    throw new FinanceInputError('value', 'result out of representable range');
  }
  const r = monthlyRate(annualRatePercent);
  let value: number;
  if (r === 0) {
    value = contributed;
  } else {
    const g = Math.pow(1 + r, months);
    value = roundMinor(initialMinor * g + (monthlyMinor * (g - 1)) / r);
  }
  return {
    months,
    annualRatePercent,
    totalContributedMinor: contributed,
    nominalValueMinor: value,
    hypotheticalGrowthMinor: value - contributed,
  };
}

export function compareScenarios(args: {
  initialMinor: number;
  monthlyMinor: number;
  months: number;
  annualRatesPercent: number[];
}): FutureValueResult[] {
  return args.annualRatesPercent.map((rate) =>
    futureValue({ ...args, annualRatePercent: rate }),
  );
}

/** Today's purchasing power: nominal / (1 + i)^(months/12). */
export function realValue(args: {
  nominalMinor: number;
  months: number;
  annualInflationPercent: number;
}): number {
  requireMonths(args.months);
  requireInflation(args.annualInflationPercent);
  const factor = Math.pow(1 + args.annualInflationPercent / 100, args.months / 12);
  return roundMinor(args.nominalMinor / factor);
}

// --- goals ------------------------------------------------------------------

/**
 * Monthly deposit to reach `targetMinor` in `months` from `savedMinor`,
 * rounded UP.
 *   remaining = T − S(1+r)^n
 *   r = 0: remaining / n;  r > 0: remaining · r / ((1+r)^n − 1)
 * 0 if already reached; whole remainder if months = 0.
 */
export function requiredMonthlySaving(args: {
  targetMinor: number;
  savedMinor: number;
  months: number;
  annualRatePercent?: number;
}): number {
  const { targetMinor, savedMinor, months } = args;
  const rate = args.annualRatePercent ?? 0;
  requireNonNegative('targetMinor', targetMinor);
  requireNonNegative('savedMinor', savedMinor);
  requireMonths(months);
  requireRate(rate);
  if (savedMinor >= targetMinor) return 0;
  if (months === 0) return targetMinor - savedMinor;
  const r = monthlyRate(rate);
  if (r === 0) return ceilMinor((targetMinor - savedMinor) / months);
  const g = Math.pow(1 + r, months);
  const remaining = targetMinor - savedMinor * g;
  if (remaining <= 0) return 0;
  return ceilMinor((remaining * r) / (g - 1));
}

/** saved / target clamped to 0..1. */
export function goalProgress(savedMinor: number, targetMinor: number): number {
  if (targetMinor <= 0) return 1;
  return Math.min(1, Math.max(0, savedMinor / targetMinor));
}

// --- emergency fund ---------------------------------------------------------

export interface EmergencyFundResult {
  targetMinor: number;
  gapMinor: number;
  /** null when essential spending is 0. */
  monthsCovered: number | null;
}

export function emergencyFund(args: {
  monthlyEssentialMinor: number;
  savedMinor: number;
  targetMonths?: number;
}): EmergencyFundResult {
  const targetMonths = args.targetMonths ?? 6;
  requireNonNegative('monthlyEssentialMinor', args.monthlyEssentialMinor);
  requireNonNegative('savedMinor', args.savedMinor);
  if (!Number.isInteger(targetMonths) || targetMonths < 1 || targetMonths > 24) {
    throw new FinanceInputError('targetMonths', 'must be in 1..24');
  }
  const target = args.monthlyEssentialMinor * targetMonths;
  return {
    targetMinor: target,
    gapMinor: Math.max(0, target - args.savedMinor),
    monthsCovered:
      args.monthlyEssentialMinor === 0
        ? null
        : args.savedMinor / args.monthlyEssentialMinor,
  };
}

// --- debt payoff ------------------------------------------------------------

export interface DebtPayoffResult {
  paysOff: boolean;
  months: number;
  totalInterestMinor: number;
  totalPaidMinor: number;
}

/**
 * Fixed monthly payment against a balance with monthly interest (APR/12),
 * rounded to the minor unit each month. Assumes fixed rate, no fees, no new
 * borrowing, payment at month end after interest.
 */
export function debtPayoff(args: {
  balanceMinor: number;
  annualRatePercent: number;
  monthlyPaymentMinor: number;
}): DebtPayoffResult {
  const { balanceMinor, annualRatePercent, monthlyPaymentMinor } = args;
  requireNonNegative('balanceMinor', balanceMinor);
  requireNonNegative('monthlyPaymentMinor', monthlyPaymentMinor);
  requireRate(annualRatePercent);
  if (balanceMinor === 0) {
    return { paysOff: true, months: 0, totalInterestMinor: 0, totalPaidMinor: 0 };
  }
  const r = monthlyRate(annualRatePercent);
  let balance = balanceMinor;
  let interestTotal = 0;
  let paid = 0;
  for (let m = 1; m <= MAX_MONTHS; m++) {
    const interest = roundMinor(balance * r);
    if (monthlyPaymentMinor <= interest) {
      return { paysOff: false, months: m, totalInterestMinor: interestTotal, totalPaidMinor: paid };
    }
    interestTotal += interest;
    balance += interest;
    const payment = Math.min(monthlyPaymentMinor, balance);
    balance -= payment;
    paid += payment;
    if (balance === 0) {
      return { paysOff: true, months: m, totalInterestMinor: interestTotal, totalPaidMinor: paid };
    }
  }
  return { paysOff: false, months: MAX_MONTHS, totalInterestMinor: interestTotal, totalPaidMinor: paid };
}
