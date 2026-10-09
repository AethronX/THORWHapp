import 'package:flutter/material.dart';

import '../../application/app_scope.dart';
import '../../core/amount_parser.dart';
import '../../core/dates.dart';
import '../../domain/finance/finance_engine.dart' as fe;
import '../../domain/models.dart';
import '../format.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';

class GoalsScreen extends StatelessWidget {
  const GoalsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.goalsTitle)),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: null,
        key: const Key('goals.add'),
        onPressed: () => showGoalForm(context),
        icon: const Icon(Icons.add),
        label: Text(l.addGoal),
      ),
      body: app.goals.isEmpty
          ? EmptyState(
              icon: Icons.flag_outlined,
              title: l.goalsEmpty,
              body: l.goalsEmptyBody,
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(
                Space.gutter,
                0,
                Space.gutter,
                96,
              ),
              itemCount: app.goals.length,
              separatorBuilder: (_, _) => const SizedBox(height: Space.md),
              itemBuilder: (context, i) => _GoalCard(goal: app.goals[i]),
            ),
    );
  }
}

class _GoalCard extends StatelessWidget {
  const _GoalCard({required this.goal});

  final SavingsGoal goal;

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    final overdue = !goal.isReached && goal.targetDate.isBefore(app.today);
    final months = monthsUntil(app.today, goal.targetDate);
    final required = fe.requiredMonthlySaving(
      targetMinor: goal.targetMinor,
      savedMinor: goal.savedMinor,
      months: months,
    );
    final status = goal.isReached
        ? l.goalReached
        : overdue
        ? l.goalOverdue
        : l.monthsLeft(months);
    return SectionCard(
      key: Key('goal.card.${goal.id}'),
      title: goal.name,
      action: IconButton(
        tooltip: l.edit,
        icon: const Icon(Icons.edit_outlined),
        onPressed: () => showGoalForm(context, existing: goal),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          LabeledProgress(
            value: fe.goalProgress(
              savedMinor: goal.savedMinor,
              targetMinor: goal.targetMinor,
            ),
            label: l.goalSaved(
              context.money(goal.savedMinor),
              context.money(goal.targetMinor),
            ),
            trailing: formatPercent(
              fe.goalProgress(
                savedMinor: goal.savedMinor,
                targetMinor: goal.targetMinor,
              ),
            ),
          ),
          const SizedBox(height: Space.sm),
          Row(
            children: [
              Icon(
                goal.isReached
                    ? Icons.check_circle_outline
                    : overdue
                    ? Icons.warning_amber_rounded
                    : Icons.event_outlined,
                size: 18,
                color: goal.isReached
                    ? p.positive
                    : overdue
                    ? p.warning
                    : p.onSurfaceMuted,
              ),
              const SizedBox(width: Space.xs),
              Expanded(
                child: Text(
                  '${l.goalDue(formatDate(goal.targetDate, context.lang))} · $status',
                  style: t.bodySmall?.copyWith(color: p.onSurfaceMuted),
                ),
              ),
            ],
          ),
          if (!goal.isReached && !overdue) ...[
            const SizedBox(height: Space.sm),
            Text(
              l.goalRequiredMonthly(context.money(required)),
              style: t.bodyMedium?.copyWith(fontWeight: FontWeight.w500),
            ),
          ],
          const SizedBox(height: Space.md),
          Row(
            children: [
              Expanded(
                child: FilledButton.tonalIcon(
                  key: Key('goal.add.${goal.id}'),
                  onPressed: () => _contribute(context, goal, withdraw: false),
                  icon: const Icon(Icons.add),
                  label: Text(l.addMoney),
                ),
              ),
              const SizedBox(width: Space.sm),
              if (goal.savedMinor > 0)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _contribute(context, goal, withdraw: true),
                    icon: const Icon(Icons.remove),
                    label: Text(l.withdraw),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

Future<void> _contribute(
  BuildContext context,
  SavingsGoal goal, {
  required bool withdraw,
}) async {
  final app = AppScope.read(context);
  final l = context.l10n;
  final form = GlobalKey<FormState>();
  final ctrl = TextEditingController();
  await showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(withdraw ? l.withdraw : l.addMoney),
      content: Form(
        key: form,
        child: AmountField(
          fieldKey: const Key('contribution.amount'),
          controller: ctrl,
          label: l.contributionAmount,
          autofocus: true,
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.cancel)),
        FilledButton(
          key: const Key('contribution.save'),
          onPressed: () async {
            if (!form.currentState!.validate()) return;
            final minor = parseAmount(ctrl.text, app.currency).minor!;
            if (withdraw && minor > goal.savedMinor) {
              ScaffoldMessenger.of(context)
                  .showSnackBar(SnackBar(content: Text(l.errWithdrawTooMuch)));
              return;
            }
            Navigator.pop(ctx);
            await runGuarded(
              context,
              () => app.addContribution(goal.id, withdraw ? -minor : minor),
            );
          },
          child: Text(l.save),
        ),
      ],
    ),
  );
}

Future<void> showGoalForm(BuildContext context, {SavingsGoal? existing}) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => _GoalForm(existing: existing),
    );

class _GoalForm extends StatefulWidget {
  const _GoalForm({this.existing});

  final SavingsGoal? existing;

  @override
  State<_GoalForm> createState() => _GoalFormState();
}

class _GoalFormState extends State<_GoalForm> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _target;
  final _saved = TextEditingController();
  late DateTime _date;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final app = AppScope.read(context);
    final g = widget.existing;
    _name = TextEditingController(text: g?.name ?? '');
    _target = TextEditingController(
      text: g == null ? '' : minorToEditable(g.targetMinor, app.currency),
    );
    final t = app.today;
    _date = g?.targetDate ?? DateTime(t.year + 1, t.month, 1);
  }

  @override
  void dispose() {
    _name.dispose();
    _target.dispose();
    _saved.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final app = AppScope.read(context);
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: widget.existing == null ? app.today : DateTime(2000),
      lastDate: DateTime(app.today.year + 50),
    );
    if (picked != null) setState(() => _date = dateOnly(picked));
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final app = AppScope.read(context);
    final target = parseAmount(_target.text, app.currency).minor!;
    final savedText = _saved.text.trim();
    final saved = savedText.isEmpty
        ? 0
        : parseAmount(savedText, app.currency, allowZero: true).minor!;
    setState(() => _busy = true);
    final g = widget.existing;
    final ok = await runGuarded(
      context,
      () => g == null
          ? app.addGoal(
              name: _name.text,
              targetMinor: target,
              targetDate: _date,
              initialSavedMinor: saved,
            )
          : app.updateGoal(
              id: g.id,
              name: _name.text,
              targetMinor: target,
              targetDate: _date,
            ),
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (ok) Navigator.of(context).pop();
  }

  Future<void> _delete() async {
    final l = context.l10n;
    final app = AppScope.read(context);
    final nav = Navigator.of(context);
    final ok = await confirmDialog(
      context,
      title: l.deleteGoalConfirm,
      confirmLabel: l.delete,
      destructive: true,
    );
    if (!ok || !mounted) return;
    final done = await runGuarded(
      context,
      () => app.deleteGoal(widget.existing!.id),
      successMessage: l.deleted,
    );
    if (done) nav.pop();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AppTokens.of(context);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          Space.gutter,
          0,
          Space.gutter,
          Space.xl,
        ),
        child: Form(
          key: _form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                widget.existing == null ? l.addGoal : l.editGoal,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: Space.lg),
              TextFormField(
                key: const Key('goal.name'),
                controller: _name,
                maxLength: 40,
                decoration: InputDecoration(
                  labelText: l.goalName,
                  hintText: l.goalNameHint,
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? l.errNameEmpty : null,
              ),
              const SizedBox(height: Space.sm),
              AmountField(
                fieldKey: const Key('goal.target'),
                controller: _target,
                label: l.goalTarget,
              ),
              if (widget.existing == null) ...[
                const SizedBox(height: Space.lg),
                AmountField(
                  fieldKey: const Key('goal.saved'),
                  controller: _saved,
                  label: l.goalAlreadySaved,
                  allowEmpty: true,
                  allowZero: true,
                ),
              ],
              const SizedBox(height: Space.sm),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.event_outlined),
                title: Text(l.goalTargetDate),
                subtitle: Text(formatDate(_date, context.lang)),
                trailing: const Icon(Icons.edit_calendar_outlined),
                onTap: _pickDate,
              ),
              const SizedBox(height: Space.md),
              FilledButton(
                key: const Key('goal.save'),
                onPressed: _busy ? null : _save,
                child: Text(l.save),
              ),
              if (widget.existing != null) ...[
                const SizedBox(height: Space.sm),
                TextButton.icon(
                  style: TextButton.styleFrom(foregroundColor: p.negative),
                  onPressed: _busy ? null : _delete,
                  icon: const Icon(Icons.delete_outline),
                  label: Text(l.delete),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
