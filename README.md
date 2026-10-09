# ثروتي — Tharwati

Personal finance and savings-habit app, Arabic-first, starting in Oman (OMR) on Android.
Know where your money goes, plan your salary, set goals with dates, and see what regular saving adds
up to — with every assumption stated.

> Status: **v0.1 development slice** — the full P0 feature set runs and is tested on the host;
> it has **not** yet been built into an APK or run on a phone. See [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Features (v0.1)
- Onboarding with currency choice (OMR default + 9 GCC/regional currencies)
- Monthly income lines, one-tap "use last month's income"
- Expenses: add / edit / delete, editable categories (custom, rename, archive)
- Monthly summary: income, expenses, left over, savings rate
- Per-category monthly budgets with labelled progress and warnings
- Savings goals with target date, deposits/withdrawals, required monthly amount
- Savings calculator: saving-only vs hypothetical return vs inflation-adjusted, with disclaimer
- Rule-based heads-up (overspending, budget limits, unrealistic or overdue goals) — no AI
- Arabic RTL and English LTR, light/dark, large-text safe
- Local-only: no account, no network, no ads, no tracking; delete-all in Settings

## Develop
Requires Flutter **3.47.x stable** (Dart 3.13). For Android builds: Android SDK + Java 17+.

```bash
flutter pub get
flutter analyze
flutter test                 # 97 tests: engine, DB, widgets, end-to-end journey, a11y
flutter run                  # on an emulator or device
flutter build appbundle      # release — configure signing first (RELEASE.md)
```

Localisation strings live in `lib/l10n/app_ar.arb` / `app_en.arb`; code is generated on build
(`flutter gen-l10n`).

## Layout
```
lib/core          currency, amount parsing, calendar dates (pure Dart)
lib/domain        finance engine, insights, models (pure Dart)
lib/data          SQLite schema/migrations, repository
lib/application   AppController (state) + AppScope
lib/presentation  theme tokens, shared widgets, screens
test/             unit, repository, widget, journey, accessibility
docs/             formulas, metrics, monetization
```

## Documentation
| File | Contents |
|---|---|
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | What actually exists and is verified, blockers |
| [ROADMAP.md](ROADMAP.md) | Phases A–D, P0/P1/P2 |
| [TASKS.md](TASKS.md) | Done / next, owners, owner actions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Layers, data model, migrations, RTL, design system |
| [DECISIONS.md](DECISIONS.md) | Decision log |
| [SECURITY.md](SECURITY.md) | Threat model, residual risks |
| [PRIVACY.md](PRIVACY.md) | Data inventory and guarantees |
| [TESTING.md](TESTING.md) | Test suites, acceptance journey, gaps |
| [RELEASE.md](RELEASE.md) | Signing, Play Console, rollout, rollback |
| [docs/FINANCE_FORMULAS.md](docs/FINANCE_FORMULAS.md) | Every formula, unit, edge case |

## Disclaimer
Tharwati is a planning tool. It does not provide investment, tax or legal advice, and any return
figures are hypothetical illustrations, not forecasts or guarantees.

Font: IBM Plex Sans Arabic, © IBM Corp., SIL Open Font License 1.1 (`assets/fonts/OFL.txt`).
