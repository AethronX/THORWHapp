import { Currency, currencyFromCode, DEFAULT_CURRENCY } from '../core/currency';
import { addMonths, Day, dayFromDate, monthOf, sameMonth, YearMonth } from '../core/dates';
import type { DbDriver } from '../data/db';
import { FinanceRepository, SettingKeys } from '../data/repository';
import { migrate } from '../data/schema';
import type { MonthTotals } from '../domain/analytics';
import type { Asset, AssetKind, Category, Debt, Expense, IncomeEntry, SavingsGoal } from '../domain/models';
import { parseProfile, Profile } from '../domain/profile';
import type { Day as DayT } from '../core/dates';

export type LoadStatus = 'loading' | 'ready' | 'error';
export type Locale = 'ar' | 'en';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppState {
  readonly status: LoadStatus;
  readonly currency: Currency;
  readonly locale: Locale;
  readonly themeMode: ThemeMode;
  readonly appLock: boolean;
  readonly hideAmounts: boolean;
  readonly haptics: boolean;
  /** Guidance the user dismissed: id → month key "YYYY-MM". */
  readonly dismissedGuidance: Readonly<Record<string, string>>;
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
  readonly debts: readonly Debt[];
  readonly assets: readonly Asset[];
  readonly previousMonthHasIncome: boolean;
  /** Questionnaire answers; null if skipped. */
  readonly profile: Profile | null;
  /** 6 months of totals ending at the viewed month (oldest first). */
  readonly trend: readonly MonthTotals[];
  /**
   * Spending in the previous month over the same days as today (1..today),
   * when viewing the current month; null otherwise. Fair "vs last month".
   */
  readonly previousSamePeriodExpensesMinor: number | null;
  /** Expenses of the viewed month and the 3 before it (smart features). */
  readonly history: readonly Expense[];
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
      appLock: false,
      hideAmounts: false,
      haptics: true,
      dismissedGuidance: {},
      onboarded: false,
      month: monthOf(today),
      today,
      categories: [],
      categoriesById: new Map(),
      expenses: [],
      incomes: [],
      budgets: new Map(),
      goals: [],
      debts: [],
      assets: [],
      previousMonthHasIncome: false,
      profile: null,
      trend: [],
      previousSamePeriodExpensesMinor: null,
      history: [],
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
        profile: parseProfile(s[SettingKeys.profile]),
        appLock: s[SettingKeys.appLock] === '1',
        hideAmounts: s[SettingKeys.hideAmounts] === '1',
        haptics: s[SettingKeys.haptics] !== '0',
        dismissedGuidance: parseDismissed(s[SettingKeys.dismissedGuidance]),
      };
      this.set({ ...patch, ...(await this.load(this.state.month)), status: 'ready' });
    } catch {
      // Never log the error: it may contain user amounts.
      this.set({ status: 'error' });
    }
  }

  private async load(month: YearMonth): Promise<Partial<AppState>> {
    const r = this.r;
    const today = dayFromDate(this.clock());
    const all = await r.categories(true);
    const incomes = await r.incomesFor(month);
    const history = await r.expensesBetween(addMonths(month, -3), month);
    return {
      month,
      categories: all.filter((c) => !c.archived),
      categoriesById: new Map(all.map((c) => [c.id, c])),
      expenses: history.filter((e) => sameMonth(monthOf(e.date), month)),
      history,
      incomes,
      budgets: new Map((await r.budgets()).map((b) => [b.categoryId, b.limitMinor])),
      goals: await r.goals(),
      debts: await r.debts(),
      assets: await r.assets(),
      previousMonthHasIncome:
        incomes.length === 0 && (await r.incomesFor(addMonths(month, -1))).length > 0,
      trend: await r.monthlyTotals(month, 6),
      previousSamePeriodExpensesMinor: sameMonth(month, monthOf(today))
        ? await r.expensesUntil(addMonths(month, -1), today.day)
        : null,
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

  completeOnboarding(args: {
    currency: Currency;
    monthlyIncomeMinor?: number | null;
    incomeLabel?: string;
    profile?: Profile | null;
    goal?: { name: string; targetMinor: number; targetDate: DayT } | null;
    budget?: { categoryKey: string; limitMinor: number } | null;
  }) {
    return this.mutate(
      (r) =>
        r.completeOnboarding({
          currencyCode: args.currency.code,
          month: this.state.month,
          incomeMinor: args.monthlyIncomeMinor,
          incomeLabel: args.incomeLabel,
          profileJson: args.profile ? JSON.stringify(args.profile) : undefined,
          goal: args.goal,
          budget: args.budget,
        }),
      { currency: args.currency, onboarded: true, profile: args.profile ?? this.state.profile },
    );
  }

  /** Update questionnaire answers later (Settings → "Your plan"). */
  async setProfile(profile: Profile) {
    await this.r.setSetting(SettingKeys.profile, JSON.stringify(profile));
    this.set({ profile });
  }

  async setLocale(locale: Locale) {
    await this.r.setSetting(SettingKeys.locale, locale);
    this.set({ locale });
  }

  async setThemeMode(themeMode: ThemeMode) {
    await this.r.setSetting(SettingKeys.themeMode, themeMode);
    this.set({ themeMode });
  }

  async setAppLock(appLock: boolean) {
    await this.r.setSetting(SettingKeys.appLock, appLock ? '1' : '0');
    this.set({ appLock });
  }

  async setHideAmounts(hideAmounts: boolean) {
    await this.r.setSetting(SettingKeys.hideAmounts, hideAmounts ? '1' : '0');
    this.set({ hideAmounts });
  }

  /** "Not now" on a guidance step: hidden for the rest of the current month. */
  async dismissGuidance(id: string) {
    const now = monthOf(dayFromDate(this.clock()));
    const key = `${now.year}-${String(now.month).padStart(2, '0')}`;
    // Keep only this month's entries so the setting never grows.
    const kept = Object.fromEntries(Object.entries(this.state.dismissedGuidance).filter(([, v]) => v === key));
    const dismissedGuidance = { ...kept, [id]: key };
    await this.r.setSetting(SettingKeys.dismissedGuidance, JSON.stringify(dismissedGuidance));
    this.set({ dismissedGuidance });
  }

  async setHaptics(haptics: boolean) {
    await this.r.setSetting(SettingKeys.haptics, haptics ? '1' : '0');
    this.set({ haptics });
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

  setGoalPaused = (id: number, paused: boolean) => this.mutate((r) => r.setGoalPaused(id, paused));

  addDebt = (d: { name: string; remainingMinor: number; annualRatePercent: number; monthlyPaymentMinor: number; dueDay: number | null }) =>
    this.mutate((r) => r.addDebt(d));
  updateDebt = (d: { id: number; name: string; remainingMinor: number; annualRatePercent: number; monthlyPaymentMinor: number; dueDay: number | null }) =>
    this.mutate((r) => r.updateDebt(d));
  deleteDebt = (id: number) => this.mutate((r) => r.deleteDebt(id));
  addDebtPayment = (args: { debtId: number; amountMinor: number; alsoExpense: boolean; note: string }) =>
    this.mutate((r) => r.addDebtPayment({ ...args, date: dayFromDate(this.clock()) }));

  addAsset = (a: { name: string; kind: AssetKind; valueMinor: number; isEstimate: boolean }) =>
    this.mutate((r) => r.addAsset({ ...a, today: dayFromDate(this.clock()) }));
  updateAsset = (a: { id: number; name: string; kind: AssetKind; valueMinor: number; isEstimate: boolean }) =>
    this.mutate((r) => r.updateAsset({ ...a, today: dayFromDate(this.clock()) }));
  deleteAsset = (id: number) => this.mutate((r) => r.deleteAsset(id));

  /** Raw tables for a manual export (read-only). */
  exportTables = () => this.r.exportTables();

  /** Permanently deletes the database and returns to first run. */
  async deleteAllData() {
    try {
      await this.repo?.close();
      this.repo = null;
      await this.driver.destroy();
      const today = dayFromDate(this.clock());
      this.set({ currency: DEFAULT_CURRENCY, onboarded: false, locale: 'ar', month: monthOf(today), profile: null });
    } finally {
      // Always reopen, so a failure never leaves a half-closed app.
      await this.init();
    }
  }
}

/** Defensive parse of the dismissed-guidance setting (string → string map only). */
function parseDismissed(json: string | undefined): Record<string, string> {
  if (!json) return {};
  try {
    const v = JSON.parse(json) as unknown;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'));
  } catch {
    return {};
  }
}
