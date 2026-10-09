import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../application/app_scope.dart';
import '../../core/amount_parser.dart';
import '../format.dart';
import '../theme/tokens.dart';

/// Card with an optional header row. The basic building block of screens.
class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    this.title,
    this.action,
    required this.child,
    this.padding = const EdgeInsets.all(Space.lg),
  });

  final String? title;
  final Widget? action;
  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: padding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (title != null)
              Padding(
                padding: const EdgeInsets.only(bottom: Space.md),
                child: Row(
                  children: [
                    Expanded(
                      child: Semantics(
                        header: true,
                        child: Text(
                          title!,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                    ),
                    if (action != null) Flexible(child: action!),
                  ],
                ),
              ),
            child,
          ],
        ),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.body,
    this.action,
  });

  final IconData icon;
  final String title;
  final String? body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Space.xxl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ExcludeSemantics(
              child: CircleAvatar(
                radius: 32,
                backgroundColor: p.primaryContainer,
                child: Icon(icon, size: 32, color: p.onPrimaryContainer),
              ),
            ),
            const SizedBox(height: Space.lg),
            Text(title, style: t.titleMedium, textAlign: TextAlign.center),
            if (body != null) ...[
              const SizedBox(height: Space.sm),
              Text(
                body!,
                style: t.bodyMedium?.copyWith(color: p.onSurfaceMuted),
                textAlign: TextAlign.center,
              ),
            ],
            if (action != null) ...[const SizedBox(height: Space.xl), action!],
          ],
        ),
      ),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.error_outline,
      title: message,
      action: onRetry == null
          ? null
          : FilledButton(onPressed: onRetry, child: Text(context.l10n.retry)),
    );
  }
}

/// Progress bar that always states its value in text (not colour alone)
/// and switches to the warning/negative colour with an icon when exceeded.
class LabeledProgress extends StatelessWidget {
  const LabeledProgress({
    super.key,
    required this.value,
    required this.label,
    this.trailing,
    this.invertWarning = false,
  });

  /// 0..∞ (values > 1 mean exceeded).
  final double value;
  final String label;
  final String? trailing;

  /// For budgets: exceeding is bad. For goals pass false and it's just full.
  final bool invertWarning;

  @override
  Widget build(BuildContext context) {
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    final over = invertWarning && value > 1;
    final near = invertWarning && !over && value >= 0.8;
    final color = over ? p.negative : (near ? p.warning : p.primary);
    return Semantics(
      label: label,
      value: trailing,
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                if (over)
                  Padding(
                    padding: const EdgeInsetsDirectional.only(end: Space.xs),
                    child: Icon(
                      Icons.warning_amber_rounded,
                      size: 18,
                      color: p.negative,
                    ),
                  ),
                // Both texts may wrap so large text sizes never overflow.
                Expanded(flex: 3, child: Text(label, style: t.bodyMedium)),
                if (trailing != null) ...[
                  const SizedBox(width: Space.sm),
                  Flexible(
                    flex: 2,
                    child: Text(
                      trailing!,
                      textAlign: TextAlign.end,
                      style: t.bodySmall?.copyWith(
                        color: over ? p.negative : p.onSurfaceMuted,
                        fontWeight: over ? FontWeight.w700 : null,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: Space.xs),
            ClipRRect(
              borderRadius: BorderRadius.circular(Radii.pill),
              child: LinearProgressIndicator(
                value: value.clamp(0.0, 1.0),
                minHeight: 8,
                color: color,
                backgroundColor: p.surfaceMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Money input with currency-aware validation. Never parses via double.
class AmountField extends StatelessWidget {
  const AmountField({
    super.key,
    required this.controller,
    required this.label,
    this.allowEmpty = false,
    this.allowZero = false,
    this.autofocus = false,
    this.hint,
    this.fieldKey,
  });

  final TextEditingController controller;
  final String label;
  final String? hint;
  final bool allowEmpty;
  final bool allowZero;
  final bool autofocus;
  final Key? fieldKey;

  @override
  Widget build(BuildContext context) {
    final currency = AppScope.of(context).currency;
    final l = context.l10n;
    return TextFormField(
      key: fieldKey,
      controller: controller,
      autofocus: autofocus,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'[0-9٠-٩۰-۹.,٫٬]')),
        LengthLimitingTextInputFormatter(16),
      ],
      textDirection: TextDirection.ltr,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        suffixText: currencySymbol(currency, context.lang),
      ),
      validator: (v) {
        if (allowEmpty && (v == null || v.trim().isEmpty)) return null;
        return amountErrorText(
          parseAmount(v ?? '', currency, allowZero: allowZero).error,
          currency,
          l,
        );
      },
    );
  }
}

/// Shows a confirm dialog; returns true if confirmed.
Future<bool> confirmDialog(
  BuildContext context, {
  required String title,
  String? body,
  required String confirmLabel,
  bool destructive = false,
}) async {
  final p = AppTokens.of(context);
  final res = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: body == null ? null : Text(body),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx, false),
          child: Text(ctx.l10n.cancel),
        ),
        FilledButton(
          style: destructive
              ? FilledButton.styleFrom(
                  backgroundColor: p.negative,
                  foregroundColor: p.onNegative,
                )
              : null,
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return res ?? false;
}

/// Runs a state mutation and reports failure without crashing or leaking
/// details. Returns true on success.
Future<bool> runGuarded(
  BuildContext context,
  Future<void> Function() op, {
  String? successMessage,
}) async {
  final messenger = ScaffoldMessenger.of(context);
  final l = context.l10n;
  try {
    await op();
    if (successMessage != null) {
      messenger.showSnackBar(SnackBar(content: Text(successMessage)));
    }
    return true;
  } catch (_) {
    // Intentionally no logging of the error payload: it may contain amounts.
    messenger.showSnackBar(SnackBar(content: Text(l.errGeneric)));
    return false;
  }
}

/// Month navigation header: ‹ October 2026 ›
class MonthSwitcher extends StatelessWidget {
  const MonthSwitcher({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        IconButton(
          tooltip: l.prevMonth,
          icon: const Icon(Icons.chevron_left),
          onPressed: () => app.setMonth(app.month.previous),
        ),
        Flexible(
          child: Text(
            formatMonth(app.month.firstDay, context.lang),
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
        ),
        IconButton(
          tooltip: l.nextMonth,
          icon: const Icon(Icons.chevron_right),
          onPressed: app.isCurrentMonth
              ? null
              : () => app.setMonth(app.month.next),
        ),
      ],
    );
  }
}

/// "Label ........ amount" line. Wraps the amount below the label instead of
/// overflowing at large text sizes.
class TotalRow extends StatelessWidget {
  const TotalRow({super.key, required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return MergeSemantics(
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: Space.sm,
        children: [
          Text(label, style: t.bodyMedium),
          Text(
            value,
            style: t.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}
