/**
 * "My investments ledger" (D-059): what the user owns, as THEY recorded it.
 *
 * Rules that make it honest:
 * - Every number comes from the user's own entries. There are no market
 *   prices: the "current price" is a value the user typed, with the day they
 *   typed it, and it is always shown as such.
 * - Cost is tracked with the weighted-average method, the one Gulf brokers
 *   and most personal-finance tools report.
 * - Money stays in integer minor units. Quantities are stored in millionths
 *   (QTY_SCALE) so fractional units — a gram of gold, part of a fund unit —
 *   are exact.
 * - Amounts in different currencies are NEVER added together: totals are
 *   grouped by currency. Converting would need a rate, a source and a date,
 *   and we have none of them.
 * - Nothing here recommends, rates or predicts anything.
 * Tests: __tests__/ledger.test.ts.
 */
import { compareDays, type Day } from '../core/dates';

/** Quantities are integers in millionths of a unit. */
export const QTY_SCALE = 1_000_000;

export type HoldingKind = 'stock' | 'fund' | 'sukuk' | 'gold' | 'deposit' | 'property' | 'other';
export const HOLDING_KINDS: readonly HoldingKind[] = ['stock', 'fund', 'sukuk', 'gold', 'deposit', 'property', 'other'];

export type LedgerTxKind = 'buy' | 'sell' | 'dividend' | 'fee';

export interface Holding {
  id: number;
  name: string;
  kind: HoldingKind;
  /** ISO 4217 code: the holding's own currency, which may differ from the app's. */
  currency: string;
  /** Price per ONE unit as the user last entered it, in minor units; null if never entered. */
  priceMinor: number | null;
  /** The day that price was entered. */
  priceDay: Day | null;
  note: string;
}

export interface LedgerTx {
  id: number;
  holdingId: number;
  kind: LedgerTxKind;
  day: Day;
  /** buy/sell: units in millionths. 0 for dividend/fee. */
  quantityMicro: number;
  /** buy/sell: price per unit in minor units. */
  priceMinor: number;
  /** dividend/fee: the cash amount in minor units. */
  amountMinor: number;
  /** Fee charged on a buy or a sell, in minor units. */
  feeMinor: number;
  /** Decision journal: why, and which risks were understood (D-059). */
  reason: string;
  risks: string;
}

export interface Position {
  holding: Holding;
  quantityMicro: number;
  /** Total cost of the units still held, fees on buys included. */
  costMinor: number;
  /** Cost per whole unit, or null when nothing is held. */
  averageCostMinor: number | null;
  /** Gains and losses already locked in by sales (after the sale's fee). */
  realizedMinor: number;
  dividendsMinor: number;
  /** Standalone fees (custody, platform) — not part of any unit's cost. */
  feesMinor: number;
  /** Units × the price the user entered; null when no price was entered. */
  valueMinor: number | null;
  /** value − cost: a change on paper, not money received. Null without a price. */
  unrealizedMinor: number | null;
}

export class LedgerError extends Error {
  constructor(readonly code: 'sellMoreThanHeld' | 'invalid') {
    super(code);
  }
}

/** Cost of `quantityMicro` units at `priceMinor` each, rounded half away from zero. */
export function lineValue(quantityMicro: number, priceMinor: number): number {
  return Math.round((quantityMicro * priceMinor) / QTY_SCALE);
}

/**
 * Replays the transactions of one holding in date order (then by id) and
 * returns where it stands. Throws if a sale would sell more than is held at
 * that point — the same check the database layer runs before saving one.
 */
export function position(holding: Holding, txs: readonly LedgerTx[]): Position {
  const ordered = txs.filter((t) => t.holdingId === holding.id).sort((a, b) => compareDays(a.day, b.day) || a.id - b.id);
  let qty = 0;
  let cost = 0;
  let realized = 0;
  let dividends = 0;
  let fees = 0;
  for (const t of ordered) {
    if (t.quantityMicro < 0 || t.priceMinor < 0 || t.amountMinor < 0 || t.feeMinor < 0) throw new LedgerError('invalid');
    switch (t.kind) {
      case 'buy':
        qty += t.quantityMicro;
        cost += lineValue(t.quantityMicro, t.priceMinor) + t.feeMinor;
        break;
      case 'sell': {
        if (t.quantityMicro > qty) throw new LedgerError('sellMoreThanHeld');
        // The share of cost leaving with the units sold; the last sale takes the remainder exactly.
        const removed = t.quantityMicro === qty ? cost : Math.round((cost * t.quantityMicro) / qty);
        realized += lineValue(t.quantityMicro, t.priceMinor) - t.feeMinor - removed;
        cost -= removed;
        qty -= t.quantityMicro;
        break;
      }
      case 'dividend':
        dividends += t.amountMinor;
        break;
      case 'fee':
        fees += t.amountMinor;
        break;
    }
  }
  const valueMinor = holding.priceMinor == null ? null : lineValue(qty, holding.priceMinor);
  return {
    holding,
    quantityMicro: qty,
    costMinor: cost,
    averageCostMinor: qty > 0 ? Math.round((cost * QTY_SCALE) / qty) : null,
    realizedMinor: realized,
    dividendsMinor: dividends,
    feesMinor: fees,
    valueMinor,
    unrealizedMinor: valueMinor == null ? null : valueMinor - cost,
  };
}

export interface CurrencyTotals {
  currency: string;
  costMinor: number;
  /** Sum of values over the holdings that HAVE a price; see `unpriced`. */
  valueMinor: number;
  /**
   * Cost of exactly those priced holdings — the only fair thing to set the
   * value against. Comparing value with TOTAL cost while some holdings have no
   * price reads as a loss that does not exist (D-059).
   */
  pricedCostMinor: number;
  realizedMinor: number;
  dividendsMinor: number;
  feesMinor: number;
  /** Holdings with units but no price entered: their value is unknown, not zero. */
  unpriced: number;
}

/** Totals per currency — never across currencies (D-059). */
export function totalsByCurrency(positions: readonly Position[]): CurrencyTotals[] {
  const map = new Map<string, CurrencyTotals>();
  for (const p of positions) {
    const c = p.holding.currency;
    const t = map.get(c) ?? { currency: c, costMinor: 0, valueMinor: 0, pricedCostMinor: 0, realizedMinor: 0, dividendsMinor: 0, feesMinor: 0, unpriced: 0 };
    t.costMinor += p.costMinor;
    t.realizedMinor += p.realizedMinor;
    t.dividendsMinor += p.dividendsMinor;
    t.feesMinor += p.feesMinor;
    if (p.valueMinor == null) {
      if (p.quantityMicro > 0) t.unpriced += 1;
    } else {
      t.valueMinor += p.valueMinor;
      t.pricedCostMinor += p.costMinor;
    }
    map.set(c, t);
  }
  return [...map.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
