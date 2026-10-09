import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tharwati/application/app_controller.dart';
import 'package:tharwati/presentation/theme/tokens.dart';

import '../helpers.dart';

double _luminance(Color c) {
  double ch(double v) =>
      v <= 0.03928 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

/// WCAG 2.x contrast ratio.
double contrast(Color a, Color b) {
  final la = _luminance(a), lb = _luminance(b);
  return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
}

Future<void> _seed(WidgetTester tester, AppController app) async {
  Future<void> run(Future<void> Function() f) async {
    final fut = f();
    await settle(tester);
    await fut;
  }

  await run(
    () => app.completeOnboarding(
      currency: app.currency,
      monthlyIncomeMinor: 800000,
      incomeLabel: 'Salary',
    ),
  );
  final food = app.categories.firstWhere((c) => c.key == 'food').id;
  await run(
    () => app.addExpense(
      amountMinor: 250000,
      categoryId: food,
      date: DateTime(2026, 10, 3),
    ),
  );
  await run(() => app.setBudget(food, 200000));
  await run(
    () => app.addGoal(
      name: 'صندوق الطوارئ',
      targetMinor: 3000000,
      targetDate: DateTime(2027, 6, 1),
      initialSavedMinor: 500000,
    ),
  );
}

void main() {
  group('colour contrast (WCAG AA 4.5:1 for text)', () {
    for (final (name, p) in [
      ('light', AppPalette.light),
      ('dark', AppPalette.dark),
    ]) {
      final pairs = <String, (Color, Color)>{
        'onSurface/background': (p.onSurface, p.background),
        'onSurface/surface': (p.onSurface, p.surface),
        'onSurfaceMuted/background': (p.onSurfaceMuted, p.background),
        'onSurfaceMuted/surface': (p.onSurfaceMuted, p.surface),
        'onSurfaceMuted/surfaceMuted': (p.onSurfaceMuted, p.surfaceMuted),
        'primary/surface': (p.primary, p.surface),
        'primary/background': (p.primary, p.background),
        'onPrimary/primary': (p.onPrimary, p.primary),
        'onPrimaryContainer/primaryContainer': (
          p.onPrimaryContainer,
          p.primaryContainer,
        ),
        'negative/surface': (p.negative, p.surface),
        'warning/surface': (p.warning, p.surface),
        'positive/surface': (p.positive, p.surface),
        'onNegative/negative': (p.onNegative, p.negative),
      };
      pairs.forEach((label, pair) {
        test('$name $label', () {
          final ratio = contrast(pair.$1, pair.$2);
          expect(
            ratio,
            greaterThanOrEqualTo(4.5),
            reason: '$label = ${ratio.toStringAsFixed(2)}',
          );
        });
      });
    }
  });

  group('screens', () {
    final db = TestDb();
    setUp(db.create);
    tearDown(db.delete);

    for (final scale in [1.0, 2.0]) {
      testWidgets('main tabs meet a11y guidelines at text scale $scale', (
        tester,
      ) async {
        final handle = tester.ensureSemantics();
        final app = await launchApp(tester, db, textScale: scale);
        await _seed(tester, app);

        for (final tab in [
          'nav.home',
          'nav.expenses',
          'nav.goals',
          'nav.plan',
          'nav.settings',
        ]) {
          await tester.tap(find.byKey(Key(tab)));
          await settle(tester);
          // Layout overflows are reported as exceptions by the framework.
          expect(tester.takeException(), isNull, reason: '$tab @ $scale');
          if (scale == 1.0) {
            await expectLater(
              tester,
              meetsGuideline(androidTapTargetGuideline),
              reason: tab,
            );
            await expectLater(
              tester,
              meetsGuideline(labeledTapTargetGuideline),
              reason: tab,
            );
            await expectLater(
              tester,
              meetsGuideline(textContrastGuideline),
              reason: tab,
            );
          }
        }
        await closeApp(tester, app);
        handle.dispose();
      });
    }
  });
}
