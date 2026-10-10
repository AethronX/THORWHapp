/**
 * End-to-end UI tests: the real Expo Router routes in src/app, the real
 * controller and repository, and a real SQLite engine (sql.js) in place of
 * expo-sqlite. Only native-only pieces are replaced: the DB driver and the
 * native confirm dialog (auto-answered).
 */
import { Alert } from 'react-native';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { FinanceRepository } from '../src/data/repository';
import { migrate } from '../src/data/schema';
import { STRINGS } from '../src/ui/i18n';
import { SqlJsDriver } from './helpers/sqlJsDriver';

jest.setTimeout(60000);

const mockDriver = { current: new SqlJsDriver() };
jest.mock('../src/data/expoDb', () => ({
  expoDbDriver: {
    open: () => mockDriver.current.open(),
    destroy: () => mockDriver.current.destroy(),
  },
}));
const mockAuth = { success: true, calls: 0 };
jest.mock('expo-local-authentication', () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  hasHardwareAsync: async () => true,
  getEnrolledLevelAsync: async () => 3,
  authenticateAsync: async () => {
    mockAuth.calls++;
    return { success: mockAuth.success };
  },
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));

const ar = STRINGS.ar;
const en = STRINGS.en;

// Confirm dialogs: press the last (confirm) button.
let alertSpy: jest.SpyInstance;
beforeEach(() => {
  mockDriver.current = new SqlJsDriver();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    buttons?.[buttons.length - 1]?.onPress?.();
  });
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(new Date(2026, 9, 9, 10));
});
afterEach(() => {
  alertSpy.mockRestore();
  jest.useRealTimers();
});

const app = () => renderRouter('./src/app', { initialUrl: '/' });
const press = (id: string) => fireEvent.press(screen.getByTestId(id));
const type = (id: string, text: string) => fireEvent.changeText(screen.getByTestId(id), text);
const nav = (fn: (router: typeof import('expo-router').router) => void) =>
  act(async () => fn(require('expo-router').router));
const label = (id: string) => screen.getByTestId(id).props.accessibilityLabel as string;

/** FAB → Quick add → "More details" → the full expense form. */
async function openFullExpenseForm() {
  press('dashboard.addExpense');
  await screen.findByTestId('quickAdd');
  press('quick.more');
  await screen.findByTestId('expenseForm');
}

async function onboard(income?: string) {
  await screen.findByTestId('onb.skip');
  press('onb.skip');
  await screen.findByTestId('quiz.skipAll');
  press('quiz.skipAll');
  await screen.findByTestId('setup.income');
  if (income) type('setup.income', income);
  press('setup.finish');
  await screen.findByTestId('dashboard');
}

test('full MVP journey in Arabic, persisting across restart', async () => {
  const r = app();

  // 1. Arabic onboarding first.
  expect(await screen.findByText(ar.onbTitle1)).toBeTruthy();

  // 2-3. Keep OMR, enter income 800.
  await onboard('800');
  await waitFor(() => expect(label('summary.net')).toContain('800.000'));

  // 4. Add an expense: 12.5 OMR food. Empty form is rejected first.
  await openFullExpenseForm();
  press('expense.save');
  expect(await screen.findByText(ar.errAmountEmpty)).toBeTruthy();
  expect(screen.getByTestId('expense.cat.error')).toBeTruthy();
  type('expense.amount', '12.5');
  press('expense.cat.2'); // food (2nd seeded category)
  press('expense.save');
  await screen.findByTestId('dashboard');
  await waitFor(() => expect(label('summary.net')).toContain('787.500'));

  // 5. Food budget 10 -> over-budget insight.
  press('dashboard.budgets');
  await screen.findByTestId('budgets');
  press('budget.row.2');
  type('budget.editor.amount', '10');
  press('budget.editor.save');
  await waitFor(() => expect(screen.queryByTestId('budget.editor')).toBeNull());
  await nav((router) => router.back());
  // Over budget is now the top "next step" (with its reason and an action), not repeated as an alert.
  expect(await screen.findByTestId('guidance.overBudget:2')).toBeTruthy();
  expect(screen.getByTestId('guidance.overBudget:2.title').props.children).toBe(ar.gOverBudgetTitle(ar.cat.food, '\u200E2.500\u200E\u00A0ر.ع.'));
  expect(screen.queryByTestId('insight.overBudget')).toBeNull();

  // 6. Goal 1200 with 200 saved -> 1000/12 = 83.334 per month (rounded up).
  await nav((router) => router.push('/goal/new'));
  await screen.findByTestId('goalForm');
  type('goal.name', 'سيارة');
  type('goal.target', '1200');
  type('goal.saved', '200');
  press('goal.save');
  await waitFor(() => expect(screen.queryByTestId('goalForm')).toBeNull());
  await nav((router) => router.push('/goals'));
  const required = await screen.findByTestId('goal.required.1');
  expect(required.props.children).toContain('83.334');

  // 7. Calculator: results + disclaimer; invalid years hides results.
  await nav((router) => router.push('/plan'));
  expect(await screen.findByTestId('calc.result.zero')).toBeTruthy();
  expect(screen.getByTestId('calc.disclaimer')).toBeTruthy();
  type('calc.years', '0');
  expect(screen.queryByTestId('calc.results')).toBeNull();
  expect(screen.getByText(ar.errYearsRange)).toBeTruthy();

  // 8-9. "Close" and reopen the app on the same database.
  r.unmount();
  app();
  await screen.findByTestId('dashboard');
  await waitFor(() => expect(label('summary.net')).toContain('787.500'));
  expect(label('summary.income')).toContain('800.000');

  // 10. Edit then delete the expense.
  await nav((router) => router.push('/expenses'));
  await screen.findByTestId('expense.row.1');
  press('expense.row.1');
  await screen.findByTestId('expenseForm');
  type('expense.amount', '20');
  press('expense.save');
  await screen.findByTestId('expenses');
  await waitFor(() => expect(label('expenses.total')).toContain('20.000'));
  press('expense.row.1');
  await screen.findByTestId('expense.delete');
  press('expense.delete');
  expect(await screen.findByText(ar.noExpenses)).toBeTruthy();

  // 11. Delete all data -> back to a clean onboarding.
  await nav((router) => router.push('/settings'));
  await screen.findByTestId('settings.deleteAll');
  press('settings.deleteAll');
  expect(await screen.findByText(ar.onbTitle1)).toBeTruthy();
});

test('switching to English changes the language', async () => {
  app();
  await onboard();
  await nav((router) => router.push('/settings'));
  await screen.findByTestId('settings.lang.en');
  press('settings.lang.en');
  expect(await screen.findByText(en.privacy)).toBeTruthy();
});

test('ambiguous amounts are rejected in the form, not guessed', async () => {
  app();
  await onboard('1,5');
  await waitFor(() => expect(label('summary.income')).toContain('1.500'));
  await openFullExpenseForm();
  type('expense.amount', '12,500');
  press('expense.cat.2');
  press('expense.save');
  expect(await screen.findByText(ar.errAmountInvalid)).toBeTruthy();
});

test('questionnaire builds a personal plan that the app then uses', async () => {
  app();
  await screen.findByTestId('onb.skip');
  press('onb.skip');

  // Q1 goal → Q2 income → Q3 payday (salary only) → Q4 focus → Q5 habit.
  expect((await screen.findByTestId('quiz.progress')).props.children).toBe(ar.quizProgress(1, 5));
  press('quiz.opt.emergency');
  await screen.findByTestId('quiz.income');
  press('quiz.opt.salary');
  await screen.findByTestId('quiz.payday');
  press('quiz.payday.25');
  await screen.findByTestId('quiz.focus');
  // Back works and keeps answers.
  press('quiz.back');
  await screen.findByTestId('quiz.payday');
  press('quiz.payday.25');
  await screen.findByTestId('quiz.focus');
  press('quiz.opt.food');
  await screen.findByTestId('quiz.habit');
  press('quiz.opt.regularly');

  type(await screen.findByTestId('setup.income').then(() => 'setup.income'), '800');
  press('setup.finish');

  // Plan: 20 % saving, emergency fund 1.5 × income, food limit 10 %.
  await screen.findByTestId('plan.review');
  expect(screen.getByTestId('plan.saving').props.children).toBe(ar.planSaving('\u200E160.000\u200E\u00A0ر.ع.', '20%'));
  expect(screen.getByText(ar.planGoalEmergency('\u200E1,200.000\u200E\u00A0ر.ع.'))).toBeTruthy();
  expect(screen.getByText(ar.planBudget(ar.cat.food, '\u200E80.000\u200E\u00A0ر.ع.'))).toBeTruthy();
  press('plan.start');

  // Applied: goal + budget exist; insights use the payday (Oct 9 → Oct 25 = 16 days).
  await screen.findByTestId('dashboard');
  await nav((router) => router.push('/goals'));
  expect(await screen.findByText(ar.emergencyGoalName)).toBeTruthy();
  await nav((router) => router.push('/analytics'));
  await screen.findByTestId('analytics.health');
  // (800 − 0 − 160) / 16 days = 40.000 per day.
  expect(screen.getByTestId('analytics.safe.amount').props.children).toBe('\u200E40.000\u200E\u00A0ر.ع.');
  expect(screen.getByText(ar.safeUntilPayday(16))).toBeTruthy();
});

test('analytics: donut, comparison and pace warning from real data', async () => {
  app();
  await onboard('500');
  // Last month: 300 spent. This month: 600 by Oct 9 → pace far above income.
  await nav((router) => router.push('/expense/new'));
  await screen.findByTestId('expenseForm');
  type('expense.amount', '600');
  press('expense.cat.2');
  press('expense.save');
  await waitFor(() => expect(screen.queryByTestId('expenseForm')).toBeNull());
  await nav((router) => router.push('/analytics'));
  await screen.findByTestId('analytics.health');
  expect(screen.getByTestId('analytics.donut')).toBeTruthy();
  expect(screen.getByTestId('analytics.paceWarning')).toBeTruthy();
  // Spending exceeds income → no safe daily amount.
  expect(screen.getByText(ar.safeZero)).toBeTruthy();
});

test('Settings → retake the questionnaire updates the saved answers', async () => {
  app();
  await onboard('900');
  await nav((router) => router.push('/profile'));
  await screen.findByTestId('quiz.goal');
  press('quiz.opt.debt');
  await screen.findByTestId('quiz.income');
  press('quiz.opt.irregular'); // irregular income → payday question is skipped
  await screen.findByTestId('quiz.focus');
  expect(screen.getByTestId('quiz.progress').props.children).toBe(ar.quizProgress(3, 4));
  press('quiz.opt.none');
  await screen.findByTestId('quiz.habit');
  press('quiz.opt.rarely');
  await screen.findByTestId('dashboard');
  await nav((router) => router.push('/analytics'));
  await screen.findByTestId('analytics.safe');
  // No payday → counts down to month end (Oct 9 → 23 days left incl. today).
  expect(screen.getByText(ar.safeUntilMonthEnd(23))).toBeTruthy();
});


test('Quick add: keypad, smart category from the note, three taps to save', async () => {
  app();
  await onboard('800');
  press('dashboard.addExpense');
  await screen.findByTestId('quickAdd');
  // Save is disabled until there is an amount and a category.
  expect(screen.getByTestId('quick.save').props.accessibilityState.disabled).toBe(true);
  for (const k of ['1', '2', 'dec', '5', '0', '0', '0']) press(`key.${k}`);
  expect(screen.getByTestId('quick.amount').props.children).toBe('\u200E12.500\u200E\u00A0ر.ع.'); // 4th decimal ignored (OMR has 3)
  press('key.back');
  expect(screen.getByTestId('quick.amount').props.children).toBe('\u200E12.50\u200E\u00A0ر.ع.');
  press('key.0');
  // Note «بنزين المها» → transport suggested from the keyword list.
  type('quick.note', 'بنزين المها');
  expect(await screen.findByTestId('quick.suggestion')).toBeTruthy();
  expect(screen.getByText(ar.suggestedKeyword)).toBeTruthy();
  press('quick.save');
  await waitFor(() => expect(screen.queryByTestId('quickAdd')).toBeNull());
  await waitFor(() => expect(label('summary.expenses')).toContain('12.500'));

  // Second time the user's own history wins: same note → same category, labelled "from your history".
  press('dashboard.addExpense');
  await screen.findByTestId('quickAdd');
  press('key.3');
  type('quick.note', 'بنزين');
  expect(await screen.findByText(ar.suggestedHistory)).toBeTruthy();
  // A manual pick overrides the suggestion.
  press('quick.cat.2');
  expect(screen.queryByTestId('quick.suggestion')).toBeNull();
  press('quick.yesterday');
  press('quick.save');
  await waitFor(() => expect(label('summary.expenses')).toContain('15.500'));
});

test('Quick add → More details carries the amount, note and category', async () => {
  app();
  await onboard('800');
  press('dashboard.addExpense');
  await screen.findByTestId('quickAdd');
  press('key.7');
  type('quick.note', 'Omantel');
  press('quick.more');
  await screen.findByTestId('expenseForm');
  expect(screen.getByTestId('expense.amount').props.value).toBe('7');
  expect(screen.getByTestId('expense.note').props.value).toBe('Omantel');
  expect(screen.getByTestId('expense.cat.5').props.accessibilityState.selected).toBe(true); // telecom
});


test('hide amounts: one tap masks every amount, and it is remembered', async () => {
  app();
  await onboard('800');
  await waitFor(() => expect(label('summary.net')).toContain('800.000'));
  press('dashboard.hideAmounts');
  await waitFor(() => expect(label('summary.net')).toContain('••••'));
  expect(label('summary.net')).not.toContain('800');
  await nav((router) => router.push('/settings'));
  expect((await screen.findByTestId('settings.hideAmounts')).props.value).toBe(true);
  fireEvent(screen.getByTestId('settings.hideAmounts'), 'valueChange', false);
  await nav((router) => router.push('/'));
  await waitFor(() => expect(label('summary.net')).toContain('800.000'));
});

test('app lock: enabling needs authentication; reopening shows the lock screen', async () => {
  mockAuth.success = true;
  mockAuth.calls = 0;
  const r = app();
  await onboard('800');
  await nav((router) => router.push('/settings'));
  await screen.findByTestId('settings.appLock');
  fireEvent(screen.getByTestId('settings.appLock'), 'valueChange', true);
  await waitFor(() => expect(screen.getByTestId('settings.appLock').props.value).toBe(true));
  expect(mockAuth.calls).toBe(1);
  // Not locked out right after turning it on.
  expect(screen.queryByTestId('lockScreen')).toBeNull();

  // Reopen: locked. A failed check keeps it locked; a successful one opens.
  r.unmount();
  mockAuth.success = false;
  app();
  await screen.findByTestId('lockScreen');
  expect(screen.queryByTestId('dashboard')).toBeNull();
  mockAuth.success = true;
  press('lock.unlock');
  await screen.findByTestId('dashboard');
});


test('smart analytics: recurring payments, unusual expense, calendar and the formula', async () => {
  // Seed 3 months of history directly into the database the app will open.
  const db = await mockDriver.current.open();
  await migrate(db);
  const repo = new FinanceRepository(db, () => new Date(2026, 9, 9, 10));
  await repo.completeOnboarding({ currencyCode: 'OMR', month: { year: 2026, month: 10 }, incomeMinor: 1000000, incomeLabel: 'راتب' });
  const cat = new Map((await repo.categories()).map((c) => [c.key, c.id]));
  const add = (key: string, amountMinor: number, month: number, day: number, note = '') =>
    repo.addExpense({ amountMinor, categoryId: cat.get(key as never)!, date: { year: 2026, month, day }, note });
  for (const m of [7, 8, 9]) {
    await add('housing', 300000, m, 1);
    await add('telecom', 15000, m, 5, 'Omantel');
    await add('entertainment', 4500, m, 12, 'نتفليكس');
    for (const [d, a] of [[3, 8000], [10, 10000], [17, 12000], [24, 9000]]) await add('food', a, m, d, 'لولو');
  }
  await add('housing', 300000, 10, 1);
  await add('telecom', 15000, 10, 5, 'Omantel');
  await add('food', 40000, 10, 8, 'عزومة');
  await db.close();

  app();
  await screen.findByTestId('dashboard');
  await nav((router) => router.push('/analytics'));
  await screen.findByTestId('analytics.health');

  // Recurring: rent (no note, same amount) + Omantel + Netflix = 319.500 a month.
  expect(screen.getByTestId('analytics.recurring.total').props.children).toBe(ar.recurringTotal('\u200E319.500\u200E\u00A0ر.ع.'));
  expect(screen.getByText('Omantel')).toBeTruthy();
  expect(screen.getAllByText(ar.recurringPaid).length).toBe(2); // rent + Omantel paid in October
  expect(screen.getByText(ar.recurringDue(12))).toBeTruthy(); // Netflix, usually on the 12th

  // Unusual: 40.000 on food vs a typical 9.500.
  expect(screen.getByText(ar.unusualBody('\u200E40.000\u200E\u00A0ر.ع.', ar.cat.food, '\u200E9.500\u200E\u00A0ر.ع.'))).toBeTruthy();

  // Calendar shows everyday spending (rent on the 1st and Omantel on the 5th are bills):
  // Oct 1–9 with everyday spending only on the 8th → 8 no-spend days.
  expect(screen.getByTestId('analytics.noSpend').props.children).toBe(ar.calendarNoSpend(8));
  // Lulu 4× a month is shopping, not a recurring payment.
  expect(screen.queryByText('لولو')).toBeNull();

  // Safe-to-spend explains itself with the user's own numbers.
  press('analytics.safe.how');
  expect(screen.getByTestId('analytics.safe.explain').props.children).toBe(
    ar.safeExplain('\u200E1,000.000\u200E\u00A0ر.ع.', '\u200E355.000\u200E\u00A0ر.ع.', '\u200E0.000\u200E\u00A0ر.ع.', '23'),
  );
});

test('home: net cash flow is named, dated and defined — never presented as a bank balance', async () => {
  app();
  await onboard('800');
  await waitFor(() => expect(label('summary.net')).toContain('800.000'));
  expect(label('summary.net')).toContain(`${ar.net}، أكتوبر 2026`);
  expect(screen.getByTestId('summary.definition').props.children).toBe(ar.netDefinition);
  expect(screen.getByTestId('summary.dataNote').props.children).toBe(ar.dataNote);
});

test('guidance: rising category → set a limit (prefilled), emergency fund → goal, "not now"', async () => {
  const db = await mockDriver.current.open();
  await migrate(db);
  const repo = new FinanceRepository(db, () => new Date(2026, 9, 9, 10));
  await repo.completeOnboarding({ currencyCode: 'OMR', month: { year: 2026, month: 10 }, incomeMinor: 1000000, incomeLabel: 'راتب' });
  const cat = new Map((await repo.categories()).map((c) => [c.key, c.id]));
  const add = (key: string, amountMinor: number, month: number, day: number) =>
    repo.addExpense({ amountMinor, categoryId: cat.get(key as never)!, date: { year: 2026, month, day }, note: '' });
  for (const m of [7, 8, 9]) await add('housing', 300000, m, 1); // essentials: 300 a month
  await add('entertainment', 20000, 9, 5); // Sep 1–9: 20
  await add('entertainment', 27400, 9, 25); // Sep total: 47.4
  await add('entertainment', 35000, 10, 3);
  await add('entertainment', 25000, 10, 8); // Oct 1–9: 60 → +200 %
  await db.close();
  const ent = cat.get('entertainment')!;

  app();
  await screen.findByTestId('dashboard');
  const rising = `guidance.categoryRising:${ent}`;
  expect((await screen.findByTestId(`${rising}.title`)).props.children).toBe(ar.gRisingTitle(ar.cat.entertainment, '200%'));
  // Why: the user's own numbers, same days compared, suggested limit = last month's total rounded up.
  press(`${rising}.why`);
  expect(screen.getByTestId(`${rising}.reason`).props.children).toBe(
    ar.gRisingWhy(9, '‎60.000‎ ر.ع.', '‎20.000‎ ر.ع.', '‎60.000‎ ر.ع.'),
  );
  // Act: budgets opens with the editor on that category, prefilled with max(47.4, 60) = 60.
  press(`${rising}.act`);
  expect((await screen.findByTestId('budget.editor.amount')).props.value).toBe('60');
  press('budget.editor.save');
  await waitFor(() => expect(screen.queryByTestId('budget.editor')).toBeNull());
  await nav((router) => router.back());
  // With a limit set, the rising step is gone; the emergency fund (3 × 300) is next.
  await screen.findByTestId('guidance.emergencyFund');
  expect(screen.queryByTestId(rising)).toBeNull();
  expect(screen.getByTestId('guidance.emergencyFund.title').props.children).toBe(ar.gEmergencyTitle('‎900.000‎ ر.ع.'));
  press('guidance.emergencyFund.act');
  expect((await screen.findByTestId('goal.name')).props.value).toBe(ar.emergencyGoalName);
  expect(screen.getByTestId('goal.target').props.value).toBe('900');
  press('goal.save');
  await waitFor(() => expect(screen.queryByTestId('goal.name')).toBeNull());
  await nav((router) => router.push('/'));
  // Goal exists but is empty → the step now opens goals instead of creating another; "Not now" hides it.
  await screen.findByTestId('guidance.emergencyFund');
  expect(screen.getByTestId('guidance.emergencyFund.act').props.accessibilityLabel).toBe(ar.gOpenGoals);
  press('guidance.emergencyFund.dismiss');
  await waitFor(() => expect(screen.queryByTestId('nextStep')).toBeNull());
});

test('expenses: Arabic-tolerant search, category filter, no-results state', async () => {
  const db = await mockDriver.current.open();
  await migrate(db);
  const repo = new FinanceRepository(db, () => new Date(2026, 9, 9, 10));
  await repo.completeOnboarding({ currencyCode: 'OMR', month: { year: 2026, month: 10 }, incomeMinor: 800000, incomeLabel: 'راتب' });
  const cat = new Map((await repo.categories()).map((c) => [c.key, c.id]));
  const add = (key: string, amountMinor: number, day: number, note: string) =>
    repo.addExpense({ amountMinor, categoryId: cat.get(key as never)!, date: { year: 2026, month: 10, day }, note });
  const lulu = await add('food', 12000, 2, 'لولو');
  const rest = await add('food', 8000, 3, 'مطعم');
  const hosp = await add('health', 20000, 4, 'مستشفى الجامعة');
  await db.close();

  app();
  await screen.findByTestId('dashboard');
  await nav((router) => router.push('/expenses'));
  await screen.findByTestId('expenses.search');
  const rows = () => [lulu, rest, hosp].filter((id) => screen.queryByTestId(`expense.row.${id}`));

  // «مستشفي» (ى written as ي) still finds «مستشفى».
  type('expenses.search', 'مستشفي');
  await waitFor(() => expect(rows()).toEqual([hosp]));
  expect(screen.getByTestId('expenses.results').props.children).toBe(ar.resultsSummary(1, 3, '‎20.000‎ ر.ع.'));
  press('expenses.search.clear');
  await waitFor(() => expect(rows()).toHaveLength(3));
  expect(screen.getByTestId('expenses.total')).toBeTruthy();

  // Category chip.
  press(`expenses.filter.${cat.get('food')}`);
  await waitFor(() => expect(rows()).toEqual([lulu, rest]));
  expect(screen.getByTestId('expenses.results').props.children).toBe(ar.resultsSummary(2, 3, '‎20.000‎ ر.ع.'));

  // Nothing matches → clear state that offers a way out.
  type('expenses.search', 'كارفور');
  expect(await screen.findByText(ar.noResults)).toBeTruthy();
  press('expenses.clearFilters');
  await waitFor(() => expect(rows()).toHaveLength(3));
});
