import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:tharwati/application/app_controller.dart';
import 'package:tharwati/core/currency.dart';
import 'package:tharwati/core/dates.dart';
import 'package:tharwati/data/database.dart';
import 'package:tharwati/domain/insights.dart';

void main() {
  sqfliteFfiInit();
  late Directory tmp;
  late DateTime now;
  late AppController app;

  setUp(() async {
    tmp = await Directory.systemTemp.createTemp('tharwati_ctrl');
    now = DateTime(2026, 10, 31, 23, 50);
    app = AppController(
      dbFactory: databaseFactoryFfi,
      dbPath: p.join(tmp.path, databaseFileName),
      clock: () => now,
    );
    await app.init();
  });

  tearDown(() async {
    app.dispose();
    await tmp.delete(recursive: true);
  });

  test('onboarding stores currency, income and flag together', () async {
    await app.completeOnboarding(
      currency: Currency.usd,
      monthlyIncomeMinor: 150000,
      incomeLabel: 'Salary',
    );
    expect(app.currency, Currency.usd);
    expect(app.onboarded, isTrue);
    expect(app.incomeTotal, 150000);
    // Running it again (e.g. after an interruption) never duplicates income.
    await app.completeOnboarding(
      currency: Currency.usd,
      monthlyIncomeMinor: 150000,
    );
    expect(app.incomes, hasLength(1));
  });

  test(
    'resuming in a new month follows it if viewing the current month',
    () async {
      await app.completeOnboarding(currency: Currency.omr);
      expect(app.month, const YearMonth(2026, 10));
      now = DateTime(2026, 11, 1, 8);
      await app.onResumed();
      expect(app.month, const YearMonth(2026, 11));
      expect(app.isCurrentMonth, isTrue);
    },
  );

  test('resuming does not move a user who is browsing a past month', () async {
    await app.completeOnboarding(currency: Currency.omr);
    await app.setMonth(const YearMonth(2026, 8));
    now = DateTime(2026, 11, 1, 8);
    await app.onResumed();
    expect(app.month, const YearMonth(2026, 8));
  });

  test('past months do not raise "goal at risk"', () async {
    await app.completeOnboarding(currency: Currency.omr);
    await app.addGoal(
      name: 'Car',
      targetMinor: 6000000,
      targetDate: DateTime(2027, 10, 1),
    );
    final food = app.categories.firstWhere((c) => c.key == 'food').id;
    await app.setMonth(const YearMonth(2026, 9));
    await app.addIncome(100000);
    await app.addExpense(
      amountMinor: 90000,
      categoryId: food,
      date: DateTime(2026, 9, 3),
    );
    expect(
      app.insights.map((i) => i.kind),
      isNot(contains(InsightKind.goalAtRisk)),
    );
    await app.setMonth(const YearMonth(2026, 10));
    await app.addIncome(100000);
    expect(app.insights.map((i) => i.kind), contains(InsightKind.goalAtRisk));
  });

  test('delete all resets to first run and leaves a working app', () async {
    await app.completeOnboarding(
      currency: Currency.kwd,
      monthlyIncomeMinor: 1000,
    );
    await app.deleteAllData();
    expect(app.status, LoadStatus.ready);
    expect(app.onboarded, isFalse);
    expect(app.currency, Currency.defaultCurrency);
    expect(app.incomes, isEmpty);
    await app.completeOnboarding(currency: Currency.omr);
    expect(app.onboarded, isTrue);
  });
}
