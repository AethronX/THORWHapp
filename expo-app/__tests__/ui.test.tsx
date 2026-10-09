/**
 * End-to-end UI tests: the real Expo Router routes in src/app, the real
 * controller and repository, and a real SQLite engine (sql.js) in place of
 * expo-sqlite. Only native-only pieces are replaced: the DB driver and the
 * native confirm dialog (auto-answered).
 */
import { Alert } from 'react-native';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

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
  press('dashboard.addExpense');
  await screen.findByTestId('expenseForm');
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
  expect(await screen.findByTestId('insight.overBudget')).toBeTruthy();

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
  press('dashboard.addExpense');
  await screen.findByTestId('expenseForm');
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
  expect(screen.getByTestId('plan.saving').props.children).toBe(ar.planSaving('\u200E160.000\u200E ر.ع.', '20%'));
  expect(screen.getByText(ar.planGoalEmergency('\u200E1,200.000\u200E ر.ع.'))).toBeTruthy();
  expect(screen.getByText(ar.planBudget(ar.cat.food, '\u200E80.000\u200E ر.ع.'))).toBeTruthy();
  press('plan.start');

  // Applied: goal + budget exist; insights use the payday (Oct 9 → Oct 25 = 16 days).
  await screen.findByTestId('dashboard');
  await nav((router) => router.push('/goals'));
  expect(await screen.findByText(ar.emergencyGoalName)).toBeTruthy();
  await nav((router) => router.push('/analytics'));
  await screen.findByTestId('analytics.health');
  // (800 − 0 − 160) / 16 days = 40.000 per day.
  expect(screen.getByTestId('analytics.safe.amount').props.children).toBe('\u200E40.000\u200E ر.ع.');
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
