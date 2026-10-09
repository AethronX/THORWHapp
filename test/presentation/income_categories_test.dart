import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tharwati/application/app_controller.dart';
import 'package:tharwati/l10n/app_localizations.dart';

import '../helpers.dart';

void main() {
  final ar = lookupAppLocalizations(const Locale('ar'));
  final db = TestDb();
  setUp(db.create);
  tearDown(db.delete);

  Future<void> run(WidgetTester tester, Future<void> Function() f) async {
    final fut = f();
    await settle(tester);
    await fut;
  }

  Future<AppController> onboarded(WidgetTester tester) async {
    final app = await launchApp(tester, db);
    await run(tester, () => app.completeOnboarding(currency: app.currency));
    return app;
  }

  testWidgets('income: add, edit, delete, copy from last month', (
    tester,
  ) async {
    final app = await onboarded(tester);

    // Dashboard offers to add income when the month has none.
    await tester.tap(find.byKey(const Key('dashboard.addIncome')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('income.add')));
    await settle(tester);
    // Label is pre-filled with "Salary" for the first entry.
    expect(find.text(ar.salaryLabel), findsOneWidget);
    await tester.enterText(find.byKey(const Key('income.amount')), '1.2345');
    await tester.tap(find.byKey(const Key('income.save')));
    await settle(tester);
    expect(find.text(ar.errAmountDecimals(3)), findsOneWidget);
    await tester.enterText(find.byKey(const Key('income.amount')), '950.5');
    await tester.tap(find.byKey(const Key('income.save')));
    await settle(tester);
    expect(app.incomeTotal, 950500);

    // Edit.
    await tester.tap(find.text(ar.salaryLabel));
    await settle(tester);
    await tester.enterText(find.byKey(const Key('income.amount')), '1000');
    await tester.tap(find.byKey(const Key('income.save')));
    await settle(tester);
    expect(app.incomes.single.amountMinor, 1000000);

    // Next month starts empty and offers last month's income.
    await run(tester, () => app.setMonth(app.month.next));
    expect(app.incomes, isEmpty);
    expect(app.previousMonthHasIncome, isTrue);
    await tester.tap(find.text(ar.copyLastMonthIncome));
    await settle(tester);
    expect(app.incomeTotal, 1000000);
    expect(app.previousMonthHasIncome, isFalse);

    // Delete in the current view.
    await tester.tap(find.text(ar.salaryLabel));
    await settle(tester);
    await tester.tap(find.text(ar.delete));
    await settle(tester);
    // Destructive action asks for confirmation first.
    expect(find.text(ar.deleteIncomeConfirm), findsOneWidget);
    expect(app.incomes, hasLength(1));
    await tester.tap(find.text(ar.delete).last);
    await settle(tester);
    expect(app.incomes, isEmpty);

    await closeApp(tester, app);
  });

  testWidgets('categories: add, rename, delete unused, archive used', (
    tester,
  ) async {
    final app = await onboarded(tester);
    await tester.tap(find.byKey(const Key('nav.settings')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('settings.categories')));
    await settle(tester);

    // Blank name is rejected.
    await tester.tap(find.byKey(const Key('categories.add')));
    await settle(tester);
    await tester.tap(find.byKey(const Key('category.save')));
    await settle(tester);
    expect(find.text(ar.errNameEmpty), findsOneWidget);
    await tester.enterText(find.byKey(const Key('category.name')), 'قهوة');
    await tester.tap(find.byKey(const Key('category.save')));
    await settle(tester);
    final coffee = app.categories.firstWhere((c) => c.name == 'قهوة');

    // Rename a built-in category.
    final food = app.categories.firstWhere((c) => c.key == 'food');
    await tester.tap(
      find.descendant(
        of: find.widgetWithText(ListTile, ar.cat_food),
        matching: find.byTooltip(ar.rename),
      ),
    );
    await settle(tester);
    await tester.enterText(find.byKey(const Key('category.name')), 'البقالة');
    await tester.tap(find.byKey(const Key('category.save')));
    await settle(tester);
    expect(app.categories.firstWhere((c) => c.id == food.id).name, 'البقالة');

    // A used category is archived (history kept), not deleted.
    await run(
      tester,
      () => app.addExpense(
        amountMinor: 1500,
        categoryId: coffee.id,
        date: testClock,
      ),
    );
    await tester.tap(
      find.descendant(
        of: find.widgetWithText(ListTile, 'قهوة'),
        matching: find.byTooltip(ar.delete),
      ),
    );
    await settle(tester);
    await tester.tap(find.text(ar.delete).last);
    await settle(tester);
    expect(find.text(ar.categoryArchivedNote), findsOneWidget);
    expect(app.categories.any((c) => c.id == coffee.id), isFalse);
    expect(app.categoryById(coffee.id)?.archived, isTrue);
    expect(app.expenses.single.categoryId, coffee.id);

    await closeApp(tester, app);
  });
}
