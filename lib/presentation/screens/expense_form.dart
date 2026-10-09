import 'package:flutter/material.dart';

import '../../application/app_scope.dart';
import '../../core/amount_parser.dart';
import '../../core/dates.dart';
import '../../domain/models.dart';
import '../format.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';

/// Opens the add/edit expense sheet. Designed for speed: amount is focused,
/// category is one tap, date defaults to today (or the viewed month).
Future<void> showExpenseForm(BuildContext context, {Expense? existing}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => ExpenseForm(existing: existing),
  );
}

class ExpenseForm extends StatefulWidget {
  const ExpenseForm({super.key, this.existing});

  final Expense? existing;

  @override
  State<ExpenseForm> createState() => _ExpenseFormState();
}

class _ExpenseFormState extends State<ExpenseForm> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _amount;
  late final TextEditingController _note;
  int? _categoryId;
  late DateTime _date;
  bool _busy = false;
  bool _showCategoryError = false;

  @override
  void initState() {
    super.initState();
    final app = AppScope.read(context);
    final e = widget.existing;
    _amount = TextEditingController(
      text: e == null ? '' : minorToEditable(e.amountMinor, app.currency),
    );
    _note = TextEditingController(text: e?.note ?? '');
    _categoryId = e?.categoryId;
    // Default date: today when viewing the current month, else the 1st of
    // the viewed month so the expense lands where the user is looking.
    _date = e?.date ?? (app.isCurrentMonth ? app.today : app.month.firstDay);
  }

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final app = AppScope.read(context);
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      // No future dates: they would be invisible until that month arrives.
      lastDate: app.today,
    );
    if (picked != null) setState(() => _date = dateOnly(picked));
  }

  Future<void> _save() async {
    final valid = _form.currentState!.validate();
    setState(() => _showCategoryError = _categoryId == null);
    if (!valid || _categoryId == null) return;
    final app = AppScope.read(context);
    final minor = parseAmount(_amount.text, app.currency).minor!;
    setState(() => _busy = true);
    final e = widget.existing;
    final ok = await runGuarded(
      context,
      () => e == null
          ? app.addExpense(
              amountMinor: minor,
              categoryId: _categoryId!,
              date: _date,
              note: _note.text,
            )
          : app.updateExpense(
              Expense(
                id: e.id,
                amountMinor: minor,
                categoryId: _categoryId!,
                date: _date,
                note: _note.text,
              ),
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
      title: l.deleteExpenseConfirm,
      confirmLabel: l.delete,
      destructive: true,
    );
    if (!ok || !mounted) return;
    final done = await runGuarded(
      context,
      () => app.deleteExpense(widget.existing!.id),
      successMessage: l.deleted,
    );
    if (done) nav.pop();
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    // Include the existing (possibly archived) category so edits keep it.
    final cats = [
      ...app.categories,
      if (_categoryId != null &&
          !app.categories.any((c) => c.id == _categoryId) &&
          app.categoryById(_categoryId!) != null)
        app.categoryById(_categoryId!)!,
    ];
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
                widget.existing == null ? l.addExpense : l.editExpense,
                style: t.titleLarge,
              ),
              const SizedBox(height: Space.lg),
              AmountField(
                fieldKey: const Key('expense.amount'),
                controller: _amount,
                label: l.amount,
                autofocus: widget.existing == null,
              ),
              const SizedBox(height: Space.lg),
              Text(l.category, style: t.titleSmall),
              const SizedBox(height: Space.sm),
              Wrap(
                spacing: Space.sm,
                runSpacing: Space.sm,
                children: [
                  for (final c in cats)
                    ChoiceChip(
                      key: Key('expense.cat.${c.id}'),
                      avatar: Icon(categoryIcon(c), size: 18),
                      label: Text(categoryLabel(c, l)),
                      selected: _categoryId == c.id,
                      onSelected: (_) => setState(() {
                        _categoryId = c.id;
                        _showCategoryError = false;
                      }),
                    ),
                ],
              ),
              if (_showCategoryError)
                Padding(
                  padding: const EdgeInsets.only(top: Space.xs),
                  child: Text(
                    l.errCategoryRequired,
                    style: t.bodySmall?.copyWith(color: p.negative),
                  ),
                ),
              const SizedBox(height: Space.lg),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.event_outlined),
                title: Text(l.date),
                subtitle: Text(formatDate(_date, context.lang)),
                trailing: const Icon(Icons.edit_calendar_outlined),
                onTap: _pickDate,
              ),
              TextFormField(
                key: const Key('expense.note'),
                controller: _note,
                maxLength: 120,
                decoration: InputDecoration(
                  labelText: l.note,
                  hintText: l.noteHint,
                ),
              ),
              const SizedBox(height: Space.md),
              FilledButton(
                key: const Key('expense.save'),
                onPressed: _busy ? null : _save,
                child: Text(l.save),
              ),
              if (widget.existing != null) ...[
                const SizedBox(height: Space.sm),
                TextButton.icon(
                  key: const Key('expense.delete'),
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
