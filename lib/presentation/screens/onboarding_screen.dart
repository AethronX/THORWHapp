import 'package:flutter/material.dart';

import '../../application/app_scope.dart';
import '../../core/amount_parser.dart';
import '../../core/currency.dart';
import '../format.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';

/// Value intro (3 short pages) followed by a one-screen setup.
/// Goal: first useful number on screen in under a minute.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pages = PageController();
  int _index = 0;

  static const _pageCount = 4; // 3 intro + setup

  void _go(int i) => _pages.animateToPage(
    i,
    duration: const Duration(milliseconds: 250),
    curve: Curves.easeOut,
  );

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final intro = [
      (Icons.receipt_long_outlined, l.onbTitle1, l.onbBody1),
      (Icons.pie_chart_outline, l.onbTitle2, l.onbBody2),
      (Icons.savings_outlined, l.onbTitle3, l.onbBody3),
    ];
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: _index < 3
                  ? TextButton(onPressed: () => _go(3), child: Text(l.skip))
                  : const SizedBox(height: minTapTarget),
            ),
            Expanded(
              child: PageView(
                controller: _pages,
                onPageChanged: (i) => setState(() => _index = i),
                children: [
                  for (final (icon, title, body) in intro)
                    _IntroPage(icon: icon, title: title, body: body),
                  const _SetupPage(),
                ],
              ),
            ),
            if (_index < 3)
              Padding(
                padding: const EdgeInsets.all(Space.gutter),
                child: Row(
                  children: [
                    _Dots(count: _pageCount, index: _index),
                    const Spacer(),
                    FilledButton(
                      onPressed: () => _go(_index + 1),
                      child: Text(_index == 2 ? l.getStarted : l.next),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _IntroPage extends StatelessWidget {
  const _IntroPage({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(Space.xl),
      child: Column(
        children: [
          const SizedBox(height: Space.xxl),
          ExcludeSemantics(
            child: CircleAvatar(
              radius: 56,
              backgroundColor: p.primaryContainer,
              child: Icon(icon, size: 56, color: p.onPrimaryContainer),
            ),
          ),
          const SizedBox(height: Space.xxl),
          Semantics(
            header: true,
            child: Text(
              title,
              style: t.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: Space.lg),
          Text(
            body,
            style: t.bodyLarge?.copyWith(color: p.onSurfaceMuted),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _Dots extends StatelessWidget {
  const _Dots({required this.count, required this.index});

  final int count;
  final int index;

  @override
  Widget build(BuildContext context) {
    final p = AppTokens.of(context);
    return ExcludeSemantics(
      child: Row(
        children: [
          for (var i = 0; i < count; i++)
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsetsDirectional.only(end: Space.xs),
              width: i == index ? 20 : 8,
              height: 8,
              decoration: BoxDecoration(
                color: i == index ? p.primary : p.outline,
                borderRadius: BorderRadius.circular(Radii.pill),
              ),
            ),
        ],
      ),
    );
  }
}

class _SetupPage extends StatefulWidget {
  const _SetupPage();

  @override
  State<_SetupPage> createState() => _SetupPageState();
}

class _SetupPageState extends State<_SetupPage> {
  final _form = GlobalKey<FormState>();
  final _income = TextEditingController();
  Currency _currency = Currency.defaultCurrency;
  bool _busy = false;

  @override
  void dispose() {
    _income.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    final app = AppScope.read(context);
    final l = context.l10n;
    final text = _income.text.trim();
    // Validate against the *selected* currency's decimals.
    final parsed = text.isEmpty ? null : parseAmount(text, _currency);
    if (parsed != null && !parsed.isOk) {
      setState(() => _busy = false);
      return;
    }
    await runGuarded(
      context,
      () => app.completeOnboarding(
        currency: _currency,
        monthlyIncomeMinor: parsed?.minor,
        incomeLabel: l.salaryLabel,
      ),
    );
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(Space.xl),
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(
                l.setupTitle,
                style: t.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(height: Space.xl),
            DropdownButtonFormField<Currency>(
              key: const Key('setup.currency'),
              initialValue: _currency,
              isExpanded: true,
              decoration: InputDecoration(labelText: l.setupCurrencyLabel),
              items: [
                for (final c in Currency.supported)
                  DropdownMenuItem(
                    value: c,
                    child: Text('${currencyName(c, context.lang)} (${c.code})'),
                  ),
              ],
              onChanged: (c) => setState(() => _currency = c ?? _currency),
            ),
            const SizedBox(height: Space.sm),
            Text(
              l.currencyLockedNote,
              style: t.bodySmall?.copyWith(color: p.onSurfaceMuted),
            ),
            const SizedBox(height: Space.xl),
            TextFormField(
              key: const Key('setup.income'),
              controller: _income,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              textDirection: TextDirection.ltr,
              decoration: InputDecoration(
                labelText: l.setupIncomeLabel,
                hintText: l.setupIncomeHint,
                suffixText: currencySymbol(_currency, context.lang),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return null;
                return amountErrorText(
                  parseAmount(v, _currency).error,
                  _currency,
                  l,
                );
              },
            ),
            const SizedBox(height: Space.xl),
            Row(
              children: [
                Icon(Icons.lock_outline, size: 20, color: p.primary),
                const SizedBox(width: Space.sm),
                Expanded(
                  child: Text(
                    l.onbPrivacy,
                    style: t.bodySmall?.copyWith(color: p.onSurfaceMuted),
                  ),
                ),
              ],
            ),
            const SizedBox(height: Space.xxl),
            FilledButton(
              key: const Key('setup.finish'),
              onPressed: _busy ? null : _finish,
              child: Text(l.setupFinish),
            ),
          ],
        ),
      ),
    );
  }
}
