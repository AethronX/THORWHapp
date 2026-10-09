import 'package:flutter/material.dart';

import '../../application/app_scope.dart';
import '../../domain/models.dart';
import '../format.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';
import 'budgets_screen.dart';
import 'income_screen.dart';

const String appVersion = '0.1.0';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  Future<void> _deleteAll(BuildContext context) async {
    final l = context.l10n;
    final app = AppScope.read(context);
    final ok = await confirmDialog(
      context,
      title: l.deleteAllConfirmTitle,
      body: l.deleteAllConfirmBody,
      confirmLabel: l.deleteAllConfirmAction,
      destructive: true,
    );
    if (ok && context.mounted) {
      await runGuarded(context, app.deleteAllData);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    Widget header(String s) => Padding(
      padding: const EdgeInsets.fromLTRB(
        Space.gutter,
        Space.xl,
        Space.gutter,
        Space.sm,
      ),
      child: Semantics(
        header: true,
        child: Text(s, style: t.titleSmall?.copyWith(color: p.primary)),
      ),
    );

    return Scaffold(
      appBar: AppBar(title: Text(l.settingsTitle)),
      body: ListView(
        padding: const EdgeInsets.only(bottom: Space.xxl),
        children: [
          header(l.language),
          RadioGroup<String>(
            groupValue: app.locale.languageCode,
            onChanged: (v) => app.setLocale(Locale(v ?? 'ar')),
            child: Column(
              children: [
                RadioListTile<String>(
                  key: const Key('settings.lang.ar'),
                  value: 'ar',
                  title: Text(l.arabic),
                ),
                RadioListTile<String>(
                  key: const Key('settings.lang.en'),
                  value: 'en',
                  title: Text(l.english),
                ),
              ],
            ),
          ),
          header(l.theme),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
            child: SegmentedButton<ThemeMode>(
              segments: [
                ButtonSegment(
                  value: ThemeMode.system,
                  label: Text(l.themeSystem),
                ),
                ButtonSegment(
                  value: ThemeMode.light,
                  label: Text(l.themeLight),
                ),
                ButtonSegment(value: ThemeMode.dark, label: Text(l.themeDark)),
              ],
              selected: {app.themeMode},
              onSelectionChanged: (s) => app.setThemeMode(s.first),
            ),
          ),
          header(l.monthSummary),
          ListTile(
            leading: const Icon(Icons.payments_outlined),
            title: Text(l.manageIncome),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context)
                .push(MaterialPageRoute(builder: (_) => const IncomeScreen())),
          ),
          ListTile(
            leading: const Icon(Icons.pie_chart_outline),
            title: Text(l.budgetsScreenTitle),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context)
                .push(MaterialPageRoute(builder: (_) => const BudgetsScreen())),
          ),
          ListTile(
            key: const Key('settings.categories'),
            leading: const Icon(Icons.category_outlined),
            title: Text(l.categories),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const CategoriesScreen())),
          ),
          ListTile(
            leading: const Icon(Icons.currency_exchange),
            title: Text(l.currency),
            subtitle: Text(l.currencyLockedNote),
            trailing: Text(app.currency.code, style: t.titleSmall),
          ),
          header(l.privacy),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
            child: Text(l.privacyBody, style: t.bodyMedium),
          ),
          const SizedBox(height: Space.md),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
            child: OutlinedButton.icon(
              key: const Key('settings.deleteAll'),
              style: OutlinedButton.styleFrom(
                foregroundColor: p.negative,
                side: BorderSide(color: p.negative),
              ),
              onPressed: () => _deleteAll(context),
              icon: const Icon(Icons.delete_forever_outlined),
              label: Text(l.deleteAllData),
            ),
          ),
          header(l.about),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: Space.gutter),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(l.aboutBody, style: t.bodyMedium),
                const SizedBox(height: Space.sm),
                Text(
                  l.version(appVersion),
                  style: t.bodySmall?.copyWith(color: p.onSurfaceMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  Future<void> _nameDialog(BuildContext context, {Category? existing}) async {
    final l = context.l10n;
    final app = AppScope.read(context);
    final form = GlobalKey<FormState>();
    final ctrl = TextEditingController(
      // Pre-fill only a custom name: saving a pre-filled localised built-in
      // label would freeze it in the current language.
      text: existing?.name ?? '',
    );
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? l.addCategory : l.rename),
        content: Form(
          key: form,
          child: TextFormField(
            key: const Key('category.name'),
            controller: ctrl,
            autofocus: true,
            maxLength: 30,
            decoration: InputDecoration(labelText: l.categoryName),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? l.errNameEmpty : null,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(l.cancel),
          ),
          FilledButton(
            key: const Key('category.save'),
            onPressed: () async {
              if (!form.currentState!.validate()) return;
              Navigator.pop(ctx);
              await runGuarded(
                context,
                () => existing == null
                    ? app.addCategory(ctrl.text)
                    : app.renameCategory(existing.id, ctrl.text),
              );
            },
            child: Text(l.save),
          ),
        ],
      ),
    );
  }

  Future<void> _remove(BuildContext context, Category c) async {
    final l = context.l10n;
    final app = AppScope.read(context);
    final messenger = ScaffoldMessenger.of(context);
    final ok = await confirmDialog(
      context,
      title: l.deleteCategoryConfirm,
      confirmLabel: l.delete,
      destructive: true,
    );
    if (!ok || !context.mounted) return;
    try {
      final archived = await app.removeCategory(c.id);
      messenger.showSnackBar(
        SnackBar(content: Text(archived ? l.categoryArchivedNote : l.deleted)),
      );
    } catch (_) {
      messenger.showSnackBar(SnackBar(content: Text(l.errGeneric)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.categories)),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: null,
        key: const Key('categories.add'),
        onPressed: () => _nameDialog(context),
        icon: const Icon(Icons.add),
        label: Text(l.addCategory),
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 96),
        children: [
          for (final c in app.categories)
            ListTile(
              leading: Icon(categoryIcon(c)),
              title: Text(categoryLabel(c, l)),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    tooltip: l.rename,
                    icon: const Icon(Icons.edit_outlined),
                    onPressed: () => _nameDialog(context, existing: c),
                  ),
                  IconButton(
                    tooltip: l.delete,
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () => _remove(context, c),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
