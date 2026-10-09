import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:tharwati/core/dates.dart';
import 'package:tharwati/data/database.dart';
import 'package:tharwati/data/finance_repository.dart';
import 'package:tharwati/domain/models.dart';

int _count(List<Map<String, Object?>> rows) => rows.first.values.first as int;

void main() {
  sqfliteFfiInit();
  final factory = databaseFactoryFfi;
  late Directory tmp;
  late String path;
  late FinanceRepository repo;
  final clock = DateTime(2026, 10, 9, 12);
  const oct = YearMonth(2026, 10);

  setUp(() async {
    tmp = await Directory.systemTemp.createTemp('tharwati_test');
    path = p.join(tmp.path, databaseFileName);
    repo = FinanceRepository(
      await openAppDatabase(factory: factory, path: path),
      clock: () => clock,
    );
  });

  tearDown(() async {
    await repo.close();
    await tmp.delete(recursive: true);
  });

  Future<int> catId(String key) async =>
      (await repo.categories()).firstWhere((c) => c.key == key).id;

  group('schema & migrations', () {
    test('fresh install seeds default categories at current version', () async {
      final cats = await repo.categories();
      expect(
        cats.map((c) => c.key),
        defaultCategories.map((c) => c.$1).toList(),
      );
      final db = await factory.openDatabase(path);
      expect(await db.getVersion(), schemaVersion);
      await db.close();
    });

    test('opening an existing DB does not re-seed or lose data', () async {
      await repo.addIncome(month: oct, amountMinor: 900000, label: 'Salary');
      await repo.close();
      repo = FinanceRepository(
        await openAppDatabase(factory: factory, path: path),
        clock: () => clock,
      );
      expect((await repo.categories()).length, defaultCategories.length);
      expect((await repo.incomesFor(oct)).single.amountMinor, 900000);
    });

    test('a database from a newer app version is refused, not wiped', () async {
      await repo.addIncome(month: oct, amountMinor: 1, label: '');
      await repo.close();
      final raw = await factory.openDatabase(path);
      await raw.setVersion(schemaVersion + 1);
      await raw.close();
      await expectLater(
        openAppDatabase(factory: factory, path: path),
        throwsA(anything),
      );
      final check = await factory.openDatabase(path);
      expect(_count(await check.rawQuery('SELECT COUNT(*) FROM incomes')), 1);
      await check.setVersion(schemaVersion);
      await check.close();
      repo = FinanceRepository(
        await openAppDatabase(factory: factory, path: path),
      );
    });

    test(
      'DB constraints reject invalid rows even if app checks are bypassed',
      () async {
        final db = await openAppDatabase(factory: factory, path: path);
        final food = await catId('food');
        Future<void> bad(Map<String, Object?> row) =>
            db.insert('expenses', row);
        final base = {
          'amount_minor': 100,
          'category_id': food,
          'day': '2026-10-09',
          'note': '',
          'created_at': 0,
          'updated_at': 0,
        };
        await expectLater(bad({...base, 'amount_minor': 0}), throwsA(anything));
        await expectLater(
          bad({...base, 'amount_minor': -5}),
          throwsA(anything),
        );
        await expectLater(
          bad({...base, 'category_id': 9999}),
          throwsA(anything),
        );
        await expectLater(bad({...base, 'day': '2026-1-9'}), throwsA(anything));
        await db.close();
      },
    );
  });

  group('expenses', () {
    test('CRUD and month filtering by local calendar day', () async {
      final food = await catId('food');
      final id = await repo.addExpense(
        amountMinor: 3500,
        categoryId: food,
        date: DateTime(2026, 10, 31),
      );
      await repo.addExpense(
        amountMinor: 1000,
        categoryId: food,
        date: DateTime(2026, 11, 1),
      );
      await repo.addExpense(
        amountMinor: 2000,
        categoryId: food,
        date: DateTime(2026, 10, 1),
        note: '  lunch  ',
      );

      var oct26 = await repo.expensesFor(oct);
      expect(oct26.map((e) => e.amountMinor), [3500, 2000]);
      expect(oct26.last.note, 'lunch');

      await repo.updateExpense(
        Expense(
          id: id,
          amountMinor: 4000,
          categoryId: food,
          date: DateTime(2026, 10, 30),
        ),
      );
      oct26 = await repo.expensesFor(oct);
      expect(oct26.first.amountMinor, 4000);

      await repo.deleteExpense(id);
      expect(
        (await repo.expensesFor(oct)).map((e) => e.id),
        isNot(contains(id)),
      );
    });

    test('rejects non-positive amounts', () async {
      final food = await catId('food');
      expect(
        () => repo.addExpense(
          amountMinor: 0,
          categoryId: food,
          date: DateTime(2026, 10, 1),
        ),
        throwsArgumentError,
      );
    });
  });

  group('income', () {
    test('copyIncome copies once and never duplicates', () async {
      const sep = YearMonth(2026, 9);
      await repo.addIncome(month: sep, amountMinor: 800000, label: 'Salary');
      await repo.addIncome(month: sep, amountMinor: 50000, label: 'Side');
      expect(await repo.copyIncome(from: sep, to: oct), 2);
      expect(await repo.copyIncome(from: sep, to: oct), 0);
      final rows = await repo.incomesFor(oct);
      expect(rows.map((r) => r.amountMinor), [800000, 50000]);
      expect(rows.first.label, 'Salary');
    });
  });

  group('budgets & categories', () {
    test('set, replace and clear a budget', () async {
      final food = await catId('food');
      await repo.setBudget(food, 150000);
      await repo.setBudget(food, 120000);
      expect((await repo.budgets()).single.limitMinor, 120000);
      await repo.setBudget(food, null);
      expect(await repo.budgets(), isEmpty);
    });

    test('unused custom category is deleted; used one is archived', () async {
      final a = await repo.addCategory('  Coffee ');
      final b = await repo.addCategory('Gym');
      expect(
        (await repo.categories()).firstWhere((c) => c.id == a).name,
        'Coffee',
      );
      await repo.addExpense(
        amountMinor: 1500,
        categoryId: b,
        date: DateTime(2026, 10, 2),
      );
      await repo.setBudget(b, 20000);

      expect(await repo.removeCategory(a), isFalse);
      expect(await repo.removeCategory(b), isTrue);

      final active = await repo.categories();
      expect(active.any((c) => c.id == a || c.id == b), isFalse);
      final all = await repo.categories(includeArchived: true);
      expect(all.where((c) => c.id == b).single.archived, isTrue);
      // History is preserved; the budget for the archived category is gone.
      expect((await repo.expensesFor(oct)).single.categoryId, b);
      expect(await repo.budgets(), isEmpty);
    });

    test('rename rejects blank names', () async {
      final food = await catId('food');
      expect(() => repo.renameCategory(food, '   '), throwsArgumentError);
      await repo.renameCategory(food, 'Groceries');
      expect(
        (await repo.categories()).firstWhere((c) => c.id == food).name,
        'Groceries',
      );
    });
  });

  group('goals', () {
    test(
      'saved amount is the sum of contributions; withdrawals bounded',
      () async {
        final id = await repo.addGoal(
          name: 'Car',
          targetMinor: 5000000,
          targetDate: DateTime(2027, 10, 1),
          initialSavedMinor: 1000000,
        );
        await repo.addContribution(
          goalId: id,
          amountMinor: 250000,
          date: DateTime(2026, 10, 9),
        );
        await repo.addContribution(
          goalId: id,
          amountMinor: -50000,
          date: DateTime(2026, 10, 9),
        );
        expect((await repo.goals()).single.savedMinor, 1200000);

        expect(
          () => repo.addContribution(
            goalId: id,
            amountMinor: -1200001,
            date: DateTime(2026, 10, 9),
          ),
          throwsArgumentError,
        );
        expect((await repo.goals()).single.savedMinor, 1200000);
      },
    );

    test('update and cascade delete', () async {
      final id = await repo.addGoal(
        name: 'Trip',
        targetMinor: 300000,
        targetDate: DateTime(2027, 1, 1),
      );
      await repo.addContribution(
        goalId: id,
        amountMinor: 1000,
        date: DateTime(2026, 10, 9),
      );
      await repo.updateGoal(
        id: id,
        name: 'Umrah',
        targetMinor: 400000,
        targetDate: DateTime(2027, 3, 1),
      );
      final g = (await repo.goals()).single;
      expect(
        (g.name, g.targetMinor, g.targetDate),
        ('Umrah', 400000, DateTime(2027, 3, 1)),
      );

      await repo.deleteGoal(id);
      expect(await repo.goals(), isEmpty);
      final db = await factory.openDatabase(path);
      expect(
        _count(await db.rawQuery('SELECT COUNT(*) FROM goal_contributions')),
        0,
      );
      await db.close();
    });
  });
}
