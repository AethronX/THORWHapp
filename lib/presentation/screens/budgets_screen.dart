import 'package:flutter/material.dart';

import '../../application/app_scope.dart';
import '../../core/amount_parser.dart';
import '../../domain/models.dart';
import '../format.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';

/// Per-category monthly limits (they repeat every month).
class BudgetsScreen extends StatelessWidget {
  const BudgetsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    final spentBy = {for (final s in app.spends) s.category.id: s.spentMinor};
    return Scaffold(
      appBar: AppBar(title: Text(l.budgetsScreenTitle)),
      body: ListView(
        padding: const EdgeInsets.only(bottom: Space.xxl),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              Space.gutter,
              0,
              Space.gutter,
              Space.md,
            ),
            child: Text(
              l.budgetsScreenHint,
              style: t.bodyMedium?.copyWith(color: p.onSurfaceMuted),
            ),
          ),
          if (app.budgets.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
              child: TotalRow(
                label: l.monthlyLimit,
                value: context.money(app.totalBudget),
              ),
            ),
          for (final c in app.categories)
            ListTile(
              key: Key('budget.row.${c.id}'),
              leading: Icon(categoryIcon(c)),
              title: Text(categoryLabel(c, l)),
              subtitle: app.budgets[c.id] == null
                  ? null
                  : Text(
                      l.budgetUsage(
                        context.money(spentBy[c.id] ?? 0),
                        context.money(app.budgets[c.id]!),
                      ),
                    ),
              trailing: Text(
                app.budgets[c.id] == null
                    ? l.noLimit
                    : context.money(app.budgets[c.id]!),
                style: app.budgets[c.id] == null
                    ? t.bodyMedium?.copyWith(color: p.onSurfaceMuted)
                    : t.titleSmall,
              ),
              onTap: () => _editLimit(context, c),
            ),
        ],
      ),
    );
  }
}

Future<void> _editLimit(BuildContext context, Category c) async {
  final app = AppScope.read(context);
  final l = context.l10n;
  final form = GlobalKey<FormState>();
  final current = app.budgets[c.id];
  final ctrl = TextEditingController(
    text: current == null ? '' : minorToEditable(current, app.currency),
  );
  await showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(categoryLabel(c, l)),
      content: Form(
        key: form,
        child: AmountField(
          fieldKey: const Key('budget.amount'),
          controller: ctrl,
          label: l.monthlyLimit,
          autofocus: true,
          allowEmpty: true,
        ),
      ),
      actions: [
        if (current != null)
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await runGuarded(context, () => app.setBudget(c.id, null));
            },
            child: Text(l.clearLimit),
          ),
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.cancel)),
        FilledButton(
          key: const Key('budget.save'),
          onPressed: () async {
            if (!form.currentState!.validate()) return;
            final text = ctrl.text.trim();
            final minor = text.isEmpty
                ? null
                : parseAmount(text, app.currency).minor;
            Navigator.pop(ctx);
            await runGuarded(context, () => app.setBudget(c.id, minor));
          },
          child: Text(l.save),
        ),
      ],
    ),
  );
}
