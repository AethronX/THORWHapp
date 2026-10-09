import 'package:flutter/material.dart';

import '../../application/app_scope.dart';
import '../../core/dates.dart';
import '../../domain/finance/finance_engine.dart' as fe;
import '../../domain/insights.dart';
import '../../l10n/app_localizations.dart';
import '../format.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';
import 'budgets_screen.dart';
import 'expense_form.dart';
import 'income_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key, required this.onOpenGoals});

  final VoidCallback onOpenGoals;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    final insights = app.insights;
    return Scaffold(
      appBar: AppBar(title: Text(l.appTitle)),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: null,
        key: const Key('dashboard.addExpense'),
        onPressed: () => showExpenseForm(context),
        icon: const Icon(Icons.add),
        label: Text(l.addExpense),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(Space.gutter, 0, Space.gutter, 96),
        children: [
          const MonthSwitcher(),
          const SizedBox(height: Space.sm),
          const _SummaryCard(),
          const SizedBox(height: Space.lg),
          if (app.incomes.isEmpty) ...[
            const _NoIncomeCard(),
            const SizedBox(height: Space.lg),
          ],
          SectionCard(
            title: l.insightsTitle,
            child: insights.isEmpty
                ? Row(
                    children: [
                      Icon(
                        Icons.check_circle_outline,
                        color: AppTokens.of(context).positive,
                      ),
                      const SizedBox(width: Space.sm),
                      Expanded(child: Text(l.allGood)),
                    ],
                  )
                : Column(
                    children: [
                      for (final i in insights.take(4)) _InsightTile(i),
                    ],
                  ),
          ),
          const SizedBox(height: Space.lg),
          const _BudgetsCard(),
          const SizedBox(height: Space.lg),
          _GoalsCard(onOpenGoals: onOpenGoals),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard();

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    final net = app.netCashFlow;
    final rate = app.savingsRate;
    return Card(
      color: p.primary,
      child: Padding(
        padding: const EdgeInsets.all(Space.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l.net, style: t.titleSmall?.copyWith(color: p.onPrimary)),
            const SizedBox(height: Space.xs),
            Semantics(
              key: const Key('summary.net'),
              label: l.net,
              value: context.money(net),
              child: ExcludeSemantics(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: AlignmentDirectional.centerStart,
                  child: Text(
                    context.money(net),
                    style: t.headlineMedium?.copyWith(color: p.onPrimary),
                  ),
                ),
              ),
            ),
            const SizedBox(height: Space.lg),
            Row(
              children: [
                Expanded(
                  child: _Metric(
                    label: l.income,
                    value: context.money(app.incomeTotal),
                    icon: Icons.south_west,
                  ),
                ),
                Expanded(
                  child: _Metric(
                    label: l.expenses,
                    value: context.money(app.expenseTotal),
                    icon: Icons.north_east,
                  ),
                ),
              ],
            ),
            const SizedBox(height: Space.md),
            _Metric(
              label: l.savingsRate,
              value: rate == null ? l.notAvailable : formatPercent(rate),
              icon: Icons.savings_outlined,
            ),
          ],
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    return MergeSemantics(
      child: Row(
        children: [
          ExcludeSemantics(child: Icon(icon, size: 18, color: p.onPrimary)),
          const SizedBox(width: Space.xs),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: t.bodySmall?.copyWith(color: p.onPrimary)),
                Text(
                  value,
                  style: t.titleSmall?.copyWith(
                    color: p.onPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NoIncomeCard extends StatelessWidget {
  const _NoIncomeCard();

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    return SectionCard(
      title: l.income,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.noIncomeYet),
          const SizedBox(height: Space.md),
          Wrap(
            spacing: Space.sm,
            runSpacing: Space.sm,
            children: [
              if (app.previousMonthHasIncome)
                FilledButton.tonal(
                  key: const Key('dashboard.copyIncome'),
                  onPressed: () =>
                      runGuarded(context, app.copyIncomeFromPreviousMonth),
                  child: Text(l.copyLastMonthIncome),
                ),
              OutlinedButton(
                key: const Key('dashboard.addIncome'),
                onPressed: () => Navigator.of(
                  context,
                ).push(MaterialPageRoute(builder: (_) => const IncomeScreen())),
                child: Text(l.addIncome),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _InsightTile extends StatelessWidget {
  const _InsightTile(this.insight);

  final Insight insight;

  String _message(BuildContext context, AppLocalizations l) {
    final i = insight;
    final amount = i.amountMinor == null ? '' : context.money(i.amountMinor!);
    final cat = i.category == null ? '' : categoryLabel(i.category!, l);
    return switch (i.kind) {
      InsightKind.noIncome => l.insightNoIncome,
      InsightKind.negativeCashFlow => l.insightNegativeCashFlow(amount),
      InsightKind.overBudget => l.insightOverBudget(cat, amount),
      InsightKind.nearBudget => l.insightNearBudget(cat, amount),
      InsightKind.goalAtRisk => l.insightGoalAtRisk(
        i.goal!.name,
        context.money(i.requiredMonthlyMinor ?? 0),
      ),
      InsightKind.goalOverdue => l.insightGoalOverdue(i.goal!.name, amount),
    };
  }

  @override
  Widget build(BuildContext context) {
    final p = AppTokens.of(context);
    final (icon, color) = switch (insight.severity) {
      InsightSeverity.critical => (Icons.error_outline, p.negative),
      InsightSeverity.warning => (Icons.warning_amber_rounded, p.warning),
      InsightSeverity.info => (Icons.info_outline, p.primary),
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Space.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(width: Space.sm),
          Expanded(child: Text(_message(context, context.l10n))),
        ],
      ),
    );
  }
}

class _BudgetsCard extends StatelessWidget {
  const _BudgetsCard();

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    final budgeted = app.spends.where((s) => s.limitMinor != null).toList();
    return SectionCard(
      title: l.budgetsTitle,
      action: TextButton(
        onPressed: () =>
            Navigator.of(context)
                .push(MaterialPageRoute(builder: (_) => const BudgetsScreen())),
        child: Text(l.setBudgets),
      ),
      child: budgeted.isEmpty
          ? Text(l.noBudgets)
          : Column(
              children: [
                for (final s in budgeted)
                  Padding(
                    padding: const EdgeInsets.only(bottom: Space.md),
                    child: LabeledProgress(
                      value: s.usage ?? 0,
                      invertWarning: true,
                      label: categoryLabel(s.category, l),
                      trailing: s.spentMinor > s.limitMinor!
                          ? l.overBy(
                              context.money(s.spentMinor - s.limitMinor!),
                            )
                          : l.budgetUsage(
                              context.money(s.spentMinor),
                              context.money(s.limitMinor!),
                            ),
                    ),
                  ),
              ],
            ),
    );
  }
}

class _GoalsCard extends StatelessWidget {
  const _GoalsCard({required this.onOpenGoals});

  final VoidCallback onOpenGoals;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    return SectionCard(
      title: l.goalsTitle,
      action: TextButton(onPressed: onOpenGoals, child: Text(l.seeAll)),
      child: app.goals.isEmpty
          ? Text(l.noGoalsShort)
          : Column(
              children: [
                for (final g in app.goals.take(3))
                  Padding(
                    padding: const EdgeInsets.only(bottom: Space.md),
                    child: LabeledProgress(
                      value: fe.goalProgress(
                        savedMinor: g.savedMinor,
                        targetMinor: g.targetMinor,
                      ),
                      label: g.name,
                      trailing: g.isReached
                          ? l.goalReached
                          : g.targetDate.isBefore(app.today)
                          ? l.goalOverdue
                          : l.monthsLeft(monthsUntil(app.today, g.targetDate)),
                    ),
                  ),
              ],
            ),
    );
  }
}
