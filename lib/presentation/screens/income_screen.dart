import 'package:flutter/material.dart';

import '../../application/app_scope.dart';
import '../../core/amount_parser.dart';
import '../../domain/models.dart';
import '../format.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';

/// Income lines for the month being viewed.
class IncomeScreen extends StatelessWidget {
  const IncomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(l.incomeTitle)),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: null,
        key: const Key('income.add'),
        onPressed: () => _showIncomeDialog(context),
        icon: const Icon(Icons.add),
        label: Text(l.addIncome),
      ),
      body: Column(
        children: [
          const MonthSwitcher(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
            child: TotalRow(
              label: l.incomeTotal,
              value: context.money(app.incomeTotal),
            ),
          ),
          Expanded(
            child: app.incomes.isEmpty
                ? EmptyState(
                    icon: Icons.account_balance_wallet_outlined,
                    title: l.noIncomeYet,
                    action: app.previousMonthHasIncome
                        ? FilledButton.tonal(
                            onPressed: () => runGuarded(
                              context,
                              app.copyIncomeFromPreviousMonth,
                            ),
                            child: Text(l.copyLastMonthIncome),
                          )
                        : null,
                  )
                : ListView(
                    padding: const EdgeInsets.only(bottom: 96),
                    children: [
                      for (final i in app.incomes)
                        ListTile(
                          leading: const Icon(Icons.payments_outlined),
                          title: Text(i.label.isEmpty ? l.income : i.label),
                          trailing: Text(
                            context.money(i.amountMinor),
                            style: t.titleSmall,
                          ),
                          onTap: () => _showIncomeDialog(context, existing: i),
                        ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}

Future<void> _showIncomeDialog(
  BuildContext context, {
  IncomeEntry? existing,
}) async {
  final app = AppScope.read(context);
  final l = context.l10n;
  final form = GlobalKey<FormState>();
  final amount = TextEditingController(
    text: existing == null
        ? ''
        : minorToEditable(existing.amountMinor, app.currency),
  );
  final label = TextEditingController(
    text: existing?.label ?? (app.incomes.isEmpty ? l.salaryLabel : ''),
  );

  await showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(existing == null ? l.addIncome : l.editIncome),
      content: Form(
        key: form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AmountField(
              fieldKey: const Key('income.amount'),
              controller: amount,
              label: l.amount,
              autofocus: true,
            ),
            const SizedBox(height: Space.md),
            TextFormField(
              controller: label,
              maxLength: 40,
              decoration: InputDecoration(
                labelText: l.incomeLabel,
                hintText: l.incomeLabelHint,
              ),
            ),
          ],
        ),
      ),
      actions: [
        if (existing != null)
          TextButton(
            style: TextButton.styleFrom(
              foregroundColor: AppTokens.of(ctx).negative,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await confirmDialog(
                context,
                title: l.deleteIncomeConfirm,
                confirmLabel: l.delete,
                destructive: true,
              );
              if (!ok || !context.mounted) return;
              await runGuarded(
                context,
                () => app.deleteIncome(existing.id),
                successMessage: l.deleted,
              );
            },
            child: Text(l.delete),
          ),
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.cancel)),
        FilledButton(
          key: const Key('income.save'),
          onPressed: () async {
            if (!form.currentState!.validate()) return;
            final minor = parseAmount(amount.text, app.currency).minor!;
            Navigator.pop(ctx);
            await runGuarded(
              context,
              () => existing == null
                  ? app.addIncome(minor, label: label.text)
                  : app.updateIncome(
                      IncomeEntry(
                        id: existing.id,
                        month: existing.month,
                        amountMinor: minor,
                        label: label.text,
                      ),
                    ),
            );
          },
          child: Text(l.save),
        ),
      ],
    ),
  );
}
