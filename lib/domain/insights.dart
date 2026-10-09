import '../core/dates.dart';
import 'finance/finance_engine.dart';
import 'models.dart';

/// Rule-based, explainable insights ("coach" v0). No AI, no network.
/// Each insight carries structured data; the UI localises the message.
enum InsightKind {
  noIncome,
  negativeCashFlow,
  overBudget,
  nearBudget,
  goalAtRisk,
  goalOverdue,
}

enum InsightSeverity { info, warning, critical }

class Insight {
  const Insight(
    this.kind,
    this.severity, {
    this.category,
    this.goal,
    this.amountMinor,
    this.requiredMonthlyMinor,
  });

  final InsightKind kind;
  final InsightSeverity severity;
  final Category? category;
  final SavingsGoal? goal;

  /// Overspend / shortfall amount where relevant.
  final int? amountMinor;
  final int? requiredMonthlyMinor;
}

/// Share of a budget at which a "near budget" heads-up is shown.
const double nearBudgetThreshold = 0.8;

/// Builds the insight list for one month, most severe first.
///
/// [today] is injected so the rules are deterministic in tests.
List<Insight> buildInsights({
  required int incomeMinor,
  required int expensesMinor,
  required List<CategorySpend> spends,
  required List<SavingsGoal> goals,
  required DateTime today,
  bool assessGoalFeasibility = true,
}) {
  final out = <Insight>[];

  if (incomeMinor == 0 && expensesMinor > 0) {
    out.add(const Insight(InsightKind.noIncome, InsightSeverity.info));
  } else if (expensesMinor > incomeMinor) {
    out.add(
      Insight(
        InsightKind.negativeCashFlow,
        InsightSeverity.critical,
        amountMinor: expensesMinor - incomeMinor,
      ),
    );
  }

  for (final s in spends) {
    final limit = s.limitMinor;
    if (limit == null || limit == 0) continue;
    if (s.spentMinor > limit) {
      out.add(
        Insight(
          InsightKind.overBudget,
          InsightSeverity.warning,
          category: s.category,
          amountMinor: s.spentMinor - limit,
        ),
      );
    } else if (s.spentMinor >= limit * nearBudgetThreshold) {
      out.add(
        Insight(
          InsightKind.nearBudget,
          InsightSeverity.info,
          category: s.category,
          amountMinor: limit - s.spentMinor,
        ),
      );
    }
  }

  final net = incomeMinor - expensesMinor;
  final day = dateOnly(today);
  for (final g in goals) {
    if (g.isReached) continue;
    if (g.targetDate.isBefore(day)) {
      out.add(
        Insight(
          InsightKind.goalOverdue,
          InsightSeverity.warning,
          goal: g,
          amountMinor: g.targetMinor - g.savedMinor,
        ),
      );
      continue;
    }
    final months = monthsUntil(day, g.targetDate);
    final required = requiredMonthlySaving(
      targetMinor: g.targetMinor,
      savedMinor: g.savedMinor,
      months: months,
    );
    // Judged against *this* month's leftover only, and only when the month's
    // income is known; browsing a past month must not flag goals.
    if (assessGoalFeasibility && incomeMinor > 0 && required > net) {
      out.add(
        Insight(
          InsightKind.goalAtRisk,
          InsightSeverity.warning,
          goal: g,
          requiredMonthlyMinor: required,
        ),
      );
    }
  }

  out.sort((a, b) => b.severity.index.compareTo(a.severity.index));
  return out;
}
