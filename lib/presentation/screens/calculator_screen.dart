import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../application/app_scope.dart';
import '../../core/amount_parser.dart';
import '../../domain/finance/finance_engine.dart' as fe;
import '../format.dart';
import '../theme/tokens.dart';
import '../widgets/common.dart';

/// Compares "saving only" with a hypothetical-return scenario and shows the
/// inflation-adjusted value. All maths lives in the domain engine.
class CalculatorScreen extends StatefulWidget {
  const CalculatorScreen({super.key});

  @override
  State<CalculatorScreen> createState() => _CalculatorScreenState();
}

class _CalculatorScreenState extends State<CalculatorScreen> {
  final _initial = TextEditingController(text: '0');
  final _monthly = TextEditingController(text: '50');
  final _years = TextEditingController(text: '10');
  final _rate = TextEditingController(text: '4');
  final _inflation = TextEditingController(text: '2');

  @override
  void dispose() {
    for (final c in [_initial, _monthly, _years, _rate, _inflation]) {
      c.dispose();
    }
    super.dispose();
  }

  double? _num(TextEditingController c) =>
      double.tryParse(normalizeDigits(c.text.trim()));

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final l = context.l10n;
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    final cur = app.currency;

    final initial = _initial.text.trim().isEmpty
        ? const AmountParseResult.ok(0)
        : parseAmount(_initial.text, cur, allowZero: true);
    final monthly = parseAmount(_monthly.text, cur, allowZero: true);
    final years = int.tryParse(normalizeDigits(_years.text.trim()));
    final rate = _num(_rate);
    final inflation = _num(_inflation);

    final yearsOk = years != null && years >= 1 && years <= 50;
    final rateOk = rate != null && rate >= 0 && rate <= 100;
    final inflOk = inflation != null && inflation >= -50 && inflation <= 100;
    final valid = initial.isOk && monthly.isOk && yearsOk && rateOk && inflOk;

    List<fe.FutureValueResult>? results;
    int? real;
    var outOfRange = false;
    if (valid) {
      try {
        results = fe.compareScenarios(
          initialMinor: initial.minor!,
          monthlyMinor: monthly.minor!,
          months: years * 12,
          annualRatesPercent: [0, rate],
        );
        real = fe.realValue(
          nominalMinor: results[1].nominalValueMinor,
          months: years * 12,
          annualInflationPercent: inflation,
        );
      } on fe.FinanceInputError {
        // Result too large to represent exactly: say so, never show a
        // clamped number.
        results = null;
        real = null;
        outOfRange = true;
      }
    }

    Widget field(
      TextEditingController c,
      String label, {
      String? error,
      String? suffix,
      Key? key,
      bool signed = false,
    }) {
      return TextField(
        key: key,
        controller: c,
        onChanged: (_) => setState(() {}),
        keyboardType: TextInputType.numberWithOptions(
          decimal: true,
          signed: signed,
        ),
        inputFormatters: [
          FilteringTextInputFormatter.allow(RegExp(r'[0-9٠-٩۰-۹.٫\-]')),
          LengthLimitingTextInputFormatter(14),
        ],
        textDirection: TextDirection.ltr,
        decoration: InputDecoration(
          labelText: label,
          errorText: error,
          suffixText: suffix,
        ),
      );
    }

    final sym = currencySymbol(cur, context.lang);
    final rateLabel = rate == null ? '' : _trim(rate);
    return Scaffold(
      appBar: AppBar(title: Text(l.planTitle)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          Space.gutter,
          0,
          Space.gutter,
          Space.xxl,
        ),
        children: [
          Text(
            l.calcIntro,
            style: t.bodyMedium?.copyWith(color: p.onSurfaceMuted),
          ),
          const SizedBox(height: Space.lg),
          field(
            _initial,
            l.calcInitial,
            suffix: sym,
            key: const Key('calc.initial'),
            error: amountErrorText(initial.error, cur, l),
          ),
          const SizedBox(height: Space.md),
          field(
            _monthly,
            l.calcMonthly,
            suffix: sym,
            key: const Key('calc.monthly'),
            error: amountErrorText(monthly.error, cur, l),
          ),
          const SizedBox(height: Space.md),
          Row(
            children: [
              Expanded(
                child: field(
                  _years,
                  l.calcYears,
                  key: const Key('calc.years'),
                  error: yearsOk ? null : l.errYearsRange,
                ),
              ),
              const SizedBox(width: Space.md),
              Expanded(
                child: field(
                  _rate,
                  l.calcRate,
                  key: const Key('calc.rate'),
                  error: rateOk ? null : l.errRateRange,
                ),
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          field(
            _inflation,
            l.calcInflation,
            key: const Key('calc.inflation'),
            signed: true,
            error: inflOk ? null : l.errInflationRange,
          ),
          const SizedBox(height: Space.xl),
          if (outOfRange) ...[
            Text(
              l.errAmountTooLarge,
              key: const Key('calc.outOfRange'),
              style: t.bodyMedium?.copyWith(color: p.negative),
            ),
            const SizedBox(height: Space.lg),
          ],
          if (results != null) ...[
            SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _row(
                    context,
                    l.calcContributed,
                    context.money(results[0].totalContributedMinor),
                  ),
                  const Divider(height: Space.xl),
                  _row(
                    context,
                    l.calcNoReturn,
                    context.money(results[0].nominalValueMinor),
                    key: const Key('calc.result.zero'),
                  ),
                  const SizedBox(height: Space.md),
                  _row(
                    context,
                    l.calcWithReturn(rateLabel),
                    context.money(results[1].nominalValueMinor),
                    emphasize: true,
                    key: const Key('calc.result.rate'),
                  ),
                  const SizedBox(height: Space.xs),
                  _row(
                    context,
                    l.calcGrowth,
                    context.money(
                      results[1].hypotheticalGrowthMinor,
                      signed: true,
                    ),
                    muted: true,
                  ),
                  const Divider(height: Space.xl),
                  _row(
                    context,
                    l.calcRealValue(_trim(inflation!)),
                    context.money(real!),
                    key: const Key('calc.result.real'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.lg),
          ],
          Container(
            padding: const EdgeInsets.all(Space.md),
            decoration: BoxDecoration(
              color: p.surfaceMuted,
              borderRadius: BorderRadius.circular(Radii.md),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.info_outline, size: 20, color: p.onSurfaceMuted),
                const SizedBox(width: Space.sm),
                Expanded(
                  child: Text(
                    l.calcDisclaimer,
                    key: const Key('calc.disclaimer'),
                    style: t.bodySmall?.copyWith(color: p.onSurfaceMuted),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _trim(double v) =>
      v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();

  Widget _row(
    BuildContext context,
    String label,
    String value, {
    bool emphasize = false,
    bool muted = false,
    Key? key,
  }) {
    final p = AppTokens.of(context);
    final t = Theme.of(context).textTheme;
    return MergeSemantics(
      key: key,
      // Wrap: value sits beside the label, or below it at large text sizes.
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        spacing: Space.sm,
        children: [
          Text(
            label,
            style: muted
                ? t.bodySmall?.copyWith(color: p.onSurfaceMuted)
                : t.bodyMedium,
          ),
          Text(
            value,
            style: emphasize
                ? t.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: p.primary,
                  )
                : muted
                ? t.bodySmall?.copyWith(color: p.onSurfaceMuted)
                : t.titleSmall,
          ),
        ],
      ),
    );
  }
}
