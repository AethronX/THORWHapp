import { Currency, currencyFromCode, DEFAULT_CURRENCY } from '../core/currency';
import { addMonths, Day, dayFromDate, monthOf, sameMonth, YearMonth } from '../core/dates';
import type { DbDriver } from '../data/db';
import { FinanceRepository, SettingKeys } from '../data/repository';
import { migrate } from '../data/schema';
import type { Category, Expense, IncomeEntry, SavingsGoal } from '../domain/models';

export type LoadStatus = 'loading' | 'ready' | 'error';
export type Locale = 'ar' | 'en';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppState {
  readonly status: LoadStatus;
  readonly currency: Currency;
  readonly locale: Locale;
  readonly themeMode: ThemeMode;
  readonly onboarded: boolean;
  /** The month being viewed. */
  readonly month: YearMonth;
  readonly today: Day;
  readonly categories: readonly Category[];
  /** Includes archived categories, for history. */
  readonly categoriesById: ReadonlyMap<number, Category>;
  readonly expenses: readonly Expense[];
  readonly incomes: readonly IncomeEntry[];
  readonly budgets: ReadonlyMap<number, number>;
  readonly goals: readonly SavingsGoal[];
  readonly previousMonthHasIncome: boolean;
}

/**
 * Application state for the whole app. Screens read the immutable snapshot
 * and call methods; all money logic lives in the domain engine. Every
 * mutation: repository write -> reload the viewed month -> new snapshot.
 */
export class AppController {
  private repo: FinanceRepository | null = null;
  private listeners = new Set<() => void>();
  private lastSeenCurrentMonth: YearMonth;
  private state: AppState;

  constructor(
    private readonly driver: DbDriver,
    private readonly clock: () => Date = () => new Date(),
  ) {
    const today = dayFromDate(this.clock());
    this.lastSeenCurrentMonth = monthOf(today);
    this.state = {
      status: 'loading',
      currency: DEFAULT_CURRENCY,
      locale: 'ar',
      themeMode: 'light',
      onboarded: false,
      month: monthOf(today),
      today,
      categories: [],
      categoriesById: new Map(),
      expenses: [],
      incomes: [],
      budgets: new Map(),
      goals: [],
      previousMonthHasIncome: false,
    };
  }

  // -- store plumbing (useSyncExternalStore) --------------------------------

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = (): AppState => this.state;

  private set(patch: Partial<AppState>) {
    this.state = { ...this.state, ...patch, today: dayFromDate(this.clock()) };
    this.listeners.forEach((l) => l());
  }

  private get r(): FinanceRepository {
    if (!this.repo) throw new Error('Repository not open');
    return this.repo;
  }

  // -- lifecycle -------------------------------------------------------------

  async init(): Promise<void> {
    this.set({ status: 'loading' });
    try {
      const db = await this.driver.open();
      try {
        await migrate(db);
      } catch (e) {
        await db.close();
        throw e;
      }
      this.repo = new FinanceRepository(db, this.clock);
      const s = await this.repo.loadSettings();
      const theme = s[SettingKeys.themeMode];
      const patch: Partial<AppState> = {
        currency: currencyFromCode(s[SettingKeys.currency]),
        locale: s[SettingKeys.locale] === 'en' ? 'en' : 'ar',
        // Light is the default (D-020); dark/system only when the user chose it.
        themeMode: theme === 'dark' || theme === 'system' ? theme : 'light',
        onboarded: s[SettingKeys.onboarded] === '1',
      };
      this.set({ ...patch, ...(await this.load(this.state.month)), status: 'ready' });
    } catch {
      // Never log the error: it may contain user amounts.
      this.set({ status: 'error' });
    }
  }

  private async load(month: YearMonth): Promise<Partial<AppState>> {
    const r = this.r;
    const all = await r.categories(true);
    const incomes = await r.incomesFor(month);
    return {
      month,
      categories: all.filter((c) => !c.archived),
      categoriesById: new Map(all.map((c) => [c.id, c])),
      expenses: await r.expensesFor(month),
      incomes,
      budgets: new Map((await r.budgets()).map((b) => [b.categoryId, b.limitMinor])),
      goals: await r.goals(),
      previousMonthHasIncome:
        incomes.length === 0 && (await r.incomesFor(addMonths(month, -1))).length > 0,
    };
  }

  private async mutate<T>(op: (r: FinanceRepository) => Promise<T>, extra?: Partial<AppState>): Promise<T> {
    const result = await op(this.r);
    this.set({ ...extra, ...(await this.load(this.state.month)) });
    return result;
  }

  async dispose() {
    this.listeners.clear();
    await this.repo?.close();
    this.repo = null;
  }

  get isCurrentMonth(): boolean {
    return sameMonth(this.state.month, monthOf(dayFromDate(this.clock())));
  }

  /** On return to foreground: follow a month rollover if viewing "now". */
  async onResumed() {
    const now = monthOf(dayFromDate(this.clock()));
    const prev = this.lastSeenCurrentMonth;
    this.lastSeenCurrentMonth = now;
    if (this.state.status === 'ready' && !sameMonth(now, prev) && sameMonth(this.state.month, prev)) {
      await this.setMonth(now);
    } else {
      this.set({});
    }
  }

  // -- settings & onboarding -------------------------------------------------

  completeOnboarding(args: { currency: Currency; monthlyIncomeMinor?: number | null; incomeLabel?: string }) {
    return this.mutate(
      (r) =>
        r.completeOnboarding({
          currencyCode: args.currency.code,
          month: this.state.month,
          incomeMinor: args.monthlyIncomeMinor,
          incomeLabel: args.incomeLabel,
        }),
      { currency: args.currency, onboarded: true },
    );
  }

  async setLocale(locale: Locale) {
    await this.r.setSetting(SettingKeys.locale, locale);
    this.set({ locale });
  }

  async setThemeMode(themeMode: ThemeMode) {
    await this.r.setSetting(SettingKeys.themeMode, themeMode);
    this.set({ themeMode });
  }

  async setMonth(month: YearMonth) {
    this.set(await this.load(month));
  }

  // -- mutations -------------------------------------------------------------

  addExpense = (e: Omit<Expense, 'id'>) => this.mutate((r) => r.addExpense(e));
  updateExpense = (e: Expense) => this.mutate((r) => r.updateExpense(e));
  deleteExpense = (id: number) => this.mutate((r) => r.deleteExpense(id));

  addIncome = (amountMinor: number, label = '') =>
    this.mutate((r) => r.addIncome(this.state.month, amountMinor, label));
  updateIncome = (e: IncomeEntry) => this.mutate((r) => r.updateIncome(e));
  deleteIncome = (id: number) => this.mutate((r) => r.deleteIncome(id));
  copyIncomeFromPreviousMonth = () =>
    this.mutate((r) => r.copyIncome(addMonths(this.state.month, -1), this.state.month));

  setBudget = (categoryId: number, limitMinor: number | null) =>
    this.mutate((r) => r.setBudget(categoryId, limitMinor));

  addCategory = (name: string) => this.mutate((r) => r.addCategory(name));
  renameCategory = (id: number, name: string) => this.mutate((r) => r.renameCategory(id, name));
  removeCategory = (id: number) => this.mutate((r) => r.removeCategory(id));

  addGoal = (args: { name: string; targetMinor: number; targetDate: Day; initialSavedMinor?: number }) =>
    this.mutate((r) => r.addGoal({ ...args, today: dayFromDate(this.clock()) }));
  updateGoal = (args: { id: number; name: string; targetMinor: number; targetDate: Day }) =>
    this.mutate((r) => r.updateGoal(args));
  deleteGoal = (id: number) => this.mutate((r) => r.deleteGoal(id));
  addContribution = (goalId: number, amountMinor: number) =>
    this.mutate((r) => r.addContribution(goalId, amountMinor, dayFromDate(this.clock())));

  /** Permanently deletes the database and returns to first run. */
  async deleteAllData() {
    try {
      await this.repo?.close();
      this.repo = null;
      await this.driver.destroy();
      const today = dayFromDate(this.clock());
      this.set({ currency: DEFAULT_CURRENCY, onboarded: false, locale: 'ar', month: monthOf(today) });
    } finally {
      // Always reopen, so a failure never leaves a half-closed app.
      await this.init();
    }
  }
}
