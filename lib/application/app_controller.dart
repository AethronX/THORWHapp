import 'package:flutter/material.dart';
import 'package:sqflite/sqflite.dart';

import '../core/currency.dart';
import '../core/dates.dart';
import '../data/database.dart';
import '../data/finance_repository.dart';
import '../domain/finance/finance_engine.dart' as fe;
import '../domain/insights.dart';
import '../domain/models.dart';

enum LoadStatus { loading, ready, error }

/// Application state for the whole app. Screens read derived values from here
/// and call its methods; all money logic is delegated to the domain engine.
class AppController extends ChangeNotifier {
  AppController({
    required this._dbFactory,
    required this._dbPath,
    DateTime Function()? clock,
  }) : _clock = clock ?? DateTime.now {
    month = YearMonth.fromDate(_clock());
    _lastSeenCurrentMonth = month;
  }

  late YearMonth _lastSeenCurrentMonth;
  final DatabaseFactory _dbFactory;
  final String _dbPath;
  final DateTime Function() _clock;
  FinanceRepository? _repo;

  LoadStatus status = LoadStatus.loading;
  Object? loadError;

  Currency currency = Currency.defaultCurrency;
  Locale locale = const Locale('ar');
  ThemeMode themeMode = ThemeMode.system;
  bool onboarded = false;

  late YearMonth month;
  List<Category> categories = const [];
  Map<int, Category> _allCategories = const {};
  List<Expense> expenses = const [];
  List<IncomeEntry> incomes = const [];
  Map<int, int> budgets = const {};
  List<SavingsGoal> goals = const [];
  bool previousMonthHasIncome = false;

  DateTime get today => dateOnly(_clock());

  FinanceRepository get _r {
    final r = _repo;
    if (r == null) throw StateError('Repository not open');
    return r;
  }

  // -- lifecycle ------------------------------------------------------------

  Future<void> init() async {
    status = LoadStatus.loading;
    loadError = null;
    notifyListeners();
    try {
      final db = await openAppDatabase(factory: _dbFactory, path: _dbPath);
      _repo = FinanceRepository(db, clock: _clock);
      await _loadSettings();
      await _reload();
      status = LoadStatus.ready;
    } catch (e) {
      // Never log amounts or user content; the error object is enough.
      loadError = e;
      status = LoadStatus.error;
    }
    notifyListeners();
  }

  Future<void> _loadSettings() async {
    final s = await _r.loadSettings();
    currency = Currency.fromCode(s[SettingKeys.currency]);
    final loc = s[SettingKeys.locale];
    locale = Locale(loc == 'en' ? 'en' : 'ar');
    themeMode = switch (s[SettingKeys.themeMode]) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
    onboarded = s[SettingKeys.onboarded] == '1';
  }

  Future<void> _reload() async {
    final all = await _r.categories(includeArchived: true);
    _allCategories = {for (final c in all) c.id: c};
    categories = all.where((c) => !c.archived).toList();
    expenses = await _r.expensesFor(month);
    incomes = await _r.incomesFor(month);
    budgets = {for (final b in await _r.budgets()) b.categoryId: b.limitMinor};
    goals = await _r.goals();
    previousMonthHasIncome =
        incomes.isEmpty && (await _r.incomesFor(month.previous)).isNotEmpty;
  }

  Future<T> _mutate<T>(Future<T> Function(FinanceRepository r) op) async {
    final result = await op(_r);
    await _reload();
    notifyListeners();
    return result;
  }

  @override
  void dispose() {
    _repo?.close();
    super.dispose();
  }

  // -- derived values -------------------------------------------------------

  Category? categoryById(int id) => _allCategories[id];

  int get incomeTotal => fe.sumMinor(incomes.map((e) => e.amountMinor));
  int get expenseTotal => fe.sumMinor(expenses.map((e) => e.amountMinor));
  int get netCashFlow =>
      fe.netCashFlow(incomeMinor: incomeTotal, expensesMinor: expenseTotal);
  double? get savingsRate =>
      fe.savingsRate(incomeMinor: incomeTotal, expensesMinor: expenseTotal);
  int get totalBudget => fe.sumMinor(budgets.values);

  /// Per-category spend for the month, including budgeted categories with no
  /// spending yet. Sorted by spend, descending.
  List<CategorySpend> get spends {
    final byCat = <int, int>{};
    for (final e in expenses) {
      byCat[e.categoryId] = (byCat[e.categoryId] ?? 0) + e.amountMinor;
    }
    for (final id in budgets.keys) {
      byCat.putIfAbsent(id, () => 0);
    }
    final out = <CategorySpend>[];
    byCat.forEach((id, spent) {
      final c = _allCategories[id];
      if (c == null) return;
      out.add(
        CategorySpend(category: c, spentMinor: spent, limitMinor: budgets[id]),
      );
    });
    out.sort((a, b) => b.spentMinor.compareTo(a.spentMinor));
    return out;
  }

  int get essentialSpend => fe.sumMinor(
    expenses
        .where((e) => _allCategories[e.categoryId]?.isEssential ?? false)
        .map((e) => e.amountMinor),
  );

  List<Insight> get insights => buildInsights(
    incomeMinor: incomeTotal,
    expensesMinor: expenseTotal,
    spends: spends,
    goals: goals,
    today: today,
    assessGoalFeasibility: isCurrentMonth,
  );

  bool get isCurrentMonth => month == YearMonth.fromDate(_clock());

  // -- settings & onboarding ------------------------------------------------

  Future<void> completeOnboarding({
    required Currency currency,
    int? monthlyIncomeMinor,
    String incomeLabel = '',
  }) => _mutate((r) async {
    await r.completeOnboarding(
      currencyCode: currency.code,
      month: month,
      incomeMinor: monthlyIncomeMinor,
      incomeLabel: incomeLabel,
    );
    this.currency = currency;
    onboarded = true;
  });

  Future<void> setLocale(Locale l) async {
    await _r.setSetting(SettingKeys.locale, l.languageCode);
    locale = l;
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode m) async {
    await _r.setSetting(SettingKeys.themeMode, switch (m) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    });
    themeMode = m;
    notifyListeners();
  }

  Future<void> setMonth(YearMonth m) async {
    month = m;
    await _reload();
    notifyListeners();
  }

  // -- mutations ------------------------------------------------------------

  Future<void> addExpense({
    required int amountMinor,
    required int categoryId,
    required DateTime date,
    String note = '',
  }) => _mutate(
    (r) => r.addExpense(
      amountMinor: amountMinor,
      categoryId: categoryId,
      date: date,
      note: note,
    ),
  );

  Future<void> updateExpense(Expense e) => _mutate((r) => r.updateExpense(e));
  Future<void> deleteExpense(int id) => _mutate((r) => r.deleteExpense(id));

  Future<void> addIncome(int amountMinor, {String label = ''}) => _mutate(
    (r) => r.addIncome(month: month, amountMinor: amountMinor, label: label),
  );
  Future<void> updateIncome(IncomeEntry e) => _mutate((r) => r.updateIncome(e));
  Future<void> deleteIncome(int id) => _mutate((r) => r.deleteIncome(id));
  Future<void> copyIncomeFromPreviousMonth() =>
      _mutate((r) => r.copyIncome(from: month.previous, to: month));

  Future<void> setBudget(int categoryId, int? limitMinor) =>
      _mutate((r) => r.setBudget(categoryId, limitMinor));

  Future<int> addCategory(String name) => _mutate((r) => r.addCategory(name));
  Future<void> renameCategory(int id, String name) =>
      _mutate((r) => r.renameCategory(id, name));
  Future<bool> removeCategory(int id) => _mutate((r) => r.removeCategory(id));

  Future<void> addGoal({
    required String name,
    required int targetMinor,
    required DateTime targetDate,
    int initialSavedMinor = 0,
  }) => _mutate(
    (r) => r.addGoal(
      name: name,
      targetMinor: targetMinor,
      targetDate: targetDate,
      initialSavedMinor: initialSavedMinor,
      today: today,
    ),
  );

  Future<void> updateGoal({
    required int id,
    required String name,
    required int targetMinor,
    required DateTime targetDate,
  }) => _mutate(
    (r) => r.updateGoal(
      id: id,
      name: name,
      targetMinor: targetMinor,
      targetDate: targetDate,
    ),
  );

  Future<void> deleteGoal(int id) => _mutate((r) => r.deleteGoal(id));

  Future<void> addContribution(int goalId, int amountMinor) => _mutate(
    (r) => r.addContribution(
      goalId: goalId,
      amountMinor: amountMinor,
      date: today,
    ),
  );

  /// Permanently deletes the local database file and resets to first run.
  /// Irreversible; the UI must confirm before calling.
  Future<void> deleteAllData() async {
    try {
      await _repo?.close();
      _repo = null;
      await _dbFactory.deleteDatabase(_dbPath);
      currency = Currency.defaultCurrency;
      onboarded = false;
      month = YearMonth.fromDate(_clock());
    } finally {
      // Always reopen: on failure the user sees their (still present) data
      // or the error screen, never a half-closed app.
      await init();
    }
  }

  /// Call when the app returns to the foreground. If the calendar month has
  /// changed while the user was looking at the then-current month, follow
  /// it, so new expenses don't default into last month.
  Future<void> onResumed() async {
    final now = YearMonth.fromDate(_clock());
    final previouslyCurrent = _lastSeenCurrentMonth;
    _lastSeenCurrentMonth = now;
    if (status == LoadStatus.ready &&
        now != previouslyCurrent &&
        month == previouslyCurrent) {
      await setMonth(now);
    }
  }
}
