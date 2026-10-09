# Decision log

Format: context → decision → consequences / when to revisit. Newest last.

### D-001 Flutter for Android first, iOS later — 2026-10-09
Need one codebase for Android now and iOS later, strong RTL support, and a small team.
**Decision:** Flutter 3.47.5 stable (Dart 3.13.4). Chosen over the 3.47.7 published the day before
work started, to avoid a release with no field time. **Revisit:** at each stable minor.

### D-002 Local-only, no account, no backend in v1 — 2026-10-09
P0 needs no server: all calculations are local and deterministic. A backend adds cost, an attack
surface, and legal obligations (data hosting, cross-border transfer) before the product has proven demand.
**Decision:** SQLite on device; release build requests no INTERNET permission; single profile per
device. **Consequences:** no multi-device sync; no "other user's data" path exists. Reinstalling or
losing the phone loses data until export/backup ships (P1). **Revisit:** when sync (P2) is scheduled.

### D-003 State: one ChangeNotifier + InheritedNotifier, no state package — 2026-10-09
App has one data domain and roughly ten screens. Riverpod/Bloc would add dependencies and concepts
without solving a current problem.
**Decision:** `AppController` + `AppScope`. **Revisit:** when a second independent data domain
(billing, sync) arrives or the controller exceeds ~400 lines; then split per feature.

### D-004 Money as integer minor units; parse strings directly — 2026-10-09
Binary floats can't represent 0.1. OMR has **3** decimals (baisa), unlike most currencies.
**Decision:** store `int` minor units with the ISO 4217 exponent per currency; parse user input
string → int without `double`; compound maths in `double` only inside the engine, rounded once.
User input capped at 999,999,999 major units to stay exact below 2^53.

### D-005 Single currency per data set; changing currency requires reset — 2026-10-09
Re-labelling stored OMR amounts as USD would silently change their meaning (and exponent 3 → 2).
FX conversion needs rates (network, data source, licensing).
**Decision:** currency chosen at onboarding; Settings shows it read-only with an explanation.
**Revisit:** with multi-currency accounts (GCC expansion), storing currency per row.

### D-006 Calendar dates as local strings — 2026-10-09
Storing an expense day as a UTC timestamp moves it across midnight when the time zone changes
(travel within GCC is common).
**Decision:** `YYYY-MM-DD` / `YYYY-MM` text in the user's calendar; audit fields in UTC ms.

### D-007 Income is per month, with explicit "use last month's income" — 2026-10-09
"Recurring salary" models break history when salary changes. Per-month lines keep history exact.
**Decision:** income lines per month + one-tap copy from the previous month; never copied silently.

### D-008 Budgets are recurring per-category limits — 2026-10-09
Simplest model most users understand. Total budget = sum of category limits.
**Revisit:** if users ask for month-specific limits or rollover.

### D-009 Categories with history are archived, not deleted — 2026-10-09
Deleting would orphan expenses or delete history. FK is `ON DELETE RESTRICT`.

### D-010 Goals: saved = sum of contributions — 2026-10-09
Keeps an auditable history (deposits and withdrawals) to show progress over time later.
Withdrawals cannot exceed the saved total (checked inside a transaction).

### D-011 Rule-based insights, no AI in v1 — 2026-10-09
Explainable, free, offline, testable. AI is P2, optional, server-proxied (ARCHITECTURE.md).

### D-012 Return scenarios: user-entered rate, always next to 0 % — 2026-10-09
Avoid implying a promised return. Default example rate 4 % / inflation 2 % are editable placeholders
for illustration, not market forecasts. Disclaimer always visible. No product recommendations.

### D-013 Bundle IBM Plex Sans Arabic — 2026-10-09
Default Android fonts vary by OEM; Arabic numerals/typography quality matters for trust.
OFL-licensed, includes Latin. Obtained from the `@expo-google-fonts/ibm-plex-sans-arabic` npm package
(Google Fonts mirror) because github.com was not reachable from the build container. Licence:
`assets/fonts/OFL.txt`. ~700 KB added to the app.

### D-014 Western digits in both languages — 2026-10-09
Omani banking apps commonly show Western digits; mixing digit systems in tables reduces scanability.
Input accepts both. **Revisit:** after user testing (could become a setting).

### D-015 Android backup disabled — 2026-10-09
Auto-backup would upload the finance DB to the user's Google account, contradicting "data stays on
this device" in the privacy screen. **Decision:** `allowBackup=false` + data-extraction rules
excluding cloud backup and device transfer. **Consequence:** phone migration loses data until
user-initiated export (P1). **Revisit:** when export/import ships.

### D-016 Single reviewer agent instead of 20 parallel agents — 2026-10-09
The brief describes 20 roles. For a ~3k-line codebase, parallel agents editing shared files would
create conflicts and duplicated systems. **Decision:** one integrator implements the slice following
the role checklists; an independent subagent performs the QA/Security review role read-only.
Role ownership is tracked in TASKS.md for when the team grows.

### D-017 Comma handling in amount input — 2026-10-09
Review found `1,5` was read as 15. Keyboards differ: some use `,` as the decimal key; others insert
thousands separators. **Decision:** `.`/`٫` decimal; `٬` always grouping (validated); a single `,`
followed by 1–2 digits is a decimal comma; `,` followed by exactly 3 digits with no `.` (e.g.
`12,500`) is **rejected as ambiguous** (12.5 or 12,500 for OMR); other commas must form valid groups
of three. Never guess silently with money.

### D-018 Goal months = month-end deposits until target — 2026-10-09
Aligns "months left" with the engine's end-of-month deposit convention (a target on the last day of a
month includes that month's deposit). See docs/FINANCE_FORMULAS.md.
