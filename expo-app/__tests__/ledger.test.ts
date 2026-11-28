import { Holding, LedgerError, LedgerTx, position, QTY_SCALE, totalsByCurrency } from '../src/domain/ledger';

const d = (day: number, month = 1, year = 2026) => ({ year, month, day });
const h = (id: number, over: Partial<Holding> = {}): Holding => ({ id, name: 'X', kind: 'stock', currency: 'OMR', priceMinor: null, priceDay: null, note: '', ...over });
let n = 1;
const tx = (holdingId: number, kind: LedgerTx['kind'], day: number, units = 0, priceMinor = 0, extra: Partial<LedgerTx> = {}): LedgerTx => ({
  id: n++,
  holdingId,
  kind,
  day: d(day),
  quantityMicro: Math.round(units * QTY_SCALE),
  priceMinor,
  amountMinor: 0,
  feeMinor: 0,
  reason: '',
  risks: '',
  ...extra,
});

test('weighted average cost across two buys, fees included in cost', () => {
  // 100 units at 1.000, fee 0.500; then 100 at 1.200, fee 0.500 → cost 221.000, average 1.105
  const p = position(h(1), [tx(1, 'buy', 1, 100, 1000, { feeMinor: 500 }), tx(1, 'buy', 2, 100, 1200, { feeMinor: 500 })]);
  expect(p.quantityMicro).toBe(200 * QTY_SCALE);
  expect(p.costMinor).toBe(221000);
  expect(p.averageCostMinor).toBe(1105);
});

test('a partial sale realises against the average and keeps the rest at the same average', () => {
  const p = position(h(1), [
    tx(1, 'buy', 1, 100, 1000),
    tx(1, 'buy', 2, 100, 1200),
    // Sell 50 at 1.500 with a 0.250 fee: proceeds 75.000 − fee 0.250 − cost of 50 (55.000) = 19.750
    tx(1, 'sell', 3, 50, 1500, { feeMinor: 250 }),
  ]);
  expect(p.realizedMinor).toBe(19750);
  expect(p.quantityMicro).toBe(150 * QTY_SCALE);
  expect(p.costMinor).toBe(165000);
  expect(p.averageCostMinor).toBe(1100); // unchanged by the sale
});

test('selling everything leaves no cost behind, even with rounding along the way', () => {
  const p = position(h(1), [tx(1, 'buy', 1, 3, 1000), tx(1, 'sell', 2, 1, 1000), tx(1, 'sell', 3, 2, 1000)]);
  expect(p.quantityMicro).toBe(0);
  expect(p.costMinor).toBe(0);
  expect(p.averageCostMinor).toBeNull();
  expect(p.realizedMinor).toBe(0);
});

test('cannot sell more than is held at that date', () => {
  expect(() => position(h(1), [tx(1, 'buy', 5, 10, 1000), tx(1, 'sell', 4, 5, 1000)])).toThrow(LedgerError);
});

test('fractional units are exact: half a gram of gold', () => {
  const p = position(h(1, { kind: 'gold', priceMinor: 30000 }), [tx(1, 'buy', 1, 0.5, 28000)]);
  expect(p.costMinor).toBe(14000);
  expect(p.valueMinor).toBe(15000);
  expect(p.unrealizedMinor).toBe(1000);
});

test('dividends and standalone fees are tracked apart from cost', () => {
  const p = position(h(1), [tx(1, 'buy', 1, 10, 1000), tx(1, 'dividend', 2, 0, 0, { amountMinor: 300 }), tx(1, 'fee', 3, 0, 0, { amountMinor: 100 })]);
  expect(p.costMinor).toBe(10000);
  expect(p.dividendsMinor).toBe(300);
  expect(p.feesMinor).toBe(100);
});

test('no price entered: value and the paper change are unknown, not zero', () => {
  const p = position(h(1), [tx(1, 'buy', 1, 10, 1000)]);
  expect(p.valueMinor).toBeNull();
  expect(p.unrealizedMinor).toBeNull();
});

test('totals never mix currencies, and unpriced holdings are counted, not valued at zero', () => {
  const omr = position(h(1, { currency: 'OMR', priceMinor: 1100 }), [tx(1, 'buy', 1, 10, 1000)]);
  const usd = position(h(2, { currency: 'USD', priceMinor: 500 }), [tx(2, 'buy', 1, 4, 400)]);
  const usdNoPrice = position(h(3, { currency: 'USD' }), [tx(3, 'buy', 1, 1, 100)]);
  const t = totalsByCurrency([omr, usd, usdNoPrice]);
  expect(t.map((x) => x.currency)).toEqual(['OMR', 'USD']);
  expect(t[0]).toMatchObject({ costMinor: 10000, valueMinor: 11000, unpriced: 0 });
  expect(t[1]).toMatchObject({ costMinor: 1700, valueMinor: 2000, unpriced: 1 });
});

// -- storage: schema v3, the sell guard, backup (D-059) ------------------------

import { FinanceRepository } from '../src/data/repository';
import { migrate, migrateTo } from '../src/data/schema';
import { SqlJsDriver } from './helpers/sqlJsDriver';

const clock = () => new Date(2026, 10, 20, 12);

test('a v2 database moves to v3 with every existing row intact', async () => {
  const driver = new SqlJsDriver();
  const db = await driver.open();
  await migrateTo(db, 2);
  await db.run("INSERT INTO assets (name, kind, value_minor, is_estimate, updated_day, created_at, updated_at) VALUES ('بنك', 'bank', 2400000, 0, '2026-11-01', 0, 0)");
  await migrate(db);
  const repo = new FinanceRepository(db, clock);
  expect((await repo.assets())[0]).toMatchObject({ name: 'بنك', valueMinor: 2400000 });
  expect(await repo.holdings()).toEqual([]);
  await db.close();
});

test('the database refuses a sale of more units than were held on that date', async () => {
  const driver = new SqlJsDriver();
  const db = await driver.open();
  await migrate(db);
  const repo = new FinanceRepository(db, clock);
  const id = await repo.addHolding({ name: 'صندوق مؤشر', kind: 'fund', currency: 'OMR' });
  const base = { holdingId: id, priceMinor: 1000, amountMinor: 0, feeMinor: 0, reason: 'ادخار طويل', risks: 'قد ينخفض' };
  await repo.addHoldingTx({ ...base, kind: 'buy', day: d(10, 11), quantityMicro: 10 * QTY_SCALE });
  await expect(repo.addHoldingTx({ ...base, kind: 'sell', day: d(11, 11), quantityMicro: 11 * QTY_SCALE })).rejects.toThrow(/sellMoreThanHeld/);
  // A sale dated BEFORE the buy is refused too: the history is replayed in date order.
  await expect(repo.addHoldingTx({ ...base, kind: 'sell', day: d(1, 11), quantityMicro: 1 * QTY_SCALE })).rejects.toThrow(/sellMoreThanHeld/);
  await repo.addHoldingTx({ ...base, kind: 'sell', day: d(12, 11), quantityMicro: 4 * QTY_SCALE });
  const txs = await repo.holdingTxs();
  expect(txs).toHaveLength(2);
  expect(txs[0].reason).toBe('ادخار طويل');
  // Deleting the buy would leave the sale selling units that never existed.
  await expect(repo.deleteHoldingTx(txs[0].id)).rejects.toThrow(/sellMoreThanHeld/);
  await db.close();
});

test('the user-entered price carries the day it was entered', async () => {
  const driver = new SqlJsDriver();
  const db = await driver.open();
  await migrate(db);
  const repo = new FinanceRepository(db, clock);
  const id = await repo.addHolding({ name: 'ذهب', kind: 'gold', currency: 'OMR' });
  await repo.setHoldingPrice(id, 31500, d(20, 11));
  expect((await repo.holdings())[0]).toMatchObject({ priceMinor: 31500, priceDay: d(20, 11) });
  await db.close();
});
