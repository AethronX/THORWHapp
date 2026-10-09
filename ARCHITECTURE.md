# Architecture — Tharwati v0.1

## Shape

Local-first Flutter app. No backend, no account, no network in release builds.
Five layers, dependencies point **downwards only**:

```
presentation/   Widgets, screens, design tokens, formatting   (Flutter)
      │ reads state / calls methods
application/    AppController (ChangeNotifier) + AppScope      (Flutter foundation)
      │ calls
domain/         finance_engine, insights, models               (pure Dart)
data/           SQLite schema + migrations, FinanceRepository  (sqflite)
core/           Currency, amount parsing, calendar dates       (pure Dart)
```

`infrastructure/` (billing, sync, AI proxy, analytics) does not exist yet on purpose; each will be
added behind an interface only when its feature is scheduled (see ROADMAP.md).

| Folder | Owns | Must not |
|---|---|---|
| `lib/core` | `Currency` (ISO exponent), `parseAmount` (string → minor units, no floats), `YearMonth`, day keys | import Flutter |
| `lib/domain` | All money maths (`finance/finance_engine.dart`), rule-based `insights.dart`, entities | import Flutter, touch I/O or the clock (time is injected) |
| `lib/data` | Schema, versioned migrations, all SQL (parameterised), integrity checks | contain business rules beyond invariants |
| `lib/application` | Screen-facing state, derived totals, orchestration, delete-all | contain formulas (delegates to domain) |
| `lib/presentation` | UI only. Formatting, localisation, validation messages | compute money (only calls engine for display values) |
| `lib/l10n` | ARB files (ar = primary, en) + generated `AppLocalizations` | — |

## State management
One `AppController` (`ChangeNotifier`) provided by an `InheritedNotifier` (`AppScope`).
Every mutation goes `screen → controller → repository → reload month → notifyListeners`.
Reloading the visible month after each write is O(rows in a month) and keeps a single source of
truth (the DB). Rationale and the trigger to revisit: DECISIONS D-003.

Errors: mutations are invoked through `runGuarded` (presentation/widgets/common.dart), which shows a
generic localised message and **does not log the error payload** (it may contain amounts).
DB open failure shows a retry screen (`LoadStatus.error`).

## Data model (schema v1, `lib/data/database.dart`)

| Table | Key columns | Notes |
|---|---|---|
| `settings` | key, value | currency, locale, theme, onboarded |
| `categories` | id, key (built-in, localised), name (custom/renamed), icon_code, is_essential, archived, sort_order | CHECK: has key or non-blank name. Used categories are **archived**, never deleted |
| `expenses` | id, amount_minor > 0, category_id → categories (RESTRICT), day `YYYY-MM-DD`, note, created_at, updated_at | index on day, category |
| `incomes` | id, month `YYYY-MM`, amount_minor > 0, label | per-month lines; "copy last month" is explicit |
| `budgets` | category_id (PK, → categories CASCADE), limit_minor > 0 | recurring monthly limit |
| `goals` | id, name (non-blank), target_minor > 0, target_day | |
| `goal_contributions` | id, goal_id → goals (CASCADE), amount_minor ≠ 0, day | saved = Σ contributions; withdrawals can't go below 0 (checked in a transaction) |

`PRAGMA foreign_keys = ON` on every connection. Invariants are enforced **both** in the repository
(friendly errors) and as SQL `CHECK`/FK constraints (defence in depth; tested by inserting bad rows
directly).

### Migrations
`schemaVersion` + an append-only map of steps `{1: _v1, 2: _v2, ...}`; `onCreate` replays all steps
from 0, `onUpgrade` replays `(from, to]`. A DB from a **newer** app version is refused (error screen),
never wiped. Test: `test/data/repository_test.dart` → "schema & migrations".

### Time
Calendar days are stored as local `YYYY-MM-DD` strings and months as `YYYY-MM` — never converted via a
time zone (D-006). Audit timestamps are UTC epoch ms. "Today" comes from an injectable clock.

## Localisation & RTL
`flutter gen-l10n` from `lib/l10n/app_{ar,en}.arb` (English is the template for tooling; Arabic is
the default UI locale). Directionality comes from the locale; layouts use `EdgeInsetsDirectional`
/ `AlignmentDirectional`. Amounts are shown with Western digits and wrapped in LRM marks in Arabic
so sign and digits do not reorder. Built-in category names are localised by `key`. Currency symbol per
locale is in `presentation/format.dart`. Input accepts Arabic-Indic digits and `٫`.

## Design system
`presentation/theme/tokens.dart` is the single source of colour, spacing, radius, type and minimum
tap size; `app_theme.dart` maps it onto Material 3 for light and dark. Shared components live in
`presentation/widgets/common.dart` (`SectionCard`, `EmptyState`, `ErrorView`, `LabeledProgress`,
`AmountField`, `TotalRow`, `MonthSwitcher`, `confirmDialog`, `runGuarded`).
Font: IBM Plex Sans Arabic (Arabic + Latin, OFL, bundled in `assets/fonts`).

## Testability seams
- `AppController(dbFactory:, dbPath:, clock:)` — tests use `sqflite_common_ffi` and a temp file.
- Engine and insights are pure functions with injected `today`.
- Widgets expose stable `Key`s for the end-to-end test.

## Future extension points (not built)
| Need | Planned seam |
|---|---|
| Paid plans | `EntitlementService` interface; Play Billing adapter; server-side purchase verification (MONETIZATION.md) |
| Sync | Repository interface + remote implementation; conflict policy per DECISIONS (to be written before sync starts) |
| Optional AI coach | Server proxy holding provider keys; app sends minimal aggregates only; feature flag |
| Analytics | Event interface with a no-op default; opt-in; no amounts or notes (docs/METRICS.md) |
