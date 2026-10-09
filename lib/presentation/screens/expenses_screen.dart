import 'package:flutter/material.dart';

import '../../application/app_scope.dart';
import '../../domain/models.dart';
import '../format.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';
import 'expense_form.dart';

class ExpensesScreen extends StatelessWidget {
  const ExpensesScreen({super.key});

  Future<void> _delete(BuildContext context, Expense e) async {
    final l = context.l10n;
    final app = AppScope.read(context);
    final ok = await confirmDialog(
      context,
      title: l.deleteExpenseConfirm,
      confirmLabel: l.delete,
      destructive: true,
    );
    if (ok && context.mounted) {
      await runGuarded(
        context,
        () => app.deleteExpense(e.id),
        successMessage: l.deleted,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(l.expenses)),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: null,
        key: const Key('expenses.add'),
        onPressed: () => showExpenseForm(context),
        icon: const Icon(Icons.add),
        label: Text(l.addExpense),
      ),
      body: Column(
        children: [
          const MonthSwitcher(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
            child: TotalRow(
              label: l.expenses,
              value: context.money(app.expenseTotal),
            ),
          ),
          const SizedBox(height: Space.sm),
          Expanded(
            child: app.expenses.isEmpty
                ? EmptyState(
                    icon: Icons.receipt_long_outlined,
                    title: l.noExpenses,
                    body: l.noExpensesBody,
                  )
                : ListView.separated(
                    padding: const EdgeInsets.only(bottom: 96),
                    itemCount: app.expenses.length,
                    separatorBuilder: (_, _) => const Divider(
                      indent: Space.gutter,
                      endIndent: Space.gutter,
                    ),
                    itemBuilder: (context, i) {
                      final e = app.expenses[i];
                      final c = app.categoryById(e.categoryId);
                      final name = c == null ? '' : categoryLabel(c, l);
                      return ListTile(
                        key: Key('expense.row.${e.id}'),
                        leading: CircleAvatar(
                          backgroundColor: p.primaryContainer,
                          foregroundColor: p.onPrimaryContainer,
                          child: Icon(
                            c == null
                                ? Icons.category_outlined
                                : categoryIcon(c),
                          ),
                        ),
                        title: Text(name),
                        subtitle: Text(
                          [
                            formatDate(e.date, context.lang),
                            if (e.note.isNotEmpty) e.note,
                          ].join(' · '),
                        ),
                        trailing: Text(
                          context.money(e.amountMinor),
                          style: t.titleSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        onTap: () => showExpenseForm(context, existing: e),
                        onLongPress: () => _delete(context, e),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
