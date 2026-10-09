import 'package:flutter_test/flutter_test.dart';
import 'package:tharwati/domain/insights.dart';
import 'package:tharwati/domain/models.dart';

void main() {
  const food = Category(id: 1, key: 'food', iconCode: 1);
  const fun = Category(id: 2, key: 'entertainment', iconCode: 9);
  final today = DateTime(2026, 10, 9);

  List<InsightKind> kinds(List<Insight> xs) => xs.map((i) => i.kind).toList();

  test('no alerts for a healthy month', () {
    final r = buildInsights(
      incomeMinor: 1000000,
      expensesMinor: 400000,
      spends: const [
        CategorySpend(category: food, spentMinor: 100000, limitMinor: 200000),
      ],
      goals: const [],
      today: today,
    );
    expect(r, isEmpty);
  });

  test('negative cash flow is critical and sorted first', () {
    final r = buildInsights(
      incomeMinor: 500000,
      expensesMinor: 600000,
      spends: const [
        CategorySpend(category: food, spentMinor: 170000, limitMinor: 200000),
      ],
      goals: const [],
      today: today,
    );
    expect(kinds(r), [InsightKind.negativeCashFlow, InsightKind.nearBudget]);
    expect(r.first.amountMinor, 100000);
    expect(r.first.severity, InsightSeverity.critical);
  });

  test('no income with expenses is an info, not negative cash flow', () {
    final r = buildInsights(
      incomeMinor: 0,
      expensesMinor: 10,
      spends: const [],
      goals: const [],
      today: today,
    );
    expect(kinds(r), [InsightKind.noIncome]);
  });

  test('over budget reports the overspend; exactly at limit is "near"', () {
    final r = buildInsights(
      incomeMinor: 1000000,
      expensesMinor: 300000,
      spends: const [
        CategorySpend(category: food, spentMinor: 250000, limitMinor: 200000),
        CategorySpend(category: fun, spentMinor: 50000, limitMinor: 50000),
      ],
      goals: const [],
      today: today,
    );
    expect(kinds(r), [InsightKind.overBudget, InsightKind.nearBudget]);
    expect(r[0].amountMinor, 50000);
    expect(r[1].amountMinor, 0);
  });

  test('goal at risk when required monthly exceeds what is left over', () {
    final goal = SavingsGoal(
      id: 1,
      name: 'Car',
      targetMinor: 6000000,
      savedMinor: 0,
      targetDate: DateTime(2027, 10, 9),
    ); // 12 months -> 500/month
    final atRisk = buildInsights(
      incomeMinor: 800000,
      expensesMinor: 400000, // 400 left
      spends: const [],
      goals: [goal],
      today: today,
    );
    expect(kinds(atRisk), [InsightKind.goalAtRisk]);
    expect(atRisk.single.requiredMonthlyMinor, 500000);

    final fine = buildInsights(
      incomeMinor: 1000000,
      expensesMinor: 400000, // 600 left
      spends: const [],
      goals: [goal],
      today: today,
    );
    expect(fine, isEmpty);
  });

  test('overdue and reached goals', () {
    final overdue = SavingsGoal(
      id: 1,
      name: 'Trip',
      targetMinor: 1000,
      savedMinor: 400,
      targetDate: DateTime(2026, 9, 1),
    );
    final reached = SavingsGoal(
      id: 2,
      name: 'Phone',
      targetMinor: 1000,
      savedMinor: 1000,
      targetDate: DateTime(2026, 9, 1),
    );
    final r = buildInsights(
      incomeMinor: 0,
      expensesMinor: 0,
      spends: const [],
      goals: [overdue, reached],
      today: today,
    );
    expect(kinds(r), [InsightKind.goalOverdue]);
    expect(r.single.amountMinor, 600);
  });
}
