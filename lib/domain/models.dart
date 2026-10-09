import '../core/dates.dart';

/// Expense category. Built-in categories have a stable [key] and no [name]
/// so the UI can localise them; user-created or renamed ones carry [name].
class Category {
  const Category({
    required this.id,
    this.key,
    this.name,
    required this.iconCode,
    this.isEssential = false,
    this.archived = false,
  });

  final int id;
  final String? key;
  final String? name;

  /// Index into the curated icon set in `presentation/category_icons.dart`.
  final int iconCode;

  /// Counts toward "essential spending" for the emergency-fund estimate.
  final bool isEssential;
  final bool archived;

  Category copyWith({String? name, int? iconCode, bool? isEssential}) =>
      Category(
        id: id,
        key: key,
        name: name ?? this.name,
        iconCode: iconCode ?? this.iconCode,
        isEssential: isEssential ?? this.isEssential,
        archived: archived,
      );
}

class Expense {
  const Expense({
    required this.id,
    required this.amountMinor,
    required this.categoryId,
    required this.date,
    this.note = '',
  });

  final int id;
  final int amountMinor;
  final int categoryId;

  /// Local calendar day; see `core/dates.dart`.
  final DateTime date;
  final String note;
}

/// One income line for a specific month (salary, side income...).
class IncomeEntry {
  const IncomeEntry({
    required this.id,
    required this.month,
    required this.amountMinor,
    this.label = '',
  });

  final int id;
  final YearMonth month;
  final int amountMinor;
  final String label;
}

/// A recurring monthly spending limit for one category.
class Budget {
  const Budget({required this.categoryId, required this.limitMinor});

  final int categoryId;
  final int limitMinor;
}

class SavingsGoal {
  const SavingsGoal({
    required this.id,
    required this.name,
    required this.targetMinor,
    required this.savedMinor,
    required this.targetDate,
  });

  final int id;
  final String name;
  final int targetMinor;

  /// Sum of recorded contributions (cash actually set aside).
  final int savedMinor;
  final DateTime targetDate;

  bool get isReached => savedMinor >= targetMinor;
}

/// Spending for a category in a month, joined with its budget (if any).
class CategorySpend {
  const CategorySpend({
    required this.category,
    required this.spentMinor,
    this.limitMinor,
  });

  final Category category;
  final int spentMinor;
  final int? limitMinor;

  double? get usage =>
      (limitMinor == null || limitMinor == 0) ? null : spentMinor / limitMinor!;
}
