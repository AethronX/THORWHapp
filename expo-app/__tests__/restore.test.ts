/** @jest-environment node */
/**
 * Restore from a backup file (D-058): the file is untrusted, the write is
 * all-or-nothing, and a restored database reads back exactly as exported.
 */
import { currencyFromCode } from '../src/core/currency';
import { buildBackup, parseBackup } from '../src/domain/backup';
import { SCHEMA_VERSION } from '../src/data/schema';
import { AppController } from '../src/state/appController';
import { expenseTotal, incomeTotal } from '../src/state/selectors';
import { SqlJsDriver } from './helpers/sqlJsDriver';

const OMR = currencyFromCode('OMR');
const now = () => new Date(2026, 10, 20, 12);
let app: AppController;

beforeEach(async () => {
  app = new AppController(new SqlJsDriver(), now);
  await app.init();
  await app.completeOnboarding({ currency: OMR, monthlyIncomeMinor: 1200000, incomeLabel: 'راتب' });
  const food = app.getState().categories.find((c) => c.key === 'food')!.id;
  await app.addExpense({ amountMinor: 18750, categoryId: food, date: { year: 2026, month: 11, day: 3 }, note: 'لولو' });
  await app.addExpense({ amountMinor: 4200, categoryId: food, date: { year: 2026, month: 11, day: 5 }, note: 'قهوة' });
});
afterEach(() => app.dispose());

const exportText = async () =>
  JSON.stringify(
    buildBackup({ schemaVersion: SCHEMA_VERSION, now: now(), tables: await (app as unknown as { r: { exportTables(): Promise<Record<string, Record<string, unknown>[]>> } }).r.exportTables() }),
  );

test('export, change everything, restore: the data reads back exactly as it was', async () => {
  const file = await exportText();
  const before = { income: incomeTotal(app.getState()), spent: expenseTotal(app.getState()), n: app.getState().expenses.length };

  // The user keeps using the app after the backup.
  const food = app.getState().categories.find((c) => c.key === 'food')!.id;
  await app.addExpense({ amountMinor: 99000, categoryId: food, date: { year: 2026, month: 11, day: 9 }, note: 'خطأ' });
  expect(app.getState().expenses.length).toBe(3);

  const r = await app.restoreBackup(file);
  expect(r.ok).toBe(true);
  const after = app.getState();
  expect({ income: incomeTotal(after), spent: expenseTotal(after), n: after.expenses.length }).toEqual(before);
  expect(after.expenses.map((e) => e.note).sort()).toEqual(['قهوة', 'لولو']);
  expect(after.onboarded).toBe(true);
  expect(after.currency.code).toBe('OMR');
});

test('a file that breaks half-way leaves the current data untouched', async () => {
  const file = JSON.parse(await exportText());
  // An expense pointing at a category that does not exist: the insert fails mid-restore.
  file.tables.expenses.push({ ...file.tables.expenses[0], id: 999, category_id: 4242 });
  const spentBefore = expenseTotal(app.getState());
  await expect(app.restoreBackup(JSON.stringify(file))).rejects.toThrow();
  // Reload from disk to prove nothing was half-written.
  await app.setMonth({ year: 2026, month: 11 });
  expect(expenseTotal(app.getState())).toBe(spentBefore);
  expect(app.getState().expenses).toHaveLength(2);
});

test('nothing reaches the database unless the file passes every check', () => {
  const good = { app: 'tharwati', format: 1, schemaVersion: SCHEMA_VERSION, exportedAt: '', tables: { expenses: [] } };
  const p = (x: unknown) => parseBackup(typeof x === 'string' ? x : JSON.stringify(x), SCHEMA_VERSION);
  expect(p('not json').ok).toBe(false);
  expect(p({ ...good, app: 'other' })).toEqual({ ok: false, reason: 'notTharwati' });
  expect(p({ ...good, format: 9 })).toEqual({ ok: false, reason: 'unknownFormat' });
  // A backup from a newer app version cannot be read safely by this one.
  expect(p({ ...good, schemaVersion: SCHEMA_VERSION + 1 })).toEqual({ ok: false, reason: 'newerSchema' });
  // A table we do not have.
  expect(p({ ...good, tables: { users: [] } })).toEqual({ ok: false, reason: 'malformed' });
  // Column names end up in SQL: anything but a plain identifier is refused.
  expect(p({ ...good, tables: { expenses: [{ 'id) VALUES (1); DROP TABLE expenses; --': 1 }] } })).toEqual({ ok: false, reason: 'malformed' });
  // Amounts are integer minor units: a fraction or an unsafe number is a corrupt file.
  expect(p({ ...good, tables: { expenses: [{ amount_minor: 12.5 }] } })).toEqual({ ok: false, reason: 'malformed' });
  expect(p({ ...good, tables: { expenses: [{ amount_minor: 2 ** 60 }] } })).toEqual({ ok: false, reason: 'malformed' });
  // Objects and arrays as values are refused.
  expect(p({ ...good, tables: { expenses: [{ note: { x: 1 } }] } })).toEqual({ ok: false, reason: 'malformed' });
  expect(p(good).ok).toBe(true);
});

test('an unknown column is refused by the database step too, and nothing changes', async () => {
  const file = JSON.parse(await exportText());
  file.tables.expenses[0].hacked = 1; // passes the identifier check, but is not a real column
  await expect(app.restoreBackup(JSON.stringify(file))).rejects.toThrow(/Unknown column/);
  expect(app.getState().expenses).toHaveLength(2);
});

test("this phone's app lock survives a restore", async () => {
  const file = await exportText(); // exported with the lock off
  await app.setAppLock(true);
  await app.restoreBackup(file);
  expect(app.getState().appLock).toBe(true);
});
