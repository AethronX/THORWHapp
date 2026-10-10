# ثروتي — Tharwati

> **Active app: [`expo-app/`](expo-app/README.md)** (Expo / React Native, runs in Expo Go, APK via EAS Build).
> The Flutter implementation below is kept for reference — see DECISIONS D-019.

Personal finance app, Arabic-first, starting in Oman (OMR, 3 decimals) — Android and iPhone.

> Status: **release candidate 0.9.0 (Expo)** — tested on the host (`tsc`, Jest); **not yet tested on a real
> device** and not published. See [PROJECT_STATUS.md](PROJECT_STATUS.md) and [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md).

## Features (Expo app)
- Income, expenses (quick add with keypad or free text such as «قهوة 500 بيسة»), categories, budgets, search and filters
- Savings goals (pause), obligations with payoff plans, assets and net worth, savings calculator
- "Your next step": ranked guidance with its reason, one action and "not now" — incl. Ramadan/Eid season funds and "pay yourself first" on payday
- Analytics: health score, safe-to-spend per day, month-end forecast, spending calendar, recurring payments
- Wealth principles from popular money books, checked against your own numbers
- Investing: readiness, holdings by type, cost of waiting on your own assumption, learning and safety — no product advice
- Arabic RTL and English, light/dark, Arabic or Western digits, app lock, hide amounts, export JSON/CSV, delete all
- Local-only: no account, no server, no ads, no tracking

Details: [expo-app/README.md](expo-app/README.md) · decisions: [DECISIONS.md](DECISIONS.md) · formulas: [docs/ANALYTICS.md](docs/ANALYTICS.md).

---

# Legacy Flutter app (reference only — D-019)

## Develop (Flutter)
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
