/// Calendar-date helpers.
///
/// Storage rules (see DECISIONS.md, D-006):
/// * A user-facing calendar day (expense date, goal deadline) is stored as an
///   ISO `YYYY-MM-DD` string in the user's local calendar. It is never
///   converted through a time zone, so an expense entered on 1 March stays on
///   1 March even if the device time zone changes.
/// * Budget months are `YYYY-MM` strings.
/// * Audit timestamps (`created_at`, `updated_at`) are UTC epoch milliseconds.
library;

class YearMonth implements Comparable<YearMonth> {
  const YearMonth(this.year, this.month) : assert(month >= 1 && month <= 12);

  factory YearMonth.fromDate(DateTime d) => YearMonth(d.year, d.month);

  factory YearMonth.now() => YearMonth.fromDate(DateTime.now());

  static YearMonth parse(String s) {
    final parts = s.split('-');
    if (parts.length != 2) throw FormatException('Bad YearMonth: $s');
    return YearMonth(int.parse(parts[0]), int.parse(parts[1]));
  }

  final int year;
  final int month;

  YearMonth addMonths(int n) {
    final total = year * 12 + (month - 1) + n;
    return YearMonth(total ~/ 12, total % 12 + 1);
  }

  YearMonth get previous => addMonths(-1);
  YearMonth get next => addMonths(1);

  DateTime get firstDay => DateTime(year, month, 1);

  int get daysInMonth => DateTime(year, month + 1, 0).day;

  /// `YYYY-MM`, the storage key.
  String get key =>
      '${year.toString().padLeft(4, '0')}-${month.toString().padLeft(2, '0')}';

  /// Inclusive day-key range for SQL `BETWEEN` queries.
  String get firstDayKey => '$key-01';
  String get lastDayKey => '$key-${daysInMonth.toString().padLeft(2, '0')}';

  @override
  int compareTo(YearMonth other) =>
      (year * 12 + month).compareTo(other.year * 12 + other.month);

  bool isBefore(YearMonth other) => compareTo(other) < 0;
  bool isAfter(YearMonth other) => compareTo(other) > 0;

  @override
  bool operator ==(Object other) =>
      other is YearMonth && other.year == year && other.month == month;

  @override
  int get hashCode => Object.hash(year, month);

  @override
  String toString() => key;
}

/// Date-only value stripped of time and zone: `DateTime(y, m, d)` local.
DateTime dateOnly(DateTime d) => DateTime(d.year, d.month, d.day);

String dayKey(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}'
    '-${d.day.toString().padLeft(2, '0')}';

DateTime parseDayKey(String s) {
  final p = s.split('-');
  if (p.length != 3) throw FormatException('Bad day key: $s');
  return DateTime(int.parse(p[0]), int.parse(p[1]), int.parse(p[2]));
}

/// Number of month-end deposits that happen on or before [to], starting with
/// the end of [from]'s month. Matches the engine's end-of-month deposit rule.
///
/// From 2026-10-09: to 2027-04-01 => 6 (Oct..Mar), to 2027-04-30 => 7
/// (Apr's month end counts), to 2026-10-31 => 1, to 2026-10-20 => 0.
/// Never negative.
int monthsUntil(DateTime from, DateTime to) {
  var m = (to.year - from.year) * 12 + (to.month - from.month);
  final lastDayOfTarget = DateTime(to.year, to.month + 1, 0).day;
  if (to.day == lastDayOfTarget) m += 1;
  return m < 0 ? 0 : m;
}
