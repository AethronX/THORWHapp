import 'package:sqflite/sqflite.dart';

import '../core/dates.dart';
import '../domain/models.dart';

abstract final class SettingKeys {
  static const currency = 'currency';
  static const locale = 'locale';
  static const onboarded = 'onboarded';
  static const themeMode = 'theme_mode';
}

/// Single local repository for all user finance data.
///
/// The app is local-only and single-profile in v1 (no accounts, no sync), so
/// there is no cross-user data path at all; see SECURITY.md.
class FinanceRepository {
  FinanceRepository(this._db, {DateTime Function()? clock})
    : _clock = clock ?? DateTime.now;

  final Database _db;
  final DateTime Function() _clock;

  int get _nowUtc => _clock().toUtc().millisecondsSinceEpoch;

  Future<void> close() => _db.close();

  // -- settings -------------------------------------------------------------

  Future<Map<String, String>> loadSettings() async {
    final rows = await _db.query('settings');
    return {for (final r in rows) r['key'] as String: r['value'] as String};
  }

  Future<void> setSetting(String key, String value) => _db.insert('settings', {
    'key': key,
    'value': value,
  }, conflictAlgorithm: ConflictAlgorithm.replace);

  /// Saves currency, optional first income and the onboarded flag in one
  /// transaction, so an interrupted onboarding can't leave income recorded
  /// under a currency the user later changes.
  Future<void> completeOnboarding({
    required String currencyCode,
    required YearMonth month,
    int? incomeMinor,
    String incomeLabel = '',
  }) {
    return _db.transaction((txn) async {
      Future<void> set(String k, String v) => txn.insert('settings', {
        'key': k,
        'value': v,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
      await set(SettingKeys.currency, currencyCode);
      if (incomeMinor != null && incomeMinor > 0) {
        final existing = await txn.query(
          'incomes',
          where: 'month = ?',
          whereArgs: [month.key],
        );
        if (existing.isEmpty) {
          final now = _nowUtc;
          await txn.insert('incomes', {
            'month': month.key,
            'amount_minor': incomeMinor,
            'label': incomeLabel.trim(),
            'created_at': now,
            'updated_at': now,
          });
        }
      }
      await set(SettingKeys.onboarded, '1');
    });
  }

  // -- categories -----------------------------------------------------------

  Future<List<Category>> categories({bool includeArchived = false}) async {
    final rows = await _db.query(
      'categories',
      where: includeArchived ? null : 'archived = 0',
      orderBy: 'sort_order, id',
    );
    return rows.map(_category).toList();
  }

  Future<int> addCategory(String name, {int iconCode = 11}) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) throw ArgumentError('Category name is empty');
    final maxOrder =
        Sqflite.firstIntValue(
          await _db.rawQuery('SELECT MAX(sort_order) FROM categories'),
        ) ??
        0;
    return _db.insert('categories', {
      'name': trimmed,
      'icon_code': iconCode,
      'sort_order': maxOrder + 1,
    });
  }

  Future<void> renameCategory(int id, String name) async {
    final trimmed = name.trim();
    if (trimmed.isEmpty) throw ArgumentError('Category name is empty');
    await _db.update(
      'categories',
      {'name': trimmed},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Hard-deletes a category with no expenses; otherwise archives it so
  /// historical expenses keep a valid category. Returns true if archived.
  Future<bool> removeCategory(int id) async {
    final used =
        Sqflite.firstIntValue(
          await _db.rawQuery(
            'SELECT COUNT(*) FROM expenses WHERE category_id = ?',
            [id],
          ),
        ) ??
        0;
    if (used > 0) {
      await _db.transaction((txn) async {
        await txn.update(
          'categories',
          {'archived': 1},
          where: 'id = ?',
          whereArgs: [id],
        );
        await txn.delete('budgets', where: 'category_id = ?', whereArgs: [id]);
      });
      return true;
    }
    await _db.delete('categories', where: 'id = ?', whereArgs: [id]);
    return false;
  }

  Category _category(Map<String, Object?> r) => Category(
    id: r['id'] as int,
    key: r['key'] as String?,
    name: r['name'] as String?,
    iconCode: r['icon_code'] as int,
    isEssential: (r['is_essential'] as int) == 1,
    archived: (r['archived'] as int) == 1,
  );

  // -- expenses -------------------------------------------------------------

  Future<List<Expense>> expensesFor(YearMonth month) async {
    final rows = await _db.query(
      'expenses',
      where: 'day BETWEEN ? AND ?',
      whereArgs: [month.firstDayKey, month.lastDayKey],
      orderBy: 'day DESC, id DESC',
    );
    return rows
        .map(
          (r) => Expense(
            id: r['id'] as int,
            amountMinor: r['amount_minor'] as int,
            categoryId: r['category_id'] as int,
            date: parseDayKey(r['day'] as String),
            note: r['note'] as String,
          ),
        )
        .toList();
  }

  Future<int> addExpense({
    required int amountMinor,
    required int categoryId,
    required DateTime date,
    String note = '',
  }) {
    _positive(amountMinor);
    final now = _nowUtc;
    return _db.insert('expenses', {
      'amount_minor': amountMinor,
      'category_id': categoryId,
      'day': dayKey(date),
      'note': note.trim(),
      'created_at': now,
      'updated_at': now,
    });
  }

  Future<void> updateExpense(Expense e) async {
    _positive(e.amountMinor);
    await _db.update(
      'expenses',
      {
        'amount_minor': e.amountMinor,
        'category_id': e.categoryId,
        'day': dayKey(e.date),
        'note': e.note.trim(),
        'updated_at': _nowUtc,
      },
      where: 'id = ?',
      whereArgs: [e.id],
    );
  }

  Future<void> deleteExpense(int id) =>
      _db.delete('expenses', where: 'id = ?', whereArgs: [id]);

  // -- income ---------------------------------------------------------------

  Future<List<IncomeEntry>> incomesFor(YearMonth month) async {
    final rows = await _db.query(
      'incomes',
      where: 'month = ?',
      whereArgs: [month.key],
      orderBy: 'id',
    );
    return rows
        .map(
          (r) => IncomeEntry(
            id: r['id'] as int,
            month: YearMonth.parse(r['month'] as String),
            amountMinor: r['amount_minor'] as int,
            label: r['label'] as String,
          ),
        )
        .toList();
  }

  Future<int> addIncome({
    required YearMonth month,
    required int amountMinor,
    String label = '',
  }) {
    _positive(amountMinor);
    final now = _nowUtc;
    return _db.insert('incomes', {
      'month': month.key,
      'amount_minor': amountMinor,
      'label': label.trim(),
      'created_at': now,
      'updated_at': now,
    });
  }

  Future<void> updateIncome(IncomeEntry e) async {
    _positive(e.amountMinor);
    await _db.update(
      'incomes',
      {
        'amount_minor': e.amountMinor,
        'label': e.label.trim(),
        'updated_at': _nowUtc,
      },
      where: 'id = ?',
      whereArgs: [e.id],
    );
  }

  Future<void> deleteIncome(int id) =>
      _db.delete('incomes', where: 'id = ?', whereArgs: [id]);

  /// Copies [from]'s income lines into [to]. No-op if [to] already has income.
  Future<int> copyIncome({required YearMonth from, required YearMonth to}) {
    return _db.transaction((txn) async {
      final existing =
          Sqflite.firstIntValue(
            await txn.rawQuery('SELECT COUNT(*) FROM incomes WHERE month = ?', [
              to.key,
            ]),
          ) ??
          0;
      if (existing > 0) return 0;
      final rows = await txn.query(
        'incomes',
        where: 'month = ?',
        whereArgs: [from.key],
      );
      final now = _nowUtc;
      for (final r in rows) {
        await txn.insert('incomes', {
          'month': to.key,
          'amount_minor': r['amount_minor'],
          'label': r['label'],
          'created_at': now,
          'updated_at': now,
        });
      }
      return rows.length;
    });
  }

  // -- budgets --------------------------------------------------------------

  Future<List<Budget>> budgets() async {
    final rows = await _db.query('budgets');
    return rows
        .map(
          (r) => Budget(
            categoryId: r['category_id'] as int,
            limitMinor: r['limit_minor'] as int,
          ),
        )
        .toList();
  }

  /// Sets (or with `null`, clears) a category's monthly limit.
  Future<void> setBudget(int categoryId, int? limitMinor) async {
    if (limitMinor == null) {
      await _db.delete(
        'budgets',
        where: 'category_id = ?',
        whereArgs: [categoryId],
      );
      return;
    }
    _positive(limitMinor);
    await _db.insert('budgets', {
      'category_id': categoryId,
      'limit_minor': limitMinor,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  // -- goals ----------------------------------------------------------------

  Future<List<SavingsGoal>> goals() async {
    final rows = await _db.rawQuery('''
      SELECT g.id, g.name, g.target_minor, g.target_day,
             COALESCE(SUM(c.amount_minor), 0) AS saved_minor
      FROM goals g
      LEFT JOIN goal_contributions c ON c.goal_id = g.id
      GROUP BY g.id
      ORDER BY g.target_day, g.id''');
    return rows
        .map(
          (r) => SavingsGoal(
            id: r['id'] as int,
            name: r['name'] as String,
            targetMinor: r['target_minor'] as int,
            savedMinor: r['saved_minor'] as int,
            targetDate: parseDayKey(r['target_day'] as String),
          ),
        )
        .toList();
  }

  Future<int> addGoal({
    required String name,
    required int targetMinor,
    required DateTime targetDate,
    int initialSavedMinor = 0,
    DateTime? today,
  }) {
    if (name.trim().isEmpty) throw ArgumentError('Goal name is empty');
    _positive(targetMinor);
    if (initialSavedMinor < 0) throw ArgumentError('Negative saved amount');
    final now = _nowUtc;
    return _db.transaction((txn) async {
      final id = await txn.insert('goals', {
        'name': name.trim(),
        'target_minor': targetMinor,
        'target_day': dayKey(targetDate),
        'created_at': now,
        'updated_at': now,
      });
      if (initialSavedMinor > 0) {
        await txn.insert('goal_contributions', {
          'goal_id': id,
          'amount_minor': initialSavedMinor,
          'day': dayKey(today ?? _clock()),
          'created_at': now,
        });
      }
      return id;
    });
  }

  Future<void> updateGoal({
    required int id,
    required String name,
    required int targetMinor,
    required DateTime targetDate,
  }) async {
    if (name.trim().isEmpty) throw ArgumentError('Goal name is empty');
    _positive(targetMinor);
    await _db.update(
      'goals',
      {
        'name': name.trim(),
        'target_minor': targetMinor,
        'target_day': dayKey(targetDate),
        'updated_at': _nowUtc,
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> deleteGoal(int id) =>
      _db.delete('goals', where: 'id = ?', whereArgs: [id]);

  /// Records money set aside (positive) or withdrawn (negative) for a goal.
  /// A withdrawal may not take the goal's saved total below zero.
  Future<void> addContribution({
    required int goalId,
    required int amountMinor,
    required DateTime date,
  }) {
    if (amountMinor == 0) throw ArgumentError('Contribution must be non-zero');
    return _db.transaction((txn) async {
      if (amountMinor < 0) {
        final saved =
            Sqflite.firstIntValue(
              await txn.rawQuery(
                'SELECT COALESCE(SUM(amount_minor),0) FROM goal_contributions '
                'WHERE goal_id = ?',
                [goalId],
              ),
            ) ??
            0;
        if (saved + amountMinor < 0) {
          throw ArgumentError('Withdrawal exceeds saved amount');
        }
      }
      await txn.insert('goal_contributions', {
        'goal_id': goalId,
        'amount_minor': amountMinor,
        'day': dayKey(date),
        'created_at': _nowUtc,
      });
    });
  }

  void _positive(int v) {
    if (v <= 0) throw ArgumentError('Amount must be > 0');
  }
}
