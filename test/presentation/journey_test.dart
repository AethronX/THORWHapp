import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tharwati/application/app_controller.dart';
import 'package:tharwati/l10n/app_localizations.dart';

import '../helpers.dart';

/// End-to-end journey through the real widgets, controller, repository and a
/// real SQLite file (FFI, no isolate so it works under the test clock).
///
/// Covers the MVP acceptance journey in TESTING.md: open -> currency ->
/// income -> expense -> budget -> goal -> scenario -> restart -> data intact
/// -> edit -> delete -> delete all.
void main() {
  final ar = lookupAppLocalizations(const Locale('ar'));
  final db = TestDb();

  setUp(db.create);
  tearDown(db.delete);

  Future<AppController> launch(WidgetTester tester) => launchApp(tester, db);
  Future<void> close(WidgetTester tester, AppController c) =>
      closeApp(tester, c);

  String summaryNet(WidgetTester tester) => tester
      .getSemantics(find.byKey(const Key('summary.net')))
      .getSemanticsData()
      .value;

  testWidgets('full MVP journey persists across restart', (tester) async {
    var app = await launch(tester);

    // 1. Arabic onboarding is shown, right-to-left.
    expect(find.text(ar.onbTitle1), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.text(ar.onbTitle1))),
      TextDirection.rtl,
    );

    // 2-3. Skip intro, keep OMR, enter monthly income.
    await tester.tap(find.text(ar.skip));
    await settle(tester);
    await tester.enterText(find.byKey(const Key('setup.income')), '800');
    await tester.tap(find.byKey(const Key('setup.finish')));
    await settle(tester);

    expect(app.onboarded, isTrue);
    expect(app.currency.code, 'OMR');
    expect(app.incomeTotal, 800000);
    expect(summaryNet(tester), contains('800.000'));

    // 4. Add an expense: 12.5 OMR, food.
    await tester.tap(find.byKey(const Key('dashboard.addExpense')));
    await settle(tester);
    await tester.enterText(find.byKey(const Key('expense.amount')), '12.5');
    final foodId = app.categories.firstWhere((c) => c.key == 'food').id;
    await tester.tap(find.byKey(Key('expense.cat.$foodId')));
    await tester.tap(find.byKey(const Key('expense.save')));
    await settle(tester);
    expect(app.expenseTotal, 12500);
    expect(summaryNet(tester), contains('787.500'));

    // Validation: empty amount + no category is refused, nothing saved.
    await tester.tap(find.byKey(const Key('dashboard.addExpense')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('expense.save')));
    await settle(tester);
    expect(find.text(ar.errAmountEmpty), findsOneWidget);
    expect(find.text(ar.errCategoryRequired), findsOneWidget);
    expect(app.expenses, hasLength(1));
    Navigator.of(tester.element(find.byKey(const Key('expense.save')))).pop();
    await settle(tester);

    // 5. Budget below spend -> over-budget insight on the dashboard.
    await tester.tap(find.text(ar.setBudgets));
    await settle(tester);
    await tester.tap(find.byKey(Key('budget.row.$foodId')));
    await settle(tester);
    await tester.enterText(find.byKey(const Key('budget.amount')), '10');
    await tester.tap(find.byKey(const Key('budget.save')));
    await settle(tester);
    expect(app.budgets[foodId], 10000);
    await tester.tap(
      find.byTooltip(
        MaterialLocalizations.of(tester.element(find.byType(AppBar).last))
            .backButtonTooltip,
      ),
    );
    await settle(tester);
    expect(find.textContaining(ar.cat_food), findsWidgets);
    expect(
      find.text(ar.insightOverBudget(ar.cat_food, '‎2.500‎ ر.ع.')),
      findsOneWidget,
    );

    // 6. Create a savings goal.
    await tester.tap(find.byKey(const Key('nav.goals')));
    await settle(tester);
    expect(find.text(ar.goalsEmpty), findsOneWidget);
    await tester.tap(find.byKey(const Key('goals.add')));
    await settle(tester);
    await tester.enterText(find.byKey(const Key('goal.name')), 'سيارة');
    await tester.enterText(find.byKey(const Key('goal.target')), '1200');
    await tester.enterText(find.byKey(const Key('goal.saved')), '200');
    await tester.tap(find.byKey(const Key('goal.save')));
    await settle(tester);
    expect(app.goals.single.savedMinor, 200000);
    expect(find.text('سيارة'), findsOneWidget);
    // Default target date is 1 Oct 2027 -> 12 months -> 1000/12 = 83.334.
    expect(find.text(ar.goalRequiredMonthly('‎83.334‎ ر.ع.')), findsOneWidget);

    // 7. Scenario calculator shows results and the disclaimer.
    await tester.tap(find.byKey(const Key('nav.plan')));
    await settle(tester);
    expect(find.byKey(const Key('calc.result.zero')), findsOneWidget);
    expect(find.byKey(const Key('calc.disclaimer')), findsOneWidget);
    await tester.enterText(find.byKey(const Key('calc.years')), '0');
    await tester.pump();
    expect(find.text(ar.errYearsRange), findsOneWidget);
    expect(find.byKey(const Key('calc.result.zero')), findsNothing);

    // 8-9. "Close" the app and reopen on the same database file.
    await close(tester, app);
    app = await launch(tester);
    expect(app.onboarded, isTrue);
    expect(app.incomeTotal, 800000);
    expect(app.expenses.single.amountMinor, 12500);
    expect(app.budgets[foodId], 10000);
    expect(app.goals.single.name, 'سيارة');
    expect(summaryNet(tester), contains('787.500'));

    // 10. Edit then delete the expense.
    await tester.tap(find.byKey(const Key('nav.expenses')));
    await settle(tester);
    final expenseId = app.expenses.single.id;
    await tester.tap(find.byKey(Key('expense.row.$expenseId')));
    await settle(tester);
    await tester.enterText(find.byKey(const Key('expense.amount')), '20');
    await tester.tap(find.byKey(const Key('expense.save')));
    await settle(tester);
    expect(app.expenses.single.amountMinor, 20000);

    await tester.tap(find.byKey(Key('expense.row.$expenseId')));
    await settle(tester);
    await tester.ensureVisible(find.byKey(const Key('expense.delete')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('expense.delete')));
    await settle(tester);
    await tester.tap(find.text(ar.delete).last); // confirm dialog
    await settle(tester);
    expect(app.expenses, isEmpty);
    expect(find.text(ar.noExpenses), findsOneWidget);

    // 11. Delete all data returns to a clean first run.
    await tester.tap(find.byKey(const Key('nav.settings')));
    await settle(tester);
    await tester.scrollUntilVisible(
      find.byKey(const Key('settings.deleteAll')),
      200,
    );
    await tester.tap(find.byKey(const Key('settings.deleteAll')));
    await settle(tester);
    await tester.tap(find.text(ar.deleteAllConfirmAction));
    await settle(tester);
    expect(app.onboarded, isFalse);
    expect(find.text(ar.onbTitle1), findsOneWidget);
    expect(app.goals, isEmpty);
    expect(app.incomes, isEmpty);
    expect(app.budgets, isEmpty);

    await close(tester, app);
  });

  testWidgets('English locale switches to LTR', (tester) async {
    final app = await launch(tester);
    await tester.tap(find.text(ar.skip));
    await settle(tester);
    await tester.tap(find.byKey(const Key('setup.finish')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('nav.settings')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('settings.lang.en')));
    await settle(tester);
    final en = lookupAppLocalizations(const Locale('en'));
    final title = find.descendant(
      of: find.byType(AppBar),
      matching: find.text(en.settingsTitle),
    );
    expect(title, findsOneWidget);
    expect(Directionality.of(tester.element(title)), TextDirection.ltr);
    await close(tester, app);
  });
}
