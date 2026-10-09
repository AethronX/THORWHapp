# Testing

## Run

```bash
flutter pub get
flutter analyze            # static analysis (flutter_lints)
flutter test               # all unit, repository, widget and journey tests
flutter test --coverage    # writes coverage/lcov.info
```

Host-side DB tests need a system `libsqlite3` (present on most Linux/macOS dev machines; on
Debian/Ubuntu: `apt install libsqlite3-dev`). Tests never touch real user data: every test uses a
fresh temporary database file that is deleted afterwards (`test/helpers.dart`).

## Suites

| File | Type | What it proves |
|---|---|---|
| `test/domain/finance_engine_test.dart` | unit | Every engine formula against **independently computed** references (Python `decimal`, see docs/FINANCE_FORMULAS.md); zero, negative, huge and invalid inputs; rounding rules |
| `test/domain/insights_test.dart` | unit | Coach rules: negative cash flow, no income, over/near budget, goal at risk, overdue, ordering |
| `test/core/amount_parser_test.dart` | unit | String → minor units without floats, Arabic-Indic digits, per-currency decimals, limits, round-trip; month/day arithmetic incl. leap years |
| `test/data/repository_test.dart` | integration (real SQLite) | Seeding, re-open without re-seed, refusing a newer schema without wiping, SQL constraints reject bad rows directly, CRUD, month filtering at month edges, income copy idempotency, budgets, archive-vs-delete categories, contribution bounds, cascade delete |
| `test/application/app_controller_test.dart` | integration | Atomic onboarding, month rollover on resume, no goal-at-risk for past months, delete-all recovers to a working app |
| `test/presentation/journey_test.dart` | end-to-end widget test (real UI + real SQLite file) | The MVP acceptance journey below, plus English/LTR switch |
| `test/presentation/income_categories_test.dart` | widget | Income add/validate/edit/copy/delete; category add/rename/archive |
| `test/presentation/accessibility_test.dart` | a11y | WCAG AA contrast of every token pair (light + dark); Flutter tap-target, labelled-tap-target and text-contrast guidelines on all 5 tabs; **no layout overflow at 2× text size** |

### MVP acceptance journey (`journey_test.dart`)
1. Open app → Arabic onboarding, RTL
2. Keep OMR, enter income 800 → dashboard shows 800.000 left over
3. Add expense 12.5 (food) → 787.500 left; empty form is rejected with messages
4. Set food budget 10 → over-budget insight "2.500"
5. Create goal 1200 with 200 saved → required monthly 83.334 (rounded up)
6. Scenario calculator shows results + disclaimer; invalid years hides results
7. Close app and reopen on the same DB → all data intact
8. Edit expense → delete expense
9. Delete all data → back to onboarding, nothing left
10. "Data from another user": not applicable — v1 has no accounts and a single local profile
    (see SECURITY.md). Becomes mandatory negative tests when sync/accounts are added.

## Latest verified run
2026-10-09, Flutter 3.47.5, Linux container: **97 tests, all passing**; `flutter analyze`: no issues;
`dart format` clean. Line coverage was 83 % of `lib/` (excluding generated l10n) before the last
widget/controller tests were added.

## Not yet covered (honest gaps)
- **On-device tests** (`integration_test` on an emulator/phone): not possible here (no Android SDK).
  The journey test runs the same widgets on the host, but not real Android sqflite, keyboard, or
  date picker. Run on a device before any release.
- Screen-reader walkthrough (TalkBack) — manual, needs a device.
- Golden/screenshot tests of RTL layout.
- Migration tests from v1 → v2 (there is only v1 so far; add a fixture DB per shipped version).
- Billing, network-failure and permission tests — features don't exist yet.
- Performance with large data (e.g. 10k expenses/month).
