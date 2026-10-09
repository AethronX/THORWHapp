import 'package:sqflite/sqflite.dart';

/// Schema versioning: bump [schemaVersion] and add a step to [_migrations]
/// for every change. Never edit an already-shipped step. See TESTING.md for
/// the migration test that replays every step from v1.
const int schemaVersion = 1;
const String databaseFileName = 'tharwati.db';

/// Built-in categories seeded on first run. `key` is localised in the UI.
/// (key, iconCode, isEssential)
const List<(String, int, bool)> defaultCategories = [
  ('housing', 0, true),
  ('food', 1, true),
  ('transport', 2, true),
  ('utilities', 3, true),
  ('telecom', 4, true),
  ('health', 5, true),
  ('education', 6, false),
  ('family', 7, false),
  ('shopping', 8, false),
  ('entertainment', 9, false),
  ('debt', 10, true),
  ('other', 11, false),
];

typedef _Migration = Future<void> Function(DatabaseExecutor db);

final Map<int, _Migration> _migrations = {1: _v1};

Future<void> _v1(DatabaseExecutor db) async {
  await db.execute('''
    CREATE TABLE settings (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    )''');
  await db.execute('''
    CREATE TABLE categories (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      key          TEXT UNIQUE,
      name         TEXT,
      icon_code    INTEGER NOT NULL DEFAULT 11,
      is_essential INTEGER NOT NULL DEFAULT 0 CHECK (is_essential IN (0, 1)),
      archived     INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
      sort_order   INTEGER NOT NULL DEFAULT 0,
      CHECK (key IS NOT NULL OR (name IS NOT NULL AND length(trim(name)) > 0))
    )''');
  await db.execute('''
    CREATE TABLE expenses (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      day          TEXT NOT NULL CHECK (length(day) = 10),
      note         TEXT NOT NULL DEFAULT '',
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    )''');
  await db.execute('CREATE INDEX idx_expenses_day ON expenses(day)');
  await db.execute(
    'CREATE INDEX idx_expenses_category ON expenses(category_id)',
  );
  await db.execute('''
    CREATE TABLE incomes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      month        TEXT NOT NULL CHECK (length(month) = 7),
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      label        TEXT NOT NULL DEFAULT '',
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    )''');
  await db.execute('CREATE INDEX idx_incomes_month ON incomes(month)');
  await db.execute('''
    CREATE TABLE budgets (
      category_id INTEGER PRIMARY KEY NOT NULL
                  REFERENCES categories(id) ON DELETE CASCADE,
      limit_minor INTEGER NOT NULL CHECK (limit_minor > 0)
    )''');
  await db.execute('''
    CREATE TABLE goals (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL CHECK (length(trim(name)) > 0),
      target_minor INTEGER NOT NULL CHECK (target_minor > 0),
      target_day   TEXT NOT NULL CHECK (length(target_day) = 10),
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    )''');
  await db.execute('''
    CREATE TABLE goal_contributions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id      INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      amount_minor INTEGER NOT NULL CHECK (amount_minor <> 0),
      day          TEXT NOT NULL CHECK (length(day) = 10),
      created_at   INTEGER NOT NULL
    )''');
  await db.execute(
    'CREATE INDEX idx_contrib_goal ON goal_contributions(goal_id)',
  );

  var order = 0;
  for (final (key, icon, essential) in defaultCategories) {
    await db.insert('categories', {
      'key': key,
      'icon_code': icon,
      'is_essential': essential ? 1 : 0,
      'sort_order': order++,
    });
  }
}

/// Applies every migration step in `(from, to]` inside the open transaction.
Future<void> runMigrations(DatabaseExecutor db, int from, int to) async {
  for (var v = from + 1; v <= to; v++) {
    final step = _migrations[v];
    if (step == null) throw StateError('Missing migration to v$v');
    await step(db);
  }
}

/// Opens (creating/migrating as needed) the app database.
///
/// [factory] and [path] are injectable so tests can run against an in-memory
/// FFI database instead of a device.
Future<Database> openAppDatabase({
  required DatabaseFactory factory,
  required String path,
}) {
  return factory.openDatabase(
    path,
    options: OpenDatabaseOptions(
      version: schemaVersion,
      onConfigure: (db) => db.execute('PRAGMA foreign_keys = ON'),
      onCreate: (db, version) => runMigrations(db, 0, version),
      onUpgrade: (db, from, to) => runMigrations(db, from, to),
      onDowngrade: (db, from, to) => throw StateError(
        'Database v$from is newer than this app (v$to). Update the app.',
      ),
    ),
  );
}
